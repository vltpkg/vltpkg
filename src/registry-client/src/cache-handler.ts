import { Cache } from '@vltpkg/cache'
import { Dispatcher } from 'undici'
import { CacheEntry } from './cache-entry.js'
import { getRawHeader } from './get-raw-header.js'
import { isCacheable } from './is-cacheable.js'
import { setRawHeader } from './set-raw-header.js'

export type CacheHandlerOptions = {
  /** cache key for this request */
  key: string
  /** handler being extended */
  handler: Dispatcher.DispatchHandlers
  /** root directory for on-disk cache */
  cache: Cache
  /** the old cache entry, if one exists */
  entry?: CacheEntry
}

/**
 * the handler used by the CacheDispatcher
 *
 * At the point where this gets used, we've already established that
 * a request needs to be made, and that it MAY be cacheable, depending
 * on the nature of the response.
 *
 * So this only deals with putting data INTO the cache, not getting it
 * back out again; that is handled by the CacheInterceptor, which is added
 * via Pool.compose()
 */
export class CacheHandler implements Dispatcher.DispatchHandlers {
  key: string
  handler: Dispatcher.DispatchHandlers
  cache: Cache
  abort?: () => void
  body: Buffer[] = []
  cacheable?: boolean = undefined
  resume?: () => void
  entry?: CacheEntry

  constructor({ key, handler, cache, entry }: CacheHandlerOptions) {
    this.key = key
    this.handler = handler
    this.cache = cache
    this.entry = entry
  }

  /**
   * Invoked before request is dispatched on socket. May be invoked multiple
   * times when a request is retried when the request at the head of the
   * pipeline fails. */
  onConnect(abort: () => void): void {
    this.abort = abort
    return this.handler.onConnect?.(abort)
  }

  /**
   * Invoked when statusCode and headers have been received. May be invoked
   * multiple times due to 1xx informational headers.
   */
  onHeaders(
    statusCode: number,
    headers: Buffer[],
    resume: () => void,
    statusText: string,
  ): boolean {
    this.resume = resume

    // this means that we re-validated the cache. update the entry
    // with the new date, but otherwise proceed as if we'd gotten the
    // cached entry as our response.
    if (statusCode === 306 && this.entry) {
      setRawHeader(
        this.entry.headers,
        'date',
        getRawHeader(headers, 'date') ??
          Buffer.from(new Date().toUTCString()),
      )
      // serve from cache
      this.handler.onHeaders?.(
        this.entry.statusCode,
        this.entry.headers,
        resume,
        statusText,
      )
      this.handler.onData?.(this.entry.buffer())

      this.onComplete(null)
      return true
    }

    this.cacheable = isCacheable(statusCode)
    if (this.cacheable && !this.entry) {
      this.entry = new CacheEntry(statusCode, headers)
    }

    return !!this.handler.onHeaders?.(
      statusCode,
      headers,
      resume,
      statusText,
    )
  }

  /** Invoked when an error has occurred. */
  onError(err: Error): void {
    this.handler.onError?.(err)
  }

  /** Invoked when response payload data is received. */
  onData(chunk: Buffer): boolean {
    this.entry?.addBody(chunk)
    return !!this.handler.onData?.(chunk)
  }

  /**
   * Invoked when response payload and trailers have been received and the
   * request has completed.
   */
  onComplete(trailers: string[] | null): void {
    const entry = this.entry?.encode()
    if (entry) this.cache.set(this.key, entry)
    return this.handler.onComplete?.(trailers)
  }

  /**
   * Invoked when a body chunk is sent to the server. May be invoked
   * multiple times for chunked requests
   */
  onBodySent(chunkSize: number, totalBytesSent: number): void {
    return this.handler.onBodySent?.(chunkSize, totalBytesSent)
  }
}
