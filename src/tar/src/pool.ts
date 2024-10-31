import { error, type ErrorCauseObject } from '@vltpkg/error-cause'
import os from 'os'
import { UnpackRequest } from './unpack-request.js'
import {
  isResponseOK,
  type ResponseError,
  type ResponseOK,
  Worker,
} from './worker.js'

export * from './worker.js'

/**
 * Automatically expanding/contracting set of workers to maximize parallelism
 * of unpack operations up to 1 less than the number of CPUs (or 1).
 *
 * `pool.unpack(tarData, target)` will perform the unpack operation
 * synchronously, in one of these workers, and returns a promise when the
 * worker has confirmed completion of the task.
 */
export class Pool {
  /**
   * Number of workers to emplly. Defaults to 1 less than the number of
   * CPUs, or 1.
   */
  /* c8 ignore next */
  jobs: number = 8 * (Math.max(os.availableParallelism(), 2) - 1)
  /**
   * Set of currently active worker threads
   */
  workers = new Set<Worker>()
  /**
   * Queue of requests awaiting an available worker
   */
  queue: UnpackRequest[] = []
  /**
   * Requests that have been assigned to a worker, but have not yet
   * been confirmed completed.
   */
  pending = new Map<number, UnpackRequest>()

  // handle a message from the worker
  #onMessage(w: Worker, m: ResponseError | ResponseOK) {
    const { id } = m
    // a request has been met or failed, report and either
    // pick up the next item in the queue, or terminate worker
    const ur = this.pending.get(id)
    /* c8 ignore next */
    if (!ur) return
    if (isResponseOK(m)) {
      ur.resolve()
      /* c8 ignore start - nearly impossible in normal circumstances */
    } else {
      const er =
        m.error instanceof Error ? m.error.message : String(m.error)
      const cause: ErrorCauseObject = { found: m }
      if (m.error instanceof Error) cause.cause = m.error
      ur.reject(error(er || 'failed without error message', cause))
    }
    /* c8 ignore stop */
    const next = this.queue.shift()
    if (!next) {
      this.workers.delete(w)
    } else {
      void w.process(next)
    }
  }

  // create a new worker
  #createWorker(req: UnpackRequest) {
    const w: Worker = new Worker((m: ResponseError | ResponseOK) =>
      this.#onMessage(w, m),
    )
    this.workers.add(w)
    void w.process(req)
  }

  /**
   * Provide the tardata to be unpacked, and the location where it's to be
   * placed. Will create a new worker up to the `jobs` value, and then start
   * pushing in the queue for workers to pick up as they become available.
   *
   * Returned promise resolves when the provided tarball has been extracted.
   */
  async unpack(tarData: Buffer, target: string) {
    const ur = new UnpackRequest(tarData, target)
    this.pending.set(ur.id, ur)
    if (this.workers.size < this.jobs) {
      this.#createWorker(ur)
    } else {
      this.queue.push(ur)
    }
    return ur.promise
  }
}
