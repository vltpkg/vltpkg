import { isMainThread, parentPort } from 'node:worker_threads'
import type { TarballFormat } from '@vltpkg/types'
import { unpackSync } from './unpack.ts'

/**
 * Unpacking a tarball is synchronous work the main thread cannot
 * afford: inflating it, parsing it and writing its files. While the
 * main thread does that, no registry response is read, no manifest is
 * parsed and no node is placed in the graph. A `PlacementPool` runs
 * this script as a worker thread so several packages are unpacked at
 * once, across cores, and the main thread stays free to keep the
 * network busy.
 *
 * Hardlinking a global store entry stays on the main thread: it is a
 * fraction of a millisecond per package, and on a two-core machine the
 * boot of the workers and the round trips never paid for themselves
 * (measured: +48% on the placement phase of a warm install).
 *
 * The build emits it as its own bundled file: the exported
 * {@link __CODE_SPLIT_SCRIPT_NAME} is the path to spawn (the source
 * `.ts` in dev and test, the built `.js` in the bundle), and
 * {@link handleJob} is the per-message handler, exported so it can be
 * tested without a live worker.
 */
export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

/**
 * Unpack a tarball into `target`. The bytes arrive as an `ArrayBuffer`
 * transferred from the main thread, so no copy crosses the boundary.
 */
export type UnpackJob = {
  kind: 'unpack'
  id: number
  buffer: ArrayBuffer
  byteOffset: number
  byteLength: number
  target: string
  format?: TarballFormat
}

export type PlacementJob = UnpackJob

/**
 * A worker's reply for job `id`: `true` once unpacked, or the message,
 * stack and errno code of the error thrown, which the pool rebuilds
 * into an Error so a worker failure looks like the inline call failing.
 */
export type PlacementReply =
  | { id: number; result: true }
  | { id: number; error: string; stack?: string; code?: string }
  /** posted once, when the worker has booted and can take jobs */
  | { ready: true }

/** A port that takes a {@link PlacementReply}; the real one is `parentPort`. */
export type ReplyPort = {
  postMessage: (reply: PlacementReply) => void
}

/** Run one job and post the result (or its error) back. */
export const handleJob = (
  port: ReplyPort,
  job: PlacementJob,
): void => {
  try {
    unpackSync(
      Buffer.from(job.buffer, job.byteOffset, job.byteLength),
      job.target,
      job.format,
    )
    port.postMessage({ id: job.id, result: true })
  } catch (er) {
    // a non-Error can be thrown, so narrow before reading its fields
    const e: NodeJS.ErrnoException | undefined =
      er instanceof Error ? er : undefined
    port.postMessage({
      id: job.id,
      error: e?.message ?? String(er),
      stack: e?.stack,
      code: e?.code,
    })
  }
}

// Runs only when spawned as a worker thread; on the main thread this
// module is imported just for the exports above.
/* c8 ignore start - covered by spawning a real worker in the tests */
if (!isMainThread && parentPort) {
  const port = parentPort
  port.on('message', (job: PlacementJob) => handleJob(port, job))
  // tell the pool this worker can take jobs; until then they queue
  port.postMessage({ ready: true })
}
/* c8 ignore stop */
