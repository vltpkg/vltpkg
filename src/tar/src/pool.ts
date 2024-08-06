import { error } from '@vltpkg/error-cause'
import os from 'os'
import { Worker } from 'worker_threads'
import { UnpackRequest } from './unpack-request.js'

const workerScript = new URL('./worker.js', import.meta.url)

export type ResponseOK = { id: number; ok: true }
export const isResponseOK = (o: any): o is ResponseOK =>
  !!o &&
  typeof o === 'object' &&
  typeof o.id === 'number' &&
  o.ok === true

export type ResponseError = { id: number; error: string }
export const isResponseError = (o: any): o is ResponseError =>
  !!o &&
  typeof o === 'object' &&
  typeof o.id === 'number' &&
  typeof o.error === 'string' &&
  o.ok !== true

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
  jobs: number = Math.max(os.availableParallelism(), 2) - 1
  /**
   * Set of currently active worker threads
   */
  workers: Set<Worker> = new Set()
  /**
   * Queue of requests awaiting an available worker
   */
  queue: UnpackRequest[] = []
  /**
   * Requests that have been assigned to a worker, but have not yet
   * been confirmed completed.
   */
  pending: Map<number, UnpackRequest> = new Map()

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
      ur.reject(
        error(m.error || 'failed without error message', {
          found: m,
        }),
      )
    }
    /* c8 ignore stop */
    const next = this.queue.shift()
    if (!next) {
      this.workers.delete(w)
      w.terminate()
    } else this.#request(w, next)
  }

  // send a request to a worker
  #request(w: Worker, req: UnpackRequest) {
    const { tarData: raw, target, id } = req
    const tarData =
      (
        raw.byteOffset === 0 &&
        raw.byteLength === raw.buffer.byteLength
      ) ?
        raw.buffer
      : raw.buffer.slice(
          raw.byteOffset,
          raw.byteOffset + raw.byteLength,
        )

    w.postMessage(
      {
        tarData,
        target,
        id,
      },
      [tarData],
    )
  }

  // create a new worker
  async #createWorker(req: UnpackRequest) {
    const w = new Worker(workerScript)
    this.workers.add(w)
    w.addListener('message', (m: any) => this.#onMessage(w, m))
    this.#request(w, req)
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
