// this is the code that runs in the worker thread

import { error } from '@vltpkg/error-cause'
import { isMainThread, parentPort } from 'worker_threads'
import { unpack } from './unpack.js'

/* c8 ignore start - V8 coverage can't see into worker threads */
if (isMainThread || !parentPort) {
  throw error('worker.js should be run in a worker thread')
}

const pp = parentPort

const onMessage = ({
  id,
  tarData,
  target,
}: {
  id: string
  tarData?: Buffer
  target?: string
}) => {
  if (
    !(tarData instanceof ArrayBuffer) ||
    typeof target !== 'string'
  ) {
    return pp.postMessage({ id, error: 'invalid arguments' })
  }
  unpack(Buffer.from(tarData), target)
  pp.postMessage({ id, ok: true })
}

parentPort.on('message', onMessage)
/* c8 ignore stop */
