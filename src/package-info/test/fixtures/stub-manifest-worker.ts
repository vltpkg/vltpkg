import { parentPort, workerData } from 'node:worker_threads'
import type { ManifestJob } from '../../src/manifest-worker.ts'

// A stand-in manifest worker used to drive the pool's reply and failure
// handling without a registry. Like the real worker it reports ready
// once it has booted. The job's spec name selects the behaviour:
//   boom   -> reply with an error carrying a code
//   bare   -> reply with an error that has no code
//   hang   -> never reply, so the job stays in flight until close()
//   crash  -> throw, which the worker reports as an 'error' event
//   exit   -> exit the thread, which arrives as an 'exit' event
//   vltpkg -> a manifest from a vlt packument
//   else   -> a manifest at 1.0.0, echoing the options it was given
// With STUB_WORKER_BOOT=exit in the environment it exits before ever
// reporting ready. The worker data (the client options) is echoed in
// the manifest's description so a test can check what it was given.
const port = parentPort
if (port) {
  if (process.env.STUB_WORKER_BOOT === 'exit') process.exit(1)
  // a request event, as a real worker's client forwards them
  port.postMessage({
    request: {
      url: 'https://registry.example.com/stub',
      state: 'start',
    },
  })
  const { options } = workerData as {
    options: Record<string, unknown>
  }
  port.on('message', (job: ManifestJob | { drain: true }) => {
    // asked to drain: exit on its own, unless told to hang there too
    if ('drain' in job) {
      if (process.env.STUB_WORKER_DRAIN !== 'hang') port.close()
      return
    }
    const name = job.spec.replace(/@.*$/, '')
    switch (name) {
      case 'hang':
        return
      case 'crash':
        throw new Error('worker boom')
      case 'exit':
        return process.exit(1)
      case 'bare':
        return port.postMessage({ id: job.id, error: 'bare' })
      case 'boom':
        return port.postMessage({
          id: job.id,
          error: 'boom',
          code: 'EBOOM',
        })
      default:
        return port.postMessage({
          id: job.id,
          manifest: {
            name,
            version: '1.0.0',
            description: JSON.stringify({
              from: job.from,
              backgroundRevalidate: job.backgroundRevalidate,
              registry: options.registry,
              threads: process.env.VLT_MANIFEST_THREADS,
            }),
          },
          vlt: name === 'vltpkg',
        })
    }
  })
  // slow: report ready only after a while, so a test can catch the boot
  if (process.env.STUB_WORKER_BOOT === 'slow') {
    setTimeout(() => port.postMessage({ ready: true }), 500)
  } else {
    port.postMessage({ ready: true })
  }
}
