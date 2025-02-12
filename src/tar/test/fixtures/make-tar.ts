import { Header } from 'tar'
import type { HeaderData } from 'tar'
export const makeTar = (chunks: (string | Buffer | HeaderData)[]) => {
  let dataLen = 0
  return Buffer.concat(
    chunks.concat([Buffer.alloc(1024)]).map(chunk => {
      if (Buffer.isBuffer(chunk)) {
        if (chunk.length % 512 !== 0) {
          const size = 512 * Math.ceil(chunk.length / 512)
          const c = Buffer.alloc(size - chunk.length)
          chunk = Buffer.concat([chunk, c])
        }
        dataLen += chunk.length
        return chunk
      }
      const size = Math.max(
        typeof chunk === 'string' ?
          512 * Math.ceil(chunk.length / 512)
        : 512,
      )
      dataLen += size
      const buf = Buffer.alloc(size)
      if (typeof chunk === 'string') {
        buf.write(chunk)
      } else {
        new Header({ type: 'File', ...chunk }).encode(buf, 0)
      }
      return buf
    }),
    dataLen,
  )
}
