import { Cache } from '@vltpkg/cache'
import { register as cacheUnzipRegister } from '@vltpkg/cache-unzip'
import { error } from '@vltpkg/error-cause'
import { asError } from '@vltpkg/types'
import { logRequest } from '@vltpkg/output'
import type { Integrity } from '@vltpkg/types'
import { urlOpen } from '@vltpkg/url-open'
import { XDG } from '@vltpkg/xdg'
import { randomUUID } from 'node:crypto'
import { availableParallelism } from 'node:os'
import { dirname, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { loadPackageJson } from 'package-json-from-dist'
import type { Agent, Dispatcher } from 'undici'
import { RetryAgent } from 'undici'
import { addHeader } from './add-header.ts'
import type { Token } from './auth.ts'
import {
  clearRuntimeTokens,
  deleteToken,
  getKC,
  getToken,
  getTokenByURL,
  isToken,
  keychains,
  normalizeRegistryKey,
  registryBase,
  runtimeTokens,
  setRuntimeToken,
  setToken,
} from './auth.ts'
import type { JSONObj } from './cache-entry.ts'
import { CacheEntry } from './cache-entry.ts'
import { register } from './cache-revalidate.ts'
import { bun, deno, node } from './env.ts'
import { handleCacheHitResponse } from './handle-304-response.ts'
import { otplease } from './otplease.ts'
import { getDispatcher } from './proxy.ts'
import { isRedirect, redirect } from './redirect.ts'
import { setCacheHeaders } from './set-cache-headers.ts'
import type { TokenResponse } from './token-response.ts'
import { getTokenResponse } from './token-response.ts'
import type { WebAuthChallenge } from './web-auth-challenge.ts'
import { getWebAuthChallenge } from './web-auth-challenge.ts'
import { collectHeaders, readBody } from './response.ts'
import { oidc } from './oidc.ts'
import type { OidcOptions } from './oidc.ts'
export {
  CacheEntry,
  clearRuntimeTokens,
  deleteToken,
  getKC,
  getToken,
  getTokenByURL,
  isToken,
  keychains,
  normalizeRegistryKey,
  oidc,
  registryBase,
  runtimeTokens,
  setRuntimeToken,
  setToken,
  type JSONObj,
  type OidcOptions,
  type Token,
  type TokenResponse,
  type WebAuthChallenge,
}

export type CacheableMethod = 'GET' | 'HEAD'
export const isCacheableMethod = (m: unknown): m is CacheableMethod =>
  m === 'GET' || m === 'HEAD'

export const cacheKey = (method: string, url: URL | string): string =>
  `${method !== 'GET' ? method + ' ' : ''}${url}`

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

// Agent-level knobs only. Do not spread these onto per-request options —
// connections/pipelining/keepAlive/connect are ignored at dispatch time,
// and bodyTimeout/headersTimeout would clobber caller overrides.
//
// Keep undici (not globalThis.fetch): fetch measured +56% user CPU and
// +90–140MB RSS on the same 753-body install workload.
// pipelining:1 is intentional — pipelining:10 had no measured CPU benefit
// and HOL-blocks packuments behind large tarballs; some CDNs drop pipelined
// requests.
// connections scales with reify's in-flight cap ((cores-1)*8, see
// src/graph/src/reify/index.ts) so tarball fetches don't queue behind
// the pool on many-core machines. The floor of 64 bounds cold-start TLS
// on small machines; the ceiling of 128 avoids connection storms and
// CDN throttling beyond what reify can consume.
// HTTP/2 (allowH2) is untested and unjustified while transport CPU is ~1/4
// of body handling.
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
  connections: Math.min(
    128,
    Math.max(64, (availableParallelism() - 1) * 8),
  ),
  pipelining: 1,
}

const xdg = new XDG('vlt')

const defaultCacheMaxSize = 256 * 1024 * 1024

const parseCacheMaxSize = (raw: string | undefined): number => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ?
      Math.floor(n)
    : defaultCacheMaxSize
}

export class RegistryClient {
  agent: RetryAgent
  cache: Cache
  identity: string
  staleWhileRevalidateFactor: number
  #session = randomUUID()
  #decoded = new WeakMap<Uint8Array, CacheEntry>()

  constructor(options: RegistryClientOptions) {
    const {
      cache = xdg.cache(),
      'fetch-retry-factor': timeoutFactor = 2,
      'fetch-retry-mintimeout': minTimeout = 0,
      'fetch-retry-maxtimeout': maxTimeout = 30_000,
      'fetch-retries': maxRetries = 3,
      identity = '',
      'stale-while-revalidate-factor':
        staleWhileRevalidateFactor = 576, // 48h for a 5min cache
    } = options
    this.identity = identity
    this.staleWhileRevalidateFactor = staleWhileRevalidateFactor
    const path = resolve(cache, 'registry-client')
    this.cache = new Cache({
      path,
      maxSize: parseCacheMaxSize(process.env.VLT_CACHE_MAX_SIZE),
      onDiskWrite(_path, key, data) {
        if (CacheEntry.isGzipEntry(data)) {
          cacheUnzipRegister(path, key)
        }
      },
    })
    const dispatch = getDispatcher(agentOptions)
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

    const base = registryBase(registry)
    const tokensUrl = new URL('-/npm/v1/tokens', base)
    const record = await this.seek<{
      key: string
      token: string
    }>(tokensUrl, ({ token }) => s.startsWith(token), {
      useCache: false,
    }).catch(() => undefined)

    if (record) {
      const { key } = record
      await this.request(
        new URL(`-/npm/v1/tokens/token/${key}`, base),
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
    const webLoginURL = new URL('-/v1/login', registryBase(registry))
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

  #decodeCached(buffer: Uint8Array): CacheEntry | undefined {
    const hit = this.#decoded.get(buffer)
    if (hit) return hit
    const entry = CacheEntry.decode(buffer, {
      'stale-while-revalidate-factor':
        this.staleWhileRevalidateFactor,
    })
    // statusCode 0 == undecodable, and a cached JSON body that fails
    // to parse is corrupt. Treat both as a total miss: the caller
    // refetches without conditional headers, so a fresh response
    // overwrites the bad entry rather than a 304 re-blessing it.
    if (!entry.statusCode) return undefined
    if (entry.isJSON) {
      try {
        entry.json()
      } catch {
        return undefined
      }
      this.#decoded.set(buffer, entry)
    }
    return entry
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

    // Method + URL only. Headers (including accept) are not part of the
    // key and there is no Vary handling — callers must not vary the
    // response representation for the same URL.
    const key = cacheKey(method, u)
    const buffer =
      useCache ?
        await this.cache.fetch(key, { context: { integrity } })
      : undefined

    const entry = buffer ? this.#decodeCached(buffer) : undefined
    if (entry?.valid) {
      logRequest(url, 'cache', { method })
      return entry
    }

    if (staleWhileRevalidate && entry?.staleWhileRevalidate && m) {
      // revalidate while returning the stale entry
      register(dirname(this.cache.path()), m, url)
      logRequest(url, 'stale', { method })
      return entry
    }

    logRequest(url, 'start', { method })
    const requestStart = Date.now()

    // either no cache entry, or need to revalidate before use.
    setCacheHeaders(options, entry)

    redirections.add(String(url))

    // eslint-disable-next-line @typescript-eslint/no-deprecated -- deprecated for callers; this is the one place that sets it
    options.path = u.pathname.replace(/\/+$/, '') + u.search
    options.origin = u.origin
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
      this.#session,
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
      await getTokenByURL(String(u), this.identity),
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

    logRequest(
      url,
      response.statusCode === 304 ? '304' : 'complete',
      {
        method,
        statusCode: response.statusCode,
        durationMs: Date.now() - requestStart,
      },
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
    if (handleCacheHitResponse(response, entry)) return entry

    let consumedBody: string | undefined
    if (response.statusCode === 401) {
      const otpResult = await otplease(this, options, response)
      if (otpResult && 'retry' in otpResult) {
        return await this.request(url, otpResult.retry)
      }
      if (otpResult && 'bodyConsumed' in otpResult) {
        consumedBody = otpResult.bodyConsumed
      }
    }

    const h = collectHeaders(response)

    const { integrity, trustIntegrity } = options

    // When otplease already consumed the body, use its length
    // instead of the Content-Length header to size the CacheEntry
    // buffer correctly.
    const contentLength =
      consumedBody !== undefined ? consumedBody.length
      : response.headers['content-length'] ?
        Number(response.headers['content-length'])
      : /* c8 ignore next */ undefined

    const result = new CacheEntry(
      /* c8 ignore next - should always have a status code */
      response.statusCode || 200,
      h,
      {
        integrity,
        trustIntegrity,
        'stale-while-revalidate-factor':
          this.staleWhileRevalidateFactor,
        contentLength,
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

    // If otplease already consumed the body (e.g. checking for OTP
    // prompt on a plain 401), use the text it read rather than trying
    // to re-read from the already-drained stream.
    if (consumedBody !== undefined) {
      if (consumedBody.length > 0) {
        result.addBody(new TextEncoder().encode(consumedBody))
      }
      return result
    }

    return await readBody(response, result)
  }
}
