import { Cache } from '@vltpkg/cache'
import { register } from '@vltpkg/cache-unzip'
import { Integrity } from '@vltpkg/types'
import { XDG } from '@vltpkg/xdg'
import { loadPackageJson } from 'package-json-from-dist'
import { Client, Dispatcher, Pool } from 'undici'
import { addHeader } from './add-header.js'
import { CacheEntry } from './cache-entry.js'
import { cacheInterceptor } from './cache-interceptor.js'
import { isRedirect, redirect } from './redirect.js'

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
  'path' | 'method'
> & {
  /**
   * `path` should not be set when using the RegistryClient.
   * It will be overwritten with the path on the URL being requested.
   * This only here for compliance with the DispatchOptions base type.
   * @deprecated
   */
  path?: string

  /**
   * Method is optional, defaults to 'GET'
   */
  method?: Dispatcher.DispatchOptions['method']
  /**
   * Provide an SRI string to verify integrity of the item being fetched.
   *
   * This is only relevant when it must make a request to the registry. Once in
   * the local disk cache, items are assumed to be trustworthy.
   */
  integrity?: Integrity

  /**
   * Follow up to 10 redirections by default. Set this to 0 to just return
   * the 3xx response. If the max redirections are expired, and we still get
   * a redirection response, then fail the request. Redirection cycles are
   * always treated as an error.
   */
  maxRedirections?: number

  /**
   * the number of redirections that have already been seen. This is used
   * internally, and should always start at 0.
   *
   * @internal
   */
  redirections?: Set<string>
}

const { version } = loadPackageJson(
  import.meta.url,
  '../package.json',
)
const navUA = globalThis.navigator?.userAgent
const bun =
  navUA ??
  //@ts-ignore
  ((await import('bun').catch(() => {}))?.default?.version as
    | string
    | undefined)
const deno =
  //@ts-ignore
  navUA ?? (globalThis.Deno?.deno?.version as string | undefined)
const node =
  //@ts-ignore
  navUA ?? (globalThis.process?.version as string | undefined)
const nua =
  navUA ??
  (bun ? `Bun/${bun}`
  : deno ? `Deno/${deno}`
  : node ? `Node.js/${node}`
  : '(unknown platform)')
export const userAgent = `@vltpkg/registry-client/${version} ${nua}`

const xdg = new XDG('vlt')

export class RegistryClient {
  pools: Map<string, Pool> = new Map()
  cache: Cache

  constructor({
    cache = xdg.cache('registry-client'),
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
    options: RegistryClientRequestOptions = {},
  ): Promise<CacheEntry> {
    const u = typeof url === 'string' ? new URL(url) : url
    const { maxRedirections = 10, redirections = new Set() } = options
    redirections.add(String(url))
    Object.assign(options, {
      path: u.pathname.replace(/\/+$/, '') + u.search,
      cache: this.cache,
      maxRedirections,
      redirections,
    })
    options.origin = u.origin
    const pool =
      this.pools.get(options.origin) ??
      new Pool(options.origin, {
        factory: (origin, opts) =>
          new Client(origin, opts).compose(cacheInterceptor),
      })
    this.pools.set(options.origin, pool)
    options.headers = addHeader(
      addHeader(
        options.headers,
        'accept-encoding',
        'gzip;q=1.0, identity;q=0.5',
      ),
      'user-agent',
      userAgent,
    )
    options.method = options.method ?? 'GET'
    // do not await, or else stack overflow happens
    return new Promise<CacheEntry>((res, rej) => {
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
          if (isRedirect(entry)) {
            try {
              const [nextURL, nextOptions] = redirect(
                options,
                entry,
                u,
              )
              if (nextOptions && nextURL) {
                res(this.request(nextURL, nextOptions))
                return true
              } else {
                res(entry)
                return true
              }
            } catch (er) {
              rej(er)
              return true
            }
          }
          res(entry)
          return true
        },
      })
    })
  }
}
