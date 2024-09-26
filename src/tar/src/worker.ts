import { isMainThread, parentPort, MessagePort } from 'worker_threads'
import { unpack } from './unpack.js'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename.replace(
  /\.ts$/,
  '.js',
)

// this is the code that runs in the worker thread
/* c8 ignore start - V8 coverage can't see into worker threads */
const main = (pp: MessagePort) => {
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
  pp.on('message', onMessage)
}

if (!isMainThread && parentPort) {
  main(parentPort)
}
/* c8 ignore stop */
