import { availableParallelism } from 'node:os'
import { Worker } from 'node:worker_threads'
import { linkFromStore } from './link-tree.ts'
import type {
  LinkFromStoreOptions,
  StoreLinkResult,
} from './link-tree.ts'
import { __CODE_SPLIT_SCRIPT_NAME } from './link-worker.ts'
import type { LinkJob, LinkReply } from './link-worker.ts'

/**
 * How many link worker threads to run.
 *
 * `VLT_LINK_THREADS` overrides it: `1` (and, as a safety net, anything
 * that is not an integer `>= 1`) places inline on the main thread, the
 * behaviour from before this pool existed and a field kill switch.
 *
 * The default is one worker per core, less one for the main thread,
 * capped at 8: placement is `link`/`mkdir` syscalls, whose metadata
 * locks stop rewarding more threads well before the core count on the
 * machines this was measured on. One core (or zero spare) resolves to
 * `1`, i.e. inline.
 */
export const linkThreads = (): number => {
  const env = process.env.VLT_LINK_THREADS
  if (env !== undefined && env !== '') {
    const n = Number(env)
    return Number.isInteger(n) && n >= 1 ? n : 1
  }
  return Math.min(Math.max(availableParallelism() - 1, 1), 8)
}

type Pending = {
  resolve: (result: StoreLinkResult) => void
  reject: (er: unknown) => void
  worker?: Worker
}

/**
 * A pool of worker threads that each run the store placement, so a
 * reify places many packages at once instead of one at a time on the
 * main thread. See `link-worker.ts` for why.
 *
 * Workers are spawned on demand, up to {@link linkThreads}: a tiny
 * install that links a handful of packages never starts more than it
 * uses. An idle worker is `unref`d so it does not keep the process
 * alive, and `ref`d again while it holds a job, so the pool needs no
 * explicit `close` to let the process exit -- though reify calls it
 * anyway, to free the threads as soon as placement is done.
 *
 * With a size below 2 (a kill switch, one core, or no spare core) there
 * are no workers at all: placement runs inline, exactly as before.
 */
export class LinkPool {
  #size: number
  #workers: Worker[] = []
  #idle: Worker[] = []
  #queue: LinkJob[] = []
  #pending = new Map<number, Pending>()
  #seq = 0
  #closed = false

  constructor(size = linkThreads()) {
    this.#size = size
  }

  /** True when placement runs inline, with no worker threads. */
  get inline(): boolean {
    return this.#size < 2
  }

  /** Number of worker threads spawned so far (for tests). */
  get workerCount(): number {
    return this.#workers.length
  }

  /**
   * Place a store entry at `target`, on a worker when the pool is
   * threaded, inline otherwise (and once `close` has run). The returned
   * promise settles exactly as {@link linkFromStore} would: the result,
   * or the error it threw.
   */
  async linkFromStore(
    storeEntry: string,
    target: string,
    opts?: LinkFromStoreOptions,
  ): Promise<StoreLinkResult> {
    if (this.inline || this.#closed) {
      return linkFromStore(storeEntry, target, opts)
    }
    return new Promise<StoreLinkResult>((resolve, reject) => {
      const id = this.#seq++
      this.#pending.set(id, { resolve, reject })
      this.#dispatch({ id, storeEntry, target, opts })
    })
  }

  #dispatch(job: LinkJob): void {
    const worker = this.#idle.pop() ?? this.#spawn()
    if (worker) this.#assign(worker, job)
    else this.#queue.push(job)
  }

  #spawn(): Worker | undefined {
    if (this.#workers.length >= this.#size) return undefined
    const worker = new Worker(__CODE_SPLIT_SCRIPT_NAME)
    worker.on('message', (reply: LinkReply) =>
      this.#onReply(worker, reply),
    )
    worker.on('error', (er: Error) => this.#onError(worker, er))
    worker.unref()
    this.#workers.push(worker)
    return worker
  }

  #assign(worker: Worker, job: LinkJob): void {
    // a job is only ever assigned while its pending entry is live
    const pending = this.#pending.get(job.id)
    /* c8 ignore next */
    if (pending) pending.worker = worker
    // keep the process alive while this worker has a job in flight
    worker.ref()
    worker.postMessage(job)
  }

  #onReply(worker: Worker, reply: LinkReply): void {
    const pending = this.#pending.get(reply.id)
    this.#pending.delete(reply.id)
    // hand the worker the next queued job, or park it, before settling,
    // so throughput does not wait on the caller's continuation
    const next = this.#queue.shift()
    if (next) this.#assign(worker, next)
    else {
      worker.unref()
      this.#idle.push(worker)
    }
    /* c8 ignore next - a reply always matches a live pending entry */
    if (!pending) return
    if ('result' in reply) pending.resolve(reply.result)
    else {
      const er: NodeJS.ErrnoException = new Error(reply.error)
      er.stack = reply.stack ?? er.stack
      if (reply.code !== undefined) er.code = reply.code
      pending.reject(er)
    }
  }

  // A worker thread died outright (not a job that threw, which comes
  // back as a reply): fail its in-flight job and drop it. Each worker
  // holds at most one job at a time.
  /* c8 ignore start - a hard worker crash is not reproducible in tests */
  #onError(worker: Worker, er: Error): void {
    this.#workers = this.#workers.filter(w => w !== worker)
    this.#idle = this.#idle.filter(w => w !== worker)
    for (const [id, pending] of this.#pending) {
      if (pending.worker === worker) {
        this.#pending.delete(id)
        pending.reject(er)
      }
    }
  }
  /* c8 ignore stop */

  /** Terminate every worker. Safe to call more than once. */
  async close(): Promise<void> {
    this.#closed = true
    const workers = this.#workers
    this.#workers = []
    this.#idle = []
    await Promise.all(workers.map(w => w.terminate()))
  }
}
