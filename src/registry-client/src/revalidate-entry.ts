import type { TransportRequestOptions } from './transport.ts'
import { randomUUID } from 'node:crypto'
import { open, readFile } from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import { addHeader } from './add-header.ts'
import { getTokenByURL } from './auth.ts'
import { CacheEntry } from './cache-entry.ts'
import { handleCacheHitResponse } from './handle-304-response.ts'
import type {
  RegistryClient,
  RegistryClientRequestOptions,
} from './index.ts'
import { cacheKey, userAgent } from './index.ts'
import { collectHeaders, readBody } from './response.ts'
import { setCacheHeaders } from './set-cache-headers.ts'

const patchDateFallback = async (
  rc: RegistryClient,
  file: string,
  key: string,
  head: CacheEntry,
) => {
  const date = head.getHeaderString('date')
  /* c8 ignore next */
  if (!date) return
  const full = await readFile(file)
  const fullEntry = CacheEntry.decode(full)
  if (!fullEntry.statusCode) return
  fullEntry.setHeader('date', date)
  const buf = fullEntry.encode()
  rc.cache.set(
    key,
    Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength),
    { integrity: fullEntry.integrity },
  )
}

const readHead = async (
  fh: FileHandle,
): Promise<CacheEntry | undefined> => {
  const sizeBuf = Buffer.alloc(4)
  const { bytesRead } = await fh.read(sizeBuf, 0, 4, 0)
  if (bytesRead < 4) return
  const headSize = sizeBuf.readUInt32BE(0)
  if (headSize < 7) return
  const headBuf = Buffer.alloc(headSize)
  sizeBuf.copy(headBuf, 0, 0, 4)
  const { bytesRead: n } = await fh.read(headBuf, 4, headSize - 4, 4)
  if (n < headSize - 4) return
  const entry = CacheEntry.decodeHead(headBuf)
  return entry.statusCode ? entry : undefined
}

export const revalidateEntry = async (
  rc: RegistryClient,
  method: 'GET' | 'HEAD',
  url: URL | string,
): Promise<void> => {
  try {
    const u = typeof url === 'string' ? new URL(url) : url
    const key = cacheKey(method, u)
    const file = rc.cache.path(key)
    let fh: FileHandle | undefined
    try {
      fh = await open(file, 'r+')
      const entry = await readHead(fh)
      if (!entry) return
      const origHeadSize = entry.headSize

      const options: RegistryClientRequestOptions = {
        method,
        origin: u.origin,
      }
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- dispatcher requires path
      options.path = u.pathname.replace(/\/+$/, '') + u.search
      options.headers = addHeader(
        addHeader(
          addHeader(
            options.headers,
            'accept-encoding',
            'gzip;q=1.0, identity;q=0.5',
          ),
          'user-agent',
          userAgent,
        ),
        'npm-session',
        randomUUID(),
      )
      setCacheHeaders(options, entry)
      options.headers = addHeader(
        options.headers,
        'authorization',
        await getTokenByURL(String(u), rc.identity),
      )

      const response = await (
        await rc.transport()
      ).request(options as TransportRequestOptions)

      if (handleCacheHitResponse(response, entry)) {
        const newHead = entry.encodeHead()
        if (newHead.byteLength === origHeadSize) {
          await fh.write(newHead, 0, newHead.byteLength, 0)
          return
        }
        await fh.close()
        fh = undefined
        await patchDateFallback(rc, file, key, entry)
        return
      }

      if (response.statusCode === 200 && method === 'GET') {
        const result = new CacheEntry(
          response.statusCode,
          collectHeaders(response),
          {
            'stale-while-revalidate-factor':
              rc.staleWhileRevalidateFactor,
            contentLength:
              response.headers['content-length'] ?
                Number(response.headers['content-length'])
              : undefined,
          },
        )
        await readBody(response, result)
        result.unzip()
        const buf = result.encode()
        rc.cache.set(
          key,
          Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength),
          { integrity: result.integrity },
        )
        return
      }

      // Lean path uses bare undici (no redirect following). Hand
      // 3xx back to RegistryClient so per-origin auth, cycle limits,
      // and the final cache write stay in the tested request() path.
      const status = response.statusCode
      if (
        status === 301 ||
        status === 302 ||
        status === 303 ||
        status === 307 ||
        status === 308
      ) {
        response.body.resume()
        await fh.close()
        fh = undefined
        await rc.request(u, { method, staleWhileRevalidate: false })
        return
      }

      response.body.resume()
    } finally {
      await fh?.close()
    }
  } catch {}
}
