import { isMainThread, parentPort } from 'node:worker_threads'
import { linkFromStore } from './link-tree.ts'
import type {
  LinkFromStoreOptions,
  StoreLinkResult,
} from './link-tree.ts'

/**
 * The placement loop in {@link linkFromStore} is one `link` (or, on a
 * downgrade, read+write) syscall per file. On Linux there is no
 * single-syscall way to clone a whole package the way `clonefile(2)`
 * does on macOS, so a large install spends most of its placement time
 * crossing into the kernel file by file, serialized on the main thread.
 *
 * A `LinkPool` runs this script as a worker thread so several
 * packages are placed at once, across cores. The build emits it as its
 * own bundled file: the exported {@link __CODE_SPLIT_SCRIPT_NAME} is
 * the path to spawn (the source `.ts` in dev and test, the built `.js`
 * in the bundle), and {@link handleJob} is the per-message handler,
 * exported so it can be tested without a live worker.
 */
export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

/** A placement request posted to a link worker. */
export type LinkJob = {
  id: number
  storeEntry: string
  target: string
  opts?: LinkFromStoreOptions
}

/**
 * A worker's reply for job `id`: the {@link StoreLinkResult}, or the
 * message, stack and errno code of the error {@link linkFromStore}
 * threw, which the pool rebuilds into an Error so a worker failure
 * looks like the inline call failing.
 */
export type LinkReply =
  | { id: number; result: StoreLinkResult }
  | { id: number; error: string; stack?: string; code?: string }

/** A port that takes a {@link LinkReply}; the real one is `parentPort`. */
export type ReplyPort = { postMessage: (reply: LinkReply) => void }

/** Place one package and post the result (or its error) back. */
export const handleJob = (port: ReplyPort, job: LinkJob): void => {
  try {
    const result = linkFromStore(job.storeEntry, job.target, job.opts)
    port.postMessage({ id: job.id, result })
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
// module is imported just for the two exports above.
/* c8 ignore start - covered by spawning a real worker in the tests */
if (!isMainThread && parentPort) {
  const port = parentPort
  port.on('message', (job: LinkJob) => handleJob(port, job))
}
/* c8 ignore stop */
