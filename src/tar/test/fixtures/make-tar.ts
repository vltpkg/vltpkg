import { Header } from 'tar'
import type { HeaderData } from 'tar'

const concatUint8Arrays = (arr: Uint8Array[]): Uint8Array =>
  arr.reduce((acc, i) => {
    const next = new Uint8Array(acc.byteLength + i.byteLength)
    next.set(acc, 0)
    next.set(i, acc.byteLength)
    return next
  }, new Uint8Array(0))

export const makeTar = (
  chunks: (string | Uint8Array | HeaderData)[],
): Uint8Array => {
  return concatUint8Arrays(
    chunks.concat([new Uint8Array(1024)]).map(chunk => {
      if (chunk && typeof chunk !== 'string' && 'buffer' in chunk) {
        if (chunk.byteLength % 512 !== 0) {
          const size = 512 * Math.ceil(chunk.byteLength / 512)
          const c = new Uint8Array(size - chunk.byteLength)
          chunk = concatUint8Arrays([chunk, c])
        }
        return chunk
      }
      const size = Math.max(
        typeof chunk === 'string' ?
          512 * Math.ceil(chunk.length / 512)
        : 512,
      )
      const buf = new Uint8Array(size)
      if (typeof chunk === 'string') {
        buf.set(new TextEncoder().encode(chunk), 0)
      } else {
        // Create a Buffer that shares the same memory as the Uint8Array
        const buffer = Buffer.from(
          buf.buffer,
          buf.byteOffset,
          buf.byteLength,
        )
        new Header({ type: 'File', ...chunk }).encode(buffer, 0)
      }
      return buf
    }),
  )
}
