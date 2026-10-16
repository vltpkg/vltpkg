import { parentPort } from 'node:worker_threads'
import type { LinkJob } from '../../src/link-worker.ts'

// A stand-in link worker used to drive the pool's reply and failure
// handling without depending on a real crash. The job's storeEntry
// selects the behaviour:
//   'boom'  -> reply with an error carrying a stack and errno code
//   'bare'  -> reply with an error that has neither
//   'hang'  -> never reply, so the job stays in flight until close()
//   'crash' -> throw, which the worker reports as an 'error' event
//   'exit'  -> exit the thread, which arrives as an 'exit' event
const port = parentPort
if (port) {
  port.on('message', (job: LinkJob) => {
    switch (job.storeEntry) {
      case 'hang':
        return
      case 'crash':
        throw new Error('worker boom')
      case 'exit':
        return process.exit(1)
      case 'bare':
        return port.postMessage({ id: job.id, error: 'bare' })
      default:
        return port.postMessage({
          id: job.id,
          error: 'boom',
          stack: 'boom stack',
          code: 'EBOOM',
        })
    }
  })
}
