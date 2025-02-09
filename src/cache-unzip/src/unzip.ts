import { Cache } from '@vltpkg/cache'
import { error } from '@vltpkg/error-cause'
import { gunzipSync } from 'zlib'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

export const main = async (
  path: undefined | string,
  input = process.stdin,
) => {
  if (!path) process.exit(1)
  const keys = await new Promise<string[]>(res => {
    const chunks: Buffer[] = []
    let chunkLen = 0
    input.on('data', chunk => {
      chunks.push(chunk)
      chunkLen += chunk.length
    })
    input.on('end', () => {
      res(
        Buffer.concat(chunks, chunkLen)
          .toString()
          .split('\0')
          .filter(i => !!i),
      )
    })
  })

  if (!keys.length) process.exit(1)

  const cache = new Cache({ path })

  const readSize = (buf: Buffer, offset: number) => {
    const a = buf[offset]
    const b = buf[offset + 1]
    const c = buf[offset + 2]
    const d = buf[offset + 3]

    // not possible, we check the length
    /* c8 ignore start */
    if (
      a === undefined ||
      b === undefined ||
      c === undefined ||
      d === undefined
    ) {
      throw error('Invalid buffer, not long enough to readSize', {
        found: buf,
        offset,
      })
    }
    /* c8 ignore stop */

    return (a << 24) | (b << 16) | (c << 8) | d
  }

  let didSomething = false
  await Promise.all(
    keys.map(async key => {
      const buffer = await cache.fetch(key)
      /* c8 ignore next - should never happen */
      if (!buffer || buffer.length < 4) return
      didSomething = true
      const headSizeOriginal = readSize(buffer, 0)
      const body = buffer.subarray(headSizeOriginal)
      if (body[0] === 0x1f && body[1] === 0x8b) {
        const unz = gunzipSync(body)
        const headersBuffer = buffer.subarray(7, headSizeOriginal)
        const headers: Buffer[] = []
        let i = 0
        let sawEncoding = false
        let isEncoding = false
        let isContentLength = false
        while (i < headersBuffer.length - 4) {
          const size = readSize(headersBuffer, i)
          const h = headersBuffer.subarray(i + 4, i + size)
          if (isEncoding) {
            isEncoding = false
            headers.push(Buffer.from('identity'))
          } else if (isContentLength) {
            isContentLength = false
            i += size
            continue
          } else {
            if (i % 2 === 0) {
              // it's a key
              if (h.toString().toLowerCase() === 'content-length') {
                isContentLength = true
                i += size
                continue
              }
              if (
                !sawEncoding &&
                h.toString().toLowerCase() === 'content-encoding'
              ) {
                sawEncoding = true
                isEncoding = true
              }
            }
            headers.push(h)
          }
          i += size
        }
        if (!sawEncoding) {
          headers.push(
            Buffer.from('content-encoding'),
            Buffer.from('identity'),
          )
        }
        headers.push(
          Buffer.from('content-length'),
          Buffer.from(String(unz.byteLength)),
        )
        const sb = buffer.subarray(4, 7)
        const chunks: Buffer[] = [sb]
        let headLength = sb.byteLength + 4
        for (const h of headers) {
          const hlBuf = Buffer.allocUnsafe(4)
          const hl = h.byteLength + 4
          headLength += hl
          hlBuf.set(
            [
              (hl >> 24) & 0xff,
              (hl >> 16) & 0xff,
              (hl >> 8) & 0xff,
              hl & 0xff,
            ],
            0,
          )
          chunks.push(hlBuf, h)
        }
        const hlBuf = Buffer.allocUnsafe(4)
        hlBuf.set(
          [
            (headLength >> 24) & 0xff,
            (headLength >> 16) & 0xff,
            (headLength >> 8) & 0xff,
            headLength & 0xff,
          ],
          0,
        )
        chunks.unshift(hlBuf)
        chunks.push(unz)
        cache.set(key, Buffer.concat(chunks, headLength + unz.length))
      }
    }),
  )
  await cache.promise()
  // TS mistakenly things didSomething is always false
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!didSomething) process.exit(1)
}

if (process.argv[1] === import.meta.filename) {
  process.title = 'vlt-cache-unzip'
  void main(process.argv[2], process.stdin)
}
