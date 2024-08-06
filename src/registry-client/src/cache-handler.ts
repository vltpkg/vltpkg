import { Cache } from '@vltpkg/cache'
import { error } from '@vltpkg/error-cause'
import { Integrity } from '@vltpkg/types'
import { Dispatcher } from 'undici'
import { CacheEntry } from './cache-entry.js'
import { getRawHeader } from './raw-header.js'
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
  /** expected SRI string integrity */
  integrity?: Integrity
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
  integrity?: Integrity

  constructor({
    key,
    handler,
    cache,
    entry,
    integrity,
  }: CacheHandlerOptions) {
    this.key = key
    this.handler = handler
    this.cache = cache
    this.entry = entry
    this.integrity = integrity
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
    if (statusCode === 304 && this.entry) {
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
      this.entry = new CacheEntry(statusCode, headers, this.integrity)
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
    const entry = this.entry
    const buf = entry?.encode()
    if (this.integrity && entry && !entry.checkIntegrity()) {
      return this.onError(
        error('invalid response: integrity error', {
          name: this.key,
          wanted: this.integrity,
          found: entry.integrityActual,
        }),
      )
    }
    if (buf) this.cache.set(this.key, buf)
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
