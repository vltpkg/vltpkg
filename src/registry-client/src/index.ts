import { Cache } from '@vltpkg/cache'
import { register as cacheUnzipRegister } from '@vltpkg/cache-unzip'
import { error } from '@vltpkg/error-cause'
import { asError } from '@vltpkg/types'
import { logRequest } from '@vltpkg/output'
import type { Integrity } from '@vltpkg/types'
import { urlOpen } from '@vltpkg/url-open'
import { XDG } from '@vltpkg/xdg'
import { dirname, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { loadPackageJson } from 'package-json-from-dist'
import type { Dispatcher } from 'undici'
import { Agent, RetryAgent } from 'undici'
import { addHeader } from './add-header.ts'
import type { Token } from './auth.ts'
import {
  deleteToken,
  getKC,
  getToken,
  isToken,
  keychains,
  setToken,
} from './auth.ts'
import type { JSONObj } from './cache-entry.ts'
import { CacheEntry } from './cache-entry.ts'
import { register } from './cache-revalidate.ts'
import { bun, deno, node } from './env.ts'
import { handle304Response } from './handle-304-response.ts'
import { otplease } from './otplease.ts'
import { isRedirect, redirect } from './redirect.ts'
import { setCacheHeaders } from './set-cache-headers.ts'
import type { TokenResponse } from './token-response.ts'
import { getTokenResponse } from './token-response.ts'
import type { WebAuthChallenge } from './web-auth-challenge.ts'
import { getWebAuthChallenge } from './web-auth-challenge.ts'
import { getEncondedValue } from './string-encoding.ts'
export {
  CacheEntry,
  deleteToken,
  getKC,
  isToken,
  keychains,
  setToken,
  type JSONObj,
  type Token,
  type TokenResponse,
  type WebAuthChallenge,
}

export type CacheableMethod = 'GET' | 'HEAD'
export const isCacheableMethod = (m: unknown): m is CacheableMethod =>
  m === 'GET' || m === 'HEAD'

export type RegistryClientOptions = {
  /**
   * Path on disk where the cache should be stored
   *
   * Defaults to the XDG cache folder for `vlt/registry-client`
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

  /** the identity to use for storing auth tokens */
  identity?: string

  /**
   * If the server does not serve a `stale-while-revalidate` value in the
   * `cache-control` header, then this multiplier is applied to the `max-age`
   * or `s-maxage` values.
   *
   * By default, this is `60`, so for example a response that is cacheable for
   * 5 minutes will allow a stale response while revalidating for up to 5
   * hours.
   *
   * If the server *does* provide a `stale-while-revalidate` value, then that
   * is always used.
   *
   * Set to 0 to prevent any `stale-while-revalidate` behavior unless
   * explicitly allowed by the server's `cache-control` header.
   */
  'stale-while-revalidate-factor'?: number
}

export type RegistryClientRequestOptions = Omit<
  Dispatcher.RequestOptions,
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
   * Set to true if the integrity should be trusted implicitly without
   * a recalculation, for example if it comes from a trusted registry that
   * also serves the tarball itself.
   */
  trustIntegrity?: boolean

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

  /**
   * Set to `false` to suppress ANY lookups from cache. This will also
   * prevent storing the result to the cache.
   */
  useCache?: false

  /**
   * Set to pass an `npm-otp` header on the request.
   *
   * This should not be set except by the RegistryClient itself, when
   * we receive a 401 response with an OTP challenge.
   * @internal
   */
  otp?: string

  /**
   * Set to false to explicitly prevent `stale-while-revalidate` behavior,
   * for use in revalidating while stale.
   * @internal
   */
  staleWhileRevalidate?: false
}

const { version } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_REGISTRY_CLIENT_PACKAGE_JSON,
) as {
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
  identity: string
  staleWhileRevalidateFactor: number

  constructor(options: RegistryClientOptions) {
    const {
      cache = xdg.cache(),
      'fetch-retry-factor': timeoutFactor = 2,
      'fetch-retry-mintimeout': minTimeout = 0,
      'fetch-retry-maxtimeout': maxTimeout = 30_000,
      'fetch-retries': maxRetries = 3,
      identity = '',
      'stale-while-revalidate-factor':
        staleWhileRevalidateFactor = 60,
    } = options
    this.identity = identity
    this.staleWhileRevalidateFactor = staleWhileRevalidateFactor
    const path = resolve(cache, 'registry-client')
    this.cache = new Cache({
      path,
      onDiskWrite(_path, key, data) {
        if (CacheEntry.isGzipEntry(data)) {
          cacheUnzipRegister(path, key)
        }
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

  /**
   * Fetch the entire set of a paginated list of objects
   */
  async scroll<T>(
    url: URL | string,
    options: RegistryClientRequestOptions = {},
    seek?: (obj: T) => boolean,
  ): Promise<T[]> {
    const resp = await this.request(url, options)
    const { objects, urls } = resp.json() as {
      objects: T[]
      urls: { next?: string }
    }
    // if we have more, and haven't found our target, fetch more
    return urls.next && !(seek && objects.some(seek)) ?
        objects.concat(await this.scroll<T>(urls.next, options, seek))
      : objects
  }

  /**
   * find a given item in a paginated set
   */
  async seek<T>(
    url: URL | string,
    seek: (obj: T) => boolean,
    options: RegistryClientRequestOptions = {},
  ): Promise<T | undefined> {
    return (await this.scroll(url, options, seek)).find(seek)
  }

  /**
   * Log out from the registry specified, attempting to destroy the
   * token if the registry supports that endpoint.
   */
  async logout(registry: string) {
    // if we have no token for that registry, nothing to do
    const tok = await getToken(registry, this.identity)
    if (!tok) return

    const s = tok.replace(/^(Bearer|Basic) /i, '')

    const tokensUrl = new URL('-/npm/v1/tokens', registry)
    const record = await this.seek<{
      key: string
      token: string
    }>(tokensUrl, ({ token }) => s.startsWith(token), {
      useCache: false,
    }).catch(() => undefined)

    if (record) {
      const { key } = record
      await this.request(
        new URL(`-/npm/v1/tokens/token/${key}`, registry),
        { useCache: false, method: 'DELETE' },
      )
    }

    await deleteToken(registry, this.identity)
  }

  /**
   * Log into the registry specified
   *
   * Does not return the token or expose it, just saves to the auth keychain
   * and returns void if it worked. Otherwise, error is raised.
   */
  async login(registry: string) {
    // - make POST to '/-/v1/login'
    // - include a body of {} and npm-auth-type:web
    // - get a {doneUrl, authUrl}
    // - open the authUrl
    // - hang on the doneUrl until done
    //
    // if that fails: fall back to couchdb login
    const webLoginURL = new URL('-/v1/login', registry)
    const response = await this.request(webLoginURL, {
      method: 'POST',
      useCache: false,
      headers: {
        'content-type': 'application/json',
        'npm-auth-type': 'web',
      },
      body: '{}',
    })

    if (response.statusCode === 200) {
      const challenge = getWebAuthChallenge(response.json())
      if (challenge) {
        const result = await this.webAuthOpener(challenge)
        await setToken(
          registry,
          `Bearer ${result.token}`,
          this.identity,
        )
        return
      }
    }
    /* c8 ignore start */
    // TODO: fall back to username/password login, and/or couchdb PUT login
    throw error('Failed to perform web login', { response })
  }
  /* c8 ignore stop */

  /**
   * Given a {@link WebAuthChallenge}, open the `authUrl` in a browser and
   * hang on the `doneUrl` until it returns a {@link TokenResponse} object.
   */
  async webAuthOpener({ doneUrl, authUrl }: WebAuthChallenge) {
    const ac = new AbortController()
    const { signal } = ac
    /* c8 ignore start - race condition */
    const [result] = await Promise.all([
      this.#checkLogin(doneUrl, { signal }).then(result => {
        ac.abort()
        return result
      }),
      urlOpen(authUrl, { signal }).catch((er: unknown) => {
        if (asError(er).name === 'AbortError') return
        ac.abort()
        throw er
      }),
    ])
    /* c8 ignore stop */
    return result
  }

  async #checkLogin(
    url: URL | string,
    options: RegistryClientRequestOptions = {},
  ): Promise<TokenResponse> {
    const response = await this.request(url, {
      ...options,
      useCache: false,
    })
    const { signal } = options as { signal?: AbortSignal }
    if (response.statusCode === 202) {
      const rt = response.getHeaderString('retry-after')
      const retryAfter = rt ? Number(rt) : -1
      if (retryAfter > 0) {
        await setTimeout(retryAfter * 1000, null, { signal })
      }
      return await this.#checkLogin(url, options)
    }
    if (response.statusCode === 200) {
      const token = getTokenResponse(response.json())
      if (token) return token
    }
    throw error('Invalid response from web login endpoint', {
      response,
    })
  }

  async request(
    url: URL | string,
    options: RegistryClientRequestOptions = {},
  ): Promise<CacheEntry> {
    const u = typeof url === 'string' ? new URL(url) : url
    const {
      method = 'GET',
      integrity,
      redirections = new Set(),
      signal,
      otp = (process.env.VLT_OTP ?? '').trim(),
      staleWhileRevalidate = true,
    } = options
    let { trustIntegrity } = options

    const m = isCacheableMethod(method) ? method : undefined
    const { useCache = !!m } = options

    ;(signal as AbortSignal | null)?.throwIfAborted()

    // first, try to get from the cache before making any request.
    const { origin } = u
    const key = `${method !== 'GET' ? method + ' ' : ''}${u}`
    const buffer =
      useCache ?
        await this.cache.fetch(key, { context: { integrity } })
      : undefined

    const entry = buffer ? CacheEntry.decode(buffer) : undefined
    if (entry?.valid) {
      logRequest(url, 'cache')
      return entry
    }

    if (staleWhileRevalidate && entry?.staleWhileRevalidate && m) {
      // revalidate while returning the stale entry
      register(dirname(this.cache.path()), m, url)
      logRequest(url, 'stale')
      return entry
    }

    logRequest(url, 'start')

    // either no cache entry, or need to revalidate before use.
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
    if (otp) {
      options.headers = addHeader(options.headers, 'npm-otp', otp)
    }
    if (integrity) {
      options.headers = addHeader(
        options.headers,
        'accept-integrity',
        integrity,
      )
    }
    options.method = options.method ?? 'GET'

    // will remove if we don't have a token.
    options.headers = addHeader(
      options.headers,
      'authorization',
      await getToken(origin, this.identity),
    )

    let response: Dispatcher.ResponseData | null = null
    try {
      response = await this.agent.request(
        options as Dispatcher.RequestOptions,
      )
      /* c8 ignore start */
    } catch (er) {
      // Rethrow so we get a better stack trace
      throw error('Request failed', {
        code: 'EREQUEST',
        cause: er,
        url,
        method,
      })
    }
    /* c8 ignore stop */

    const result = await this.#handleResponse(
      u,
      options,
      response,
      entry,
    )

    if (result.getHeader('integrity')) {
      trustIntegrity = true
    }

    if (result.isGzip && !trustIntegrity) {
      result.checkIntegrity({ url })
    }
    if (useCache) {
      // Get the encoded buffer from the cache entry
      const buffer = result.encode()
      this.cache.set(
        key,
        Buffer.from(
          buffer.buffer,
          buffer.byteOffset,
          buffer.byteLength,
        ),
        {
          integrity: result.integrity,
        },
      )
    }
    return result
  }

  async #handleResponse(
    url: URL,
    options: RegistryClientRequestOptions,
    response: Dispatcher.ResponseData,
    entry?: CacheEntry,
  ): Promise<CacheEntry> {
    if (handle304Response(response, entry)) return entry

    if (response.statusCode === 401) {
      const repeatRequest = await otplease(this, options, response)
      if (repeatRequest) return await this.request(url, repeatRequest)
    }

    const h: Uint8Array[] = []
    for (const [key, value] of Object.entries(response.headers)) {
      /* c8 ignore start - theoretical */
      if (Array.isArray(value)) {
        h.push(
          getEncondedValue(key),
          getEncondedValue(value.join(', ')),
        )
        /* c8 ignore stop */
      } else if (typeof value === 'string') {
        h.push(getEncondedValue(key), getEncondedValue(value))
      }
    }

    const { integrity, trustIntegrity } = options
    const result = new CacheEntry(
      /* c8 ignore next - should always have a status code */
      response.statusCode || 200,
      h,
      {
        integrity,
        trustIntegrity,
        'stale-while-revalidate-factor':
          this.staleWhileRevalidateFactor,
        contentLength:
          response.headers['content-length'] ?
            Number(response.headers['content-length'])
          : /* c8 ignore next */ undefined,
      },
    )

    if (isRedirect(result)) {
      response.body.resume()
      const [nextURL, nextOptions] = redirect(options, result, url)
      if (nextOptions && nextURL) {
        return await this.request(nextURL, nextOptions)
      }
      return result
    }

    response.body.on('data', (chunk: Uint8Array) =>
      result.addBody(chunk),
    )
    return await new Promise<CacheEntry>((res, rej) => {
      response.body.on('error', rej)
      response.body.on('end', () => res(result))
    })
  }
}
