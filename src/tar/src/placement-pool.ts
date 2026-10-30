import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'
import type { TarballFormat } from '@vltpkg/types'
import { lane, trace } from '@vltpkg/output/trace'
import { __CODE_SPLIT_SCRIPT_NAME } from './placement-worker.ts'
import type {
  PlacementJob,
  PlacementReply,
} from './placement-worker.ts'
import { unpackParallel } from './unpack.ts'

/**
 * How many placement worker threads to run.
 *
 * `VLT_PLACEMENT_THREADS` overrides it: `1` (and, as a safety net,
 * anything that is not an integer `>= 1`) places inline on the main
 * thread, the behaviour from before this pool existed and a field kill
 * switch.
 *
 * The default is one worker per core, less one for the main thread,
 * capped at 8: past the inflate, placement is `write`/`mkdir` syscalls,
 * whose metadata locks stop rewarding more threads well before the core
 * count on the machines this was measured on. One core (or zero spare)
 * resolves to `1`, i.e. inline.
 */
export const placementThreads = (): number => {
  const env = process.env.VLT_PLACEMENT_THREADS
  if (env !== undefined && env !== '') {
    const n = Number(env)
    return Number.isInteger(n) && n >= 1 ? n : 1
  }
  return Math.min(Math.max(availableParallelism() - 1, 1), 8)
}

/**
 * Below this many packages an install places inline. On a small
 * machine (two cores, two threads each) three workers take 60 to 90ms
 * to boot, which a 60-package install cannot earn back: it measured
 * 16% slower with a pool than without. A 400-package install does
 * earn it back.
 */
export const DEFAULT_PLACEMENT_MIN_JOBS = 100

/**
 * How many compressed tarball bytes may sit downloaded but not yet
 * unpacked. Downloads run far ahead of the unpack workers, and without
 * a cap every tarball of a large install could be held in memory at
 * once. A download that would push past the cap waits for room; one
 * larger than the whole cap goes as soon as nothing else is held.
 */
export const DEFAULT_HELD_BYTES = 64 * 1024 * 1024

export type UnpackOptions = {
  /**
   * The buffer is exclusively ours and backed by its own `ArrayBuffer`,
   * so it can be transferred to a worker instead of copied. Never set
   * this for a buffer anything else still references (the registry
   * client's in-memory cache keeps its response bodies): a transfer
   * detaches it for every holder.
   */
  owned?: boolean
}

type Pending = {
  bytes: number
  resolve: () => void
  reject: (er: unknown) => void
  worker?: Worker
}

/**
 * A pool of worker threads that each unpack tarballs into place. See
 * `placement-worker.ts` for why, and for why store links are not here.
 *
 * Workers are started by `warm`, which reify calls as soon as it
 * knows how many packages it will place, so they boot while the first
 * packages are being fetched rather than on the critical path of the
 * first placement. A pool that was never warmed starts its workers on
 * its own once it has seen `minJobs` placements, so an install that
 * places as it resolves still gets them. Each worker reports when it is
 * ready, and jobs queue until one is. Below `minJobs` packages, `warm`
 * starts nothing and everything stays inline.
 *
 * An idle worker is `unref`d so it does not keep the process alive, and
 * `ref`d again while it holds a job, so the pool needs no explicit
 * `close` to let the process exit -- though reify calls it anyway, to
 * free the threads as soon as placement is done.
 *
 * With a size below 2 (a kill switch, one core, or no spare core) there
 * are no workers at all: placement runs inline, exactly as before.
 */
export class PlacementPool {
  #size: number
  #minJobs: number
  #heldMax: number
  #workers: Worker[] = []
  #ready = new Set<Worker>()
  #idle: Worker[] = []
  #queue: PlacementJob[] = []
  #pending = new Map<number, Pending>()
  #seq = 0
  #seen = 0
  #started = false
  #threaded = false
  #closed = false
  #booting: (() => void)[] = []
  #held = 0
  #room: (() => void)[] = []
  #busy = 0
  #queued = 0

  constructor(
    size = placementThreads(),
    minJobs = DEFAULT_PLACEMENT_MIN_JOBS,
    heldMax = DEFAULT_HELD_BYTES,
  ) {
    this.#size = size
    this.#minJobs = minJobs
    this.#heldMax = heldMax
  }

  /** True when placement runs inline, with no worker threads. */
  get inline(): boolean {
    return this.#size < 2
  }

  /** True once the workers were started and placement goes to them. */
  get threaded(): boolean {
    return this.#threaded
  }

  // Whether a placement arriving now runs on the main thread: no
  // workers at all, closed, or not (or no longer) threaded. A method,
  // not a getter, so a re-check after an await is not narrowed away.
  #inlineNow(): boolean {
    return this.inline || this.#closed || !this.#threaded
  }

  /** Number of worker threads spawned so far (for tests). */
  get workerCount(): number {
    return this.#workers.length
  }

  /** Number of workers that have booted and can take jobs (for tests). */
  get readyCount(): number {
    return this.#ready.size
  }

  /** Compressed bytes downloaded and waiting for, or in, an unpack. */
  get heldBytes(): number {
    return this.#held
  }

  /**
   * Start the workers for an install that will place `jobs` packages,
   * so they boot now rather than when the first placement arrives.
   * Starts nothing, leaving placement inline, when the pool is inline
   * or closed, when it was already warmed, or when `jobs` is below the
   * minimum. Resolves once every worker it started is ready or gone; it
   * never rejects, so a caller may fire and forget it.
   */
  async warm(jobs: number): Promise<void> {
    if (
      this.inline ||
      this.#closed ||
      this.#threaded ||
      jobs < this.#minJobs
    ) {
      return
    }
    this.#threaded = true
    this.#started = true
    while (this.#workers.length < this.#size) this.#spawn()
    await new Promise<void>(resolve => {
      this.#booting.push(resolve)
      this.#checkBooted()
    })
  }

  // A pool nobody warmed starts itself once enough placements have
  // come through to pay for the boot. The placements before that ran
  // inline; the ones from here on queue for the workers. Workers that
  // were started once and all died are not started again: the pool
  // stays inline, as it would after a `warm`.
  #maybeAutoWarm(): void {
    if (this.#started || this.#closed || this.inline) return
    if (++this.#seen < this.#minJobs) return
    void this.warm(this.#seen)
  }

  // Every live worker is ready, or none is left: settle any warm() that
  // is waiting on the boot.
  #checkBooted(): void {
    if (this.#ready.size < this.#workers.length) return
    const waiters = this.#booting
    this.#booting = []
    for (const resolve of waiters) resolve()
  }

  /**
   * Unpack `tarData` into `target`: on a worker once the pool is
   * threaded, inline otherwise (inflating on libuv's threadpool and
   * writing on the main thread, as before this pool existed). Resolves
   * when the files are in place.
   *
   * The bytes are handed to the worker by transfer when `owned`, else
   * copied first, since a transfer detaches the buffer for everyone
   * holding it. Either way the caller must not use `tarData` after.
   */
  async unpack(
    tarData: Buffer,
    target: string,
    format?: TarballFormat,
    { owned = false }: UnpackOptions = {},
  ): Promise<void> {
    this.#maybeAutoWarm()
    if (this.#inlineNow())
      return unpackParallel(tarData, target, format)
    const bytes = tarData.byteLength
    await this.#reserve(bytes)
    // the pool may have closed, or lost its last worker, while this
    // waited for room: it is inline now, so place inline
    if (this.#inlineNow()) {
      this.#release(bytes)
      return unpackParallel(tarData, target, format)
    }
    // a buffer that fills its own ArrayBuffer and is ours alone can be
    // transferred; anything else (a slice of a pooled slab, a body the
    // registry client still caches) is copied into one that can
    const ab = tarData.buffer
    let buffer: ArrayBuffer
    const byteOffset = 0
    if (
      owned &&
      ab instanceof ArrayBuffer &&
      tarData.byteOffset === 0 &&
      bytes === ab.byteLength
    ) {
      buffer = ab
    } else {
      const copy = new Uint8Array(bytes)
      copy.set(tarData)
      buffer = copy.buffer
    }
    const id = this.#seq++
    await this.#submit(
      {
        kind: 'unpack',
        id,
        buffer,
        byteOffset,
        byteLength: bytes,
        target,
        format,
      },
      bytes,
    )
  }

  // Wait until `bytes` more may be held. Nothing waits while nothing is
  // held, so one oversized tarball never deadlocks.
  async #reserve(bytes: number): Promise<void> {
    while (this.#held > 0 && this.#held + bytes > this.#heldMax) {
      await new Promise<void>(resolve => this.#room.push(resolve))
    }
    this.#held += bytes
  }

  #release(bytes: number): void {
    this.#held -= bytes
    // wake everyone; each re-checks and queues again if there is still
    // no room, which keeps the order of arrival
    const waiters = this.#room
    this.#room = []
    for (const resolve of waiters) resolve()
  }

  // Queue the job, or hand it to a free worker. A ready worker is free:
  // use it. Otherwise queue; a worker takes the next queued job as it
  // finishes, or as it finishes booting. Placing inline while the
  // workers boot was measured and rejected: on a machine with few cores
  // the main thread's placement contends with the boots, and the install
  // comes out slower than either.
  #submit(job: PlacementJob, bytes: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#pending.set(job.id, { bytes, resolve, reject })
      const worker = this.#idle.pop()
      if (worker) this.#assign(worker, job)
      else {
        this.#queue.push(job)
        this.#queued++
        this.#trace()
      }
    })
  }

  #trace(): void {
    lane('unpack', this.#busy, this.#queued)
  }

  #spawn(): void {
    trace('pool:spawn', { workers: this.#workers.length + 1 })
    const worker = new Worker(__CODE_SPLIT_SCRIPT_NAME)
    worker.on('message', (reply: PlacementReply) =>
      this.#onMessage(worker, reply),
    )
    // a worker can die two ways: 'error' for an uncaught exception, and
    // 'exit' for anything else (a process.exit, an OOM kill). Both are
    // terminal and both reach #onLost, which ignores the second.
    worker.on('error', (er: Error) => this.#onLost(worker, er))
    worker.on('exit', () =>
      this.#onLost(worker, new Error('placement worker exited')),
    )
    // A worker starts ref'd: jobs queue while it boots, and with nothing
    // else keeping the event loop alive (no reporter timer, as with
    // --view=silent) an unref'd boot would let the process exit with the
    // install still awaiting them. It unrefs itself once it is ready and
    // idle (see #park), so an idle pool never keeps the process alive.
    this.#workers.push(worker)
  }

  #assign(worker: Worker, job: PlacementJob): void {
    // a job is only ever assigned while its pending entry is live
    const pending = this.#pending.get(job.id)
    /* c8 ignore next */
    if (pending) pending.worker = worker
    this.#busy++
    this.#trace()
    // keep the process alive while this worker has a job in flight
    worker.ref()
    // the tarball bytes are transferred, not copied
    worker.postMessage(job, [job.buffer])
  }

  // Hand the worker the next queued job, or park it idle.
  #park(worker: Worker): void {
    const next = this.#queue.shift()
    if (next) {
      this.#queued--
      this.#assign(worker, next)
    } else {
      worker.unref()
      this.#idle.push(worker)
    }
  }

  #settle(id: number, pending: Pending): void {
    // a queued job was never busy; an assigned one was
    if (pending.worker) {
      this.#busy--
      this.#trace()
    }
    this.#release(pending.bytes)
    this.#pending.delete(id)
  }

  #onMessage(worker: Worker, reply: PlacementReply): void {
    if ('ready' in reply) {
      // the worker has booted: it can take queued work, and warm() may
      // now have everything it was waiting for
      this.#ready.add(worker)
      trace('pool:ready', { ready: this.#ready.size })
      this.#park(worker)
      this.#checkBooted()
      return
    }
    const pending = this.#pending.get(reply.id)
    /* c8 ignore next - a reply always matches a live pending entry */
    if (pending) this.#settle(reply.id, pending)
    // give the worker its next job before settling, so throughput does
    // not wait on the caller's continuation
    this.#park(worker)
    /* c8 ignore next */
    if (!pending) return
    if ('result' in reply) pending.resolve()
    else {
      const er: NodeJS.ErrnoException = new Error(reply.error)
      er.stack = reply.stack ?? er.stack
      if (reply.code !== undefined) er.code = reply.code
      pending.reject(er)
    }
  }

  // A worker died outright, not a job that threw (that comes back as a
  // reply). Drop it, reject the one job it was running, and keep the
  // queue moving so no placement promise is left hanging. 'error' and
  // 'exit' both land here, so the first call drops the worker and the
  // second returns.
  #onLost(worker: Worker, er: Error): void {
    if (!this.#workers.includes(worker)) return
    this.#workers = this.#workers.filter(w => w !== worker)
    this.#idle = this.#idle.filter(w => w !== worker)
    this.#ready.delete(worker)
    for (const [id, pending] of this.#pending) {
      if (pending.worker === worker) {
        this.#settle(id, pending)
        pending.reject(er)
      }
    }
    // a worker lost during boot may be the one warm() was waiting on
    this.#checkBooted()
    // A surviving worker drains the queue as it finishes or boots (see
    // #park), and a worker is only idle when the queue is empty, so
    // queued jobs are never stranded while any worker remains -- and
    // nothing is spawned here, where a failed `new Worker` would escape
    // this event handler. With no workers left nothing will ever run
    // the queue, so reject it rather than let those promises hang, and
    // place inline from here on rather than queue for workers that will
    // never come.
    if (this.#workers.length) return
    this.#threaded = false
    this.#rejectQueued(er)
  }

  #rejectQueued(er: Error): void {
    const queued = this.#queue
    this.#queue = []
    for (const job of queued) {
      this.#queued--
      const pending = this.#pending.get(job.id)
      /* c8 ignore next */
      if (pending) {
        this.#settle(job.id, pending)
        pending.reject(er)
      }
    }
  }

  /**
   * Terminate every worker. Safe to call more than once. Any placement
   * still assigned or queued is rejected rather than left hanging, since
   * terminating a worker stops it before it can reply, and a `warm()`
   * still waiting on the boot is released.
   */
  async close(): Promise<void> {
    this.#closed = true
    this.#threaded = false
    const workers = this.#workers
    this.#workers = []
    this.#idle = []
    this.#ready.clear()
    const er = new Error('placement pool closed')
    this.#rejectQueued(er)
    for (const [id, pending] of this.#pending) {
      this.#settle(id, pending)
      pending.reject(er)
    }
    this.#checkBooted()
    await Promise.all(workers.map(w => w.terminate()))
  }
}
