import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'
import type { Spec } from '@vltpkg/spec'
import type { Manifest, NormalizedManifest } from '@vltpkg/types'
import { lane, trace } from '@vltpkg/output/trace'
import { __CODE_SPLIT_SCRIPT_NAME } from './manifest-worker.ts'
import type {
  ManifestJob,
  ManifestReply,
  ManifestWorkerData,
} from './manifest-worker.ts'

/**
 * How many manifest worker threads to run.
 *
 * `VLT_MANIFEST_THREADS` overrides it: `0` resolves every manifest on the
 * main thread, the behaviour from before this pool existed and a field
 * kill switch. The default is three, or one per core less the main
 * thread's when there are fewer: a packument parse is one core's work,
 * and three threads kept the main thread fed on the machines this was
 * measured on. A machine with no spare core gets none.
 */
export const manifestThreads = (): number => {
  const env = process.env.VLT_MANIFEST_THREADS
  if (env !== undefined && env !== '') {
    const n = Number(env)
    return Number.isInteger(n) && n >= 0 ? n : 0
  }
  return Math.min(3, Math.max(availableParallelism() - 1, 0))
}

/** The code of the error a lookup gets when its worker is gone. */
export const EWORKERLOST = 'EWORKERLOST'

export type ManifestAnswer = {
  manifest: Manifest | NormalizedManifest
  /** the manifest came from a vlt packument */
  vlt: boolean
}

type Pending = {
  slot: number
  resolve: (answer: ManifestAnswer) => void
  reject: (er: unknown) => void
}

type Slot = {
  worker?: Worker
  ready: boolean
  /** its worker died: nothing routes here any more */
  dead: boolean
  queue: ManifestJob[]
  busy: number
}

// FNV-1a over the package name: every spec of one name goes to the same
// worker, whose client fetches and keeps the packument once
const hashName = (name: string, mod: number): number => {
  let h = 0x811c9dc5
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h % mod
}

/**
 * A pool of worker threads that each resolve manifests with their own
 * `PackageInfoClient`. See `manifest-worker.ts` for why.
 *
 * Workers are spawned on demand, each the first time a name routes to
 * it, and report when they have booted; jobs queue until then. A spec
 * is routed to a worker by the hash of its name, so a packument is
 * fetched and parsed once however many specs name it. An idle worker is
 * `unref`d so it does not keep the process alive, and `ref`d again
 * while it holds a job.
 *
 * A worker that dies rejects the jobs it held and the ones queued for
 * it with {@link EWORKERLOST}, and takes no more; once every worker is
 * gone the pool reports itself disabled. The client answers those on
 * its own thread, so a worker failure costs a lookup, never an install.
 */
export class ManifestPool {
  readonly #data: ManifestWorkerData
  readonly #slots: Slot[]
  readonly #pending = new Map<number, Pending>()
  #seq = 0
  #alive: number
  #closed = false

  constructor(
    options: ManifestWorkerData['options'],
    size = manifestThreads(),
  ) {
    this.#data = { options }
    this.#slots = Array.from({ length: size }, () => ({
      ready: false,
      dead: false,
      queue: [],
      busy: 0,
    }))
    this.#alive = size
  }

  /** True while lookups can go to a worker. */
  get enabled(): boolean {
    return this.#alive > 0 && !this.#closed
  }

  /** Number of worker threads spawned so far (for tests). */
  get workerCount(): number {
    return this.#slots.filter(s => s.worker).length
  }

  /** Number of workers that have booted and can take jobs (for tests). */
  get readyCount(): number {
    return this.#slots.filter(s => s.ready).length
  }

  /**
   * Resolve `spec` on its worker. Rejects with the worker's error, or
   * with an {@link EWORKERLOST} error when the worker is gone or the
   * pool is closed; the client then asks on its own thread.
   */
  manifest(
    spec: Spec,
    options: { from?: string; backgroundRevalidate?: boolean } = {},
  ): Promise<ManifestAnswer> {
    return new Promise<ManifestAnswer>((resolve, reject) => {
      if (!this.enabled) return reject(lost('manifest pool closed'))
      const slotIndex = hashName(spec.final.name, this.#slots.length)
      const slot = this.#slots[slotIndex]
      /* c8 ignore next - the hash is always in range */
      if (!slot) return reject(lost('no worker slot'))
      if (slot.dead) return reject(lost('manifest worker gone'))
      if (!slot.worker) this.#spawn(slotIndex, slot)
      const id = this.#seq++
      this.#pending.set(id, { slot: slotIndex, resolve, reject })
      const job: ManifestJob = {
        id,
        spec: String(spec),
        from: options.from,
        backgroundRevalidate: options.backgroundRevalidate,
      }
      if (slot.ready) this.#assign(slot, job)
      else slot.queue.push(job)
      this.#trace(slot)
    })
  }

  // only ever for a slot without a worker, while the pool is enabled; a
  // slot whose worker died is never asked again (see #onLost)
  #spawn(index: number, slot: Slot): void {
    trace('manifest-pool:spawn', { slot: index })
    const worker = new Worker(__CODE_SPLIT_SCRIPT_NAME, {
      workerData: this.#data,
      // a worker's client never starts a pool of its own
      env: { ...process.env, VLT_MANIFEST_THREADS: '0' },
    })
    slot.worker = worker
    worker.on('message', (reply: ManifestReply) =>
      this.#onMessage(index, slot, reply),
    )
    // a worker can die two ways: 'error' for an uncaught exception, and
    // 'exit' for anything else (a process.exit, an OOM kill). Both are
    // terminal and both reach #onLost, which ignores the second.
    worker.on('error', (er: Error) => this.#onLost(index, slot, er))
    worker.on('exit', () =>
      this.#onLost(index, slot, new Error('manifest worker exited')),
    )
    // a worker starts ref'd: jobs queue while it boots, and nothing else
    // may be keeping the event loop alive. it unrefs itself once ready
    // and idle (see #park)
  }

  #assign(slot: Slot, job: ManifestJob): void {
    slot.busy++
    // keep the process alive while this worker has a job in flight
    slot.worker?.ref()
    slot.worker?.postMessage(job)
  }

  #park(slot: Slot): void {
    if (!slot.busy) slot.worker?.unref()
  }

  #trace(slot: Slot): void {
    lane('manifest-workers', slot.busy, slot.queue.length)
  }

  #onMessage(index: number, slot: Slot, reply: ManifestReply): void {
    if ('ready' in reply) {
      slot.ready = true
      trace('manifest-pool:ready', { slot: index })
      const queued = slot.queue
      slot.queue = []
      for (const job of queued) this.#assign(slot, job)
      this.#park(slot)
      this.#trace(slot)
      return
    }
    const pending = this.#pending.get(reply.id)
    this.#pending.delete(reply.id)
    slot.busy--
    this.#park(slot)
    this.#trace(slot)
    /* c8 ignore next - a reply always matches a live pending entry */
    if (!pending) return
    if ('manifest' in reply) {
      pending.resolve({ manifest: reply.manifest, vlt: reply.vlt })
    } else {
      const er: NodeJS.ErrnoException = new Error(reply.error)
      if (reply.code !== undefined) er.code = reply.code
      pending.reject(er)
    }
  }

  // A worker died outright, not a job that threw (that comes back as a
  // reply). Drop it and reject everything it held or had queued, so no
  // lookup is left hanging; the client answers those itself. 'error' and
  // 'exit' both land here, so the first call drops the worker and the
  // second returns.
  #onLost(index: number, slot: Slot, er: Error): void {
    if (!slot.worker) return
    slot.worker = undefined
    slot.ready = false
    slot.dead = true
    slot.busy = 0
    this.#alive--
    trace('manifest-pool:lost', { slot: index, error: er.message })
    const failed = lost(er.message)
    const queued = slot.queue
    slot.queue = []
    for (const [id, pending] of this.#pending) {
      if (pending.slot === index) {
        this.#pending.delete(id)
        pending.reject(failed)
      }
    }
    // queued jobs had pending entries too, rejected above
    void queued
    this.#trace(slot)
  }

  /**
   * Terminate every worker. Safe to call more than once. Any lookup
   * still in flight or queued is rejected with {@link EWORKERLOST}
   * rather than left hanging, since a terminated worker never replies.
   */
  async close(): Promise<void> {
    this.#closed = true
    const workers: Worker[] = []
    for (const slot of this.#slots) {
      if (slot.worker) workers.push(slot.worker)
      slot.worker = undefined
      slot.ready = false
      slot.queue = []
      slot.busy = 0
    }
    const er = lost('manifest pool closed')
    for (const [id, pending] of this.#pending) {
      this.#pending.delete(id)
      pending.reject(er)
    }
    await Promise.all(workers.map(w => w.terminate()))
  }
}

const lost = (message: string): NodeJS.ErrnoException => {
  const er: NodeJS.ErrnoException = new Error(message)
  er.code = EWORKERLOST
  return er
}
