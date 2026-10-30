import { parentPort } from 'node:worker_threads'
import type { PlacementJob } from '../../src/placement-worker.ts'

// A stand-in placement worker used to drive the pool's reply and
// failure handling without depending on a real crash. Like the real
// worker it reports ready once it has booted. The job's target selects
// the behaviour:
//   'boom'  -> reply with an error carrying a stack and errno code
//   'bare'  -> reply with an error that has neither
//   'hang'  -> never reply, so the job stays in flight until close()
//   'crash' -> throw, which the worker reports as an 'error' event
//   'exit'  -> exit the thread, which arrives as an 'exit' event
//   'ok'    -> reply with a successful result
// With STUB_WORKER_BOOT=exit in the environment it exits before ever
// reporting ready, standing in for a worker lost during its boot.
const port = parentPort
if (port) {
  if (process.env.STUB_WORKER_BOOT === 'exit') process.exit(1)
  port.on('message', (job: PlacementJob) => {
    switch (job.target) {
      case 'hang':
        return
      case 'crash':
        throw new Error('worker boom')
      case 'exit':
        return process.exit(1)
      case 'bare':
        return port.postMessage({ id: job.id, error: 'bare' })
      case 'ok':
        return port.postMessage({ id: job.id, result: true })
      default:
        return port.postMessage({
          id: job.id,
          error: 'boom',
          stack: 'boom stack',
          code: 'EBOOM',
        })
    }
  })
  port.postMessage({ ready: true })
}
