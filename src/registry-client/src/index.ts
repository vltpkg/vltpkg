import { Cache } from '@vltpkg/cache'
import { register } from '@vltpkg/cache-unzip'
import { type Integrity } from '@vltpkg/types'
import { XDG } from '@vltpkg/xdg'
import { loadPackageJson } from 'package-json-from-dist'
import { Agent, RetryAgent, type Dispatcher } from 'undici'
import { addHeader } from './add-header.js'
import { CacheEntry } from './cache-entry.js'
import { bun, deno, node } from './env.js'
import { handle304Response } from './handle-304-response.js'
import { isRedirect, redirect } from './redirect.js'
import { setCacheHeaders } from './set-cache-headers.js'
import { logRequest } from '@vltpkg/output'

export { type CacheEntry }

export type RegistryClientOptions = {
  /**
   * Path on disk where the cache should be stored
   * @default `$HOME/.config/vlt/cache`
   */
  cache?: string
  /**
   * Number of retries to perform when encountering network errors or
   * likely-transient errors from git hosts.
   */
  'fetch-retries'?: number
  /** The exponential backoff factor to use when retrying git hosts */
  'fetch-retry-factor'?: number
  /** Number of milliseconds before starting first retry */
  'fetch-retry-mintimeout'?: number
  /** Maximum number of milliseconds between two retries */
  'fetch-retry-maxtimeout'?: number
}

export type RegistryClientRequestOptions = Omit<
  Dispatcher.DispatchOptions,
  'method' | 'path'
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
   * @internal
   */
  redirections?: Set<string>
}

const { version } = loadPackageJson(import.meta.filename) as {
  version: string
}
const nua =
  (globalThis.navigator as Navigator | undefined)?.userAgent ??
  (bun ? `Bun/${bun}`
  : deno ? `Deno/${deno}`
  : node ? `Node.js/${node}`
  : '(unknown platform)')
export const userAgent = `@vltpkg/registry-client/${version} ${nua}`

const agentOptions: Agent.Options = {
  bodyTimeout: 600_000,
  headersTimeout: 600_000,
  keepAliveMaxTimeout: 1_200_000,
  keepAliveTimeout: 600_000,
  keepAliveTimeoutThreshold: 30_000,
  connect: {
    timeout: 600_000,
    keepAlive: true,
    keepAliveInitialDelay: 30_000,
    sessionTimeout: 600,
  },
  connections: 128,
  pipelining: 10,
}

const xdg = new XDG('vlt')

export class RegistryClient {
  agent: RetryAgent
  cache: Cache

  constructor(options: RegistryClientOptions) {
    const {
      cache = xdg.cache('registry-client'),
      'fetch-retry-factor': timeoutFactor = 2,
      'fetch-retry-mintimeout': minTimeout = 0,
      'fetch-retry-maxtimeout': maxTimeout = 30_000,
      'fetch-retries': maxRetries = 3,
    } = options
    this.cache = new Cache({
      path: cache,
      onDiskWrite(_path, key, data) {
        if (CacheEntry.decode(data).isGzip) register(cache, key)
      },
    })
    const dispatch = new Agent(agentOptions)
    this.agent = new RetryAgent(dispatch, {
      maxRetries,
      timeoutFactor,
      minTimeout,
      maxTimeout,
      retryAfter: true,
      errorCodes: [
        'ECONNREFUSED',
        'ECONNRESET',
        'EHOSTDOWN',
        'ENETDOWN',
        'ENETUNREACH',
        'ENOTFOUND',
        'EPIPE',
        'UND_ERR_SOCKET',
      ],
    })
  }

  async request(
    url: URL | string,
    options: RegistryClientRequestOptions = {},
  ): Promise<CacheEntry> {
    logRequest(url, 'start')

    const u = typeof url === 'string' ? new URL(url) : url
    const {
      method = 'GET',
      integrity,
      redirections = new Set(),
    } = options

    // first, try to get from the cache before making any request.
    const { origin, pathname } = u
    const key = JSON.stringify([origin, method, pathname])
    const buffer = await this.cache.fetch(key, {
      context: { integrity },
    })

    const entry = buffer ? CacheEntry.decode(buffer) : undefined
    if (entry?.valid) return entry
    // TODO: stale-while-revalidate timeout, say 1 day, where we'll
    // use the cached response even if it's invalid, and validate
    // in the background without waiting for it.

    // either no cache entry, or need to revalidate it.
    setCacheHeaders(options, entry)

    redirections.add(String(url))

    Object.assign(options, {
      path: u.pathname.replace(/\/+$/, '') + u.search,
      ...agentOptions,
    })

    options.origin = u.origin
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

    const result = await new Promise<Dispatcher.ResponseData>(
      (res, rej) => {
        /* c8 ignore start - excessive type setting for eslint */
        this.agent
          .request(options as Dispatcher.RequestOptions)
          .then(res)
          .catch((er: unknown) => rej(er as Error))
        /* c8 ignore stop */
      },
    ).then(resp => {
      if (handle304Response(resp, entry)) return entry

      const h: Buffer[] = []
      for (const [key, value] of Object.entries(resp.headers)) {
        /* c8 ignore start - theoretical */
        if (Array.isArray(value)) {
          h.push(Buffer.from(key), Buffer.from(value.join(', ')))
          /* c8 ignore stop */
        } else if (typeof value === 'string') {
          h.push(Buffer.from(key), Buffer.from(value))
        }
      }
      const result = new CacheEntry(
        /* c8 ignore next - should always have a status code */
        resp.statusCode || 200,
        h,
        options.integrity,
      )

      if (isRedirect(result)) {
        resp.body.resume()
        try {
          const [nextURL, nextOptions] = redirect(options, result, u)
          if (nextOptions && nextURL) {
            return this.request(nextURL, nextOptions)
          }
          return result
        } catch (er) {
          /* c8 ignore start */
          throw er instanceof Error ? er : (
              new Error(typeof er === 'string' ? er : 'Unknown error')
            )
          /* c8 ignore stop */
        }
      }

      resp.body.on('data', (chunk: Buffer) => result.addBody(chunk))
      return new Promise<CacheEntry>((res, rej) => {
        resp.body.on('error', rej)
        resp.body.on('end', () => res(result))
      })
    })

    this.cache.set(key, result.encode())
    return result
  }
}
