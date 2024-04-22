import { Cache } from '@vltpkg/cache'
import { STATUS_CODES } from 'http'
import { Readable } from 'stream'
import { Dispatcher } from 'undici'
import { addHeader } from './add-header.js'
import { CacheEntry } from './cache-entry.js'
import { CacheHandler } from './cache-handler.js'
import { getHeader } from './get-header.js'

export const cacheInterceptor: Dispatcher.DispatchInterceptor =
  dispatch => {
    return (
      opts: Dispatcher.DispatchOptions & { cache: Cache },
      handler,
    ) => {
      if (opts.method !== 'GET' && opts.method !== 'HEAD') {
        return dispatch(opts, handler)
      }

      const { cache, method, path, origin, body, headers } = opts

      // registry JSON responses vary on the 'accept' header, returning
      // a minified packument for 'application/vnd.npm.install-v1+json'
      const accept = getHeader(headers, 'accept')

      // throw away the body stream, should never have one of these
      // no package registry supports GET request bodies.
      const br = body as undefined | Readable
      if (typeof br?.resume === 'function') br.resume()

      const key = JSON.stringify([origin, method, path, accept])
      cache.fetch(key).then(buffer => {
        const entry = buffer ? CacheEntry.decode(buffer) : undefined
        const cacheHandler = new CacheHandler({
          key,
          handler,
          cache,
          entry,
        })

        if (!buffer || !entry) {
          return dispatch(opts, cacheHandler)
        }

        // JUST return from cache, don't even revalidate
        if (entry.valid) {
          // serve from cache maybe
          // if it was a tarball, always return cached entry.
          const ac = new AbortController()
          const { signal } = ac
          const { abort } = ac
          handler.onConnect?.(abort)
          signal.throwIfAborted()
          /* c8 ignore next */
          handler.onHeaders?.(
            entry.statusCode,
            entry.headers,
            () => {},
            /* c8 ignore next */
            STATUS_CODES[entry.statusCode] ?? 'Unknown Status Code',
          )
          handler.onData?.(entry.buffer())
          handler.onComplete?.(null)
          return
        } else {
          // might be that we need to revalidate
          // the CacheHandler will respond with the cache entry
          // if it gets a 306.
          const etag = entry.getHeader('etag')?.toString()
          if (etag) {
            opts.headers = addHeader(
              opts.headers,
              'if-none-match',
              etag,
            )
          }
          const date =
            entry.getHeader('date')?.toString() ??
            entry.getHeader('last-modified')?.toString()
          if (date) {
            opts.headers = addHeader(
              opts.headers,
              'if-modified-since',
              date,
            )
          }
          return dispatch(opts, cacheHandler)
        }
      })
      return true
    }
  }
