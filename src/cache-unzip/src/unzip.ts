import { Cache } from '@vltpkg/cache'
import { error } from '@vltpkg/error-cause'
import { setPriority } from 'node:os'
import { pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'
import type { Integrity } from '@vltpkg/types'
import type EventEmitter from 'node:events'
import { explode, storeEnabled } from './explode.ts'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

// same bound as @vltpkg/tar unpack: don't inflate decompression
// bombs, just leave them gzipped in the cache.
const MAX_DECOMPRESSION_RATIO = 1000
const defaultMaxUnpackedBytes = 2 * 1024 * 1024 * 1024
const parseMaxUnpackedBytes = (raw: string | undefined): number => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ?
      Math.floor(n)
    : defaultMaxUnpackedBytes
}
const maxUnpackedBytes = parseMaxUnpackedBytes(
  process.env.VLT_TAR_MAX_UNPACKED_BYTES,
)

const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).toString()

/**
 * Rewrite the cache entries at the keys read from `input` un-gzipped
 * (unless `VLT_CACHE_UNZIP=0`), and explode tarballs into the global
 * store root `store`, if given. Keys are `\0`-separated, each
 * optionally followed by `\t` and the integrity it is cached under.
 * False on no `path` or a failed explode; throws on a corrupt gzip.
 */
const main = async (
  path: undefined | string,
  input: EventEmitter = process.stdin,
  store?: string,
) => {
  if (!path) {
    return false
  }

  const items = await new Promise<string[]>(res => {
    const chunks: Buffer[] = []
    let chunkLen = 0
    input.on('data', (chunk: Buffer) => {
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
  const integrities = new Map<string, Integrity>()
  const keys = items.map(item => {
    const [key, integrity] = item.split('\t') as [string, Integrity?]
    if (integrity) integrities.set(key, integrity)
    return key
  })

  if (!keys.length) {
    return true
  }

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

  const unzip = process.env.VLT_CACHE_UNZIP !== '0'
  const results = await Promise.allSettled(
    (unzip ? keys : []).map(async key => {
      const buffer = await cache.fetch(key)
      if (!buffer || buffer.length < 4) return
      const headSizeOriginal = readSize(buffer, 0)
      const body = buffer.subarray(headSizeOriginal)
      if (body[0] === 0x1f && body[1] === 0x8b) {
        let unz: Buffer
        try {
          unz = gunzipSync(body, {
            maxOutputLength: Math.min(
              maxUnpackedBytes,
              body.length * MAX_DECOMPRESSION_RATIO,
            ),
          })
        } catch (er) {
          if (
            (er as NodeJS.ErrnoException).code !==
            'ERR_BUFFER_TOO_LARGE'
          ) {
            throw er
          }
          return
        }
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
    }),
  )
  // reads the rewritten entries back from memory
  const exploded =
    store ? await explode(cache, store, keys, integrities) : undefined
  await cache.promise()
  for (const r of results) {
    if (r.status === 'rejected') throw r.reason
  }
  return !exploded?.failed
}

if (isMain(process.argv[1])) {
  process.title = 'vlt-cache-unzip'
  const [, , path, store] = process.argv
  // unzip-only children keep their priority
  if (store && storeEnabled()) {
    try {
      setPriority(19)
      /* c8 ignore next */
    } catch {}
  }
  const res = await main(path, process.stdin, store)
  if (!res) {
    process.exit(1)
  }
}

export default main
