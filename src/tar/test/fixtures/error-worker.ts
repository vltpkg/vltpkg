import { parentPort } from 'node:worker_threads'
import type { LinkJob } from '../../src/link-worker.ts'

// A stand-in link worker that always replies with an error, so the
// pool's error handling can be tested without an unreproducible crash
// in the real worker. A storeEntry of 'bare' replies with neither a
// stack nor a code, to cover the pool rebuilding a plain error.
const port = parentPort
if (port) {
  port.on('message', (job: LinkJob) =>
    port.postMessage(
      job.storeEntry === 'bare' ?
        { id: job.id, error: 'bare' }
      : {
          id: job.id,
          error: 'boom',
          stack: 'boom stack',
          code: 'EBOOM',
        },
    ),
  )
}
