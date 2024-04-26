import { Cache } from '@vltpkg/cache'
import { register } from '@vltpkg/cache-unzip'
import { homedir } from 'os'
import { resolve } from 'path'
import { Client, Dispatcher, Pool } from 'undici'
import { addHeader } from './add-header.js'
import { CacheEntry } from './cache-entry.js'
import { cacheInterceptor } from './cache-interceptor.js'

export { CacheEntry, cacheInterceptor }

export type RegistryClientOptions = {
  /**
   * Path on disk where the cache should be stored
   *
   * @default `$HOME/.config/vlt/cache`
   */
  cache?: string
}

export type RegistryClientRequestOptions = Omit<
  Dispatcher.DispatchOptions,
  'path'
> & {
  /**
   * Provide an SRI string to verify integrity of the item being fetched.
   *
   * This is only relevant when it must make a request to the registry. Once in
   * the local disk cache, items are assumed to be trustworthy.
   */
  integrity?: string
}

export class RegistryClient {
  pools: Map<string, Pool> = new Map()
  cache: Cache

  constructor({
    cache = resolve(homedir(), '.config/vlt/cache'),
  }: RegistryClientOptions) {
    this.cache = new Cache({
      path: cache,
      onDiskWrite(_path, key, data) {
        if (CacheEntry.decode(data).isGzip) register(cache, key)
      },
    })
  }

  async request(
    url: string | URL,
    options: RegistryClientRequestOptions = { method: 'GET' },
  ) {
    if (typeof url === 'string') url = new URL(url)
    Object.assign(options, {
      path: url.pathname.replace(/\/+$/, '') + url.search,
      cache: this.cache,
    })
    options.origin = url.origin
    const pool =
      this.pools.get(options.origin) ??
      new Pool(options.origin, {
        factory: (origin, opts) =>
          new Client(origin, opts).compose(cacheInterceptor),
      })
    this.pools.set(options.origin, pool)
    options.headers = addHeader(
      options.headers,
      'accept-encoding',
      'gzip;q=1.0, identity;q=0.5',
    )
    return await new Promise<CacheEntry>((res, rej) => {
      let entry: CacheEntry
      pool.dispatch(options as Dispatcher.DispatchOptions, {
        onHeaders: (sc, h, resume) => {
          entry = new CacheEntry(sc, h, options.integrity)
          resume()
          return true
        },
        onData: chunk => {
          entry.addBody(chunk)
          return true
        },
        onError: rej,
        onComplete: () => {
          res(entry)
          return true
        },
      })
    })
  }
}
