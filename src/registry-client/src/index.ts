import { Cache } from '@vltpkg/cache'
import { homedir } from 'os'
import { resolve } from 'path'
import { Client, Dispatcher, Pool } from 'undici'
import { addHeader } from './add-header.js'
import { CacheEntry } from './cache-entry.js'
import { cacheInterceptor } from './cache-interceptor.js'

export type RegistryClientOptions = {
  /**
   * Path on disk where the cache should be stored
   *
   * @default `$HOME/.config/vlt/cache`
   */
  cache?: string
}

export class RegistryClient {
  pools: Map<string, Pool> = new Map()
  cache: Cache

  constructor({
    cache = resolve(homedir(), '.config/vlt/cache'),
  }: RegistryClientOptions) {
    this.cache = new Cache({
      path: cache
      // TODO: add an onDiskWrite callback here to add the path
      // to a list of filenames to be passed to vlt-cache-unzip
      // at the end, and register the handler for kicking off that
      // process if it's not already.
    })
  }

  async request(
    url: string | URL,
    options: Omit<Dispatcher.DispatchOptions, 'path'> & {
      path?: string
      cache?: Cache
    } = { method: 'GET' },
  ) {
    if (typeof url === 'string') url = new URL(url)
    options.path = url.pathname.replace(/\/+$/, '') + url.search
    options.origin = url.origin
    const pool =
      this.pools.get(options.origin) ??
      new Pool(options.origin, {
        factory: (origin, opts) =>
          new Client(origin, opts).compose(cacheInterceptor),
      })
    this.pools.set(options.origin, pool)
    options.cache = this.cache
    options.headers = addHeader(
      options.headers,
      'accept-encoding',
      'gzip;q=1.0, identity;q=0.5',
    )
    return await new Promise<CacheEntry>((res, rej) => {
      let entry: CacheEntry
      pool.dispatch(options as Dispatcher.DispatchOptions, {
        onHeaders(sc, h, resume) {
          entry = new CacheEntry(sc, h)
          resume()
          return true
        },
        onData(chunk) {
          entry.addBody(chunk)
          return true
        },
        onError: rej,
        onComplete() {
          res(entry)
          return true
        },
      })
    })
  }
}
