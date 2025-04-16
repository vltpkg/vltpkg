import { Cache } from '@vltpkg/cache'
import { error } from '@vltpkg/error-cause'
import { pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'
import type { Integrity } from '@vltpkg/types'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).toString()

const main = async (
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

  const results = await Promise.all(
    keys.map(async key => {
      const buffer = await cache.fetch(key)
      if (!buffer || buffer.length < 4) return null
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
        let isIntegrity = false
        let integrity: undefined | Integrity = undefined
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
          } else if (isIntegrity) {
            isIntegrity = false
            integrity = h.toString() as Integrity
            headers.push(h)
          } else {
            if (headers.length % 2 === 0) {
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
              } else if (
                !integrity &&
                h.toString().toLowerCase() === 'integrity'
              ) {
                isIntegrity = true
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
        cache.set(
          key,
          Buffer.concat(chunks, headLength + unz.length),
          {
            integrity,
          },
        )
      }
      return true
    }),
  )
  await cache.promise()
  if (!results.some(Boolean)) process.exit(1)
}

const g = globalThis as typeof globalThis & {
  __VLT_INTERNAL_MAIN?: string
}

if (isMain(g.__VLT_INTERNAL_MAIN ?? process.argv[1])) {
  process.title = 'vlt-cache-unzip'
  // When compiled there can be other leading args supplied by Deno
  // so always use the last arg unless there are only two which means
  // no path was supplied.
  const path =
    process.argv.length === 2 ? undefined : process.argv.at(-1)
  void main(path, process.stdin)
}
