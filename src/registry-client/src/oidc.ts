import { request } from 'undici'
import type { Token } from './auth.ts'
import { setRuntimeToken } from './auth.ts'

export type OidcOptions = {
  /** The package name being published, e.g. `@scope/name` */
  packageName: string
  /** The full registry URL, e.g. `https://registry.npmjs.org/` */
  registry: string
}

const log = (...args: unknown[]) =>
  // eslint-disable-next-line no-console
  console.error('[vlt:oidc]', ...args)

/**
 * Safely parse a JSON response body, returning undefined on failure.
 */
const safeJson = async (
  res: Awaited<ReturnType<typeof request>>,
): Promise<Record<string, unknown> | undefined> => {
  try {
    return (await res.body.json()) as Record<string, unknown>
    /* c8 ignore next 3 - defensive: non-JSON response body */
  } catch {
    return undefined
  }
}

/**
 * Keys that are always replaced with '[REDACTED]' before logging.
 */
const SENSITIVE_KEYS = new Set([
  'token',
  'value',
  'secret',
  'key',
])

/**
 * Recursively redact sensitive fields from a value before logging.
 * Works as a JSON.stringify replacer so nested objects are handled
 * automatically — no sensitive value is ever serialised.
 */
const redact = (
  obj: Record<string, unknown>,
): Record<string, unknown> =>
  JSON.parse(
    JSON.stringify(obj, (k, v: unknown) =>
      SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v,
    ),
  ) as Record<string, unknown>

/**
 * Detect CI environment and exchange an OIDC ID token for a
 * registry auth token. Sets the token into the runtime token
 * store so subsequent requests are authenticated.
 *
 * This function **never throws**. OIDC is always optional — if
 * it is unavailable or any step fails the function returns
 * `undefined` silently.
 */
export const oidc = async (
  opts: OidcOptions,
): Promise<Token | undefined> => {
  try {
    return await _oidc(opts)
  } catch (err) /* c8 ignore start - defensive */ {
    log(
      'Unexpected error:',
      err instanceof Error ? err.message : String(err),
    )
    return undefined
  } /* c8 ignore stop */
}

const _oidc = async ({
  packageName,
  registry,
}: OidcOptions): Promise<Token | undefined> => {
  const isGitHub = process.env.GITHUB_ACTIONS === 'true'
  const isGitLab = process.env.GITLAB_CI === 'true'
  const isCircle = process.env.CIRCLECI === 'true'

  log(
    `CI detected: github=${isGitHub} gitlab=${isGitLab} circle=${isCircle}`,
  )

  if (!isGitHub && !isGitLab && !isCircle) {
    log('Not in a supported CI environment — skipping')
    return undefined
  }

  // NPM_ID_TOKEN is supported as an override in all CI environments
  let idToken = process.env.NPM_ID_TOKEN
  log(
    `NPM_ID_TOKEN: ${idToken ? `set (length=${idToken.length})` : 'not set'}`,
  )

  if (!idToken && isGitHub) {
    idToken = await fetchGitHubIdToken(registry)
  }

  if (!idToken) {
    log('No ID token available — skipping')
    return undefined
  }

  const token = await exchangeToken(idToken, packageName, registry)

  if (token) {
    setRuntimeToken(registry, token)
    log(`Token set for registry ${registry}`)
  } else {
    log('Token exchange did not return a token')
  }

  return token
}

/**
 * Fetch an OIDC ID token from GitHub Actions.
 * Requires `id-token: write` permission in the workflow.
 */
const fetchGitHubIdToken = async (
  registry: string,
): Promise<string | undefined> => {
  const requestUrl = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN

  log(
    `ACTIONS_ID_TOKEN_REQUEST_URL: ${requestUrl ? `set (length=${requestUrl.length})` : 'not set — skipping (missing id-token permissions?)'}`,
  )
  log(
    `ACTIONS_ID_TOKEN_REQUEST_TOKEN: ${requestToken ? 'set' : 'not set'}`,
  )

  if (!requestUrl || !requestToken) {
    return undefined
  }

  const audience = `npm:${new URL(registry).hostname}`
  const url = new URL(requestUrl)
  url.searchParams.append('audience', audience)

  log(`Fetching GitHub ID token with audience ${audience}`)

  try {
    const res = await request(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${requestToken}`,
      },
    })
    log(`GitHub ID token response: status=${res.statusCode}`)
    if (res.statusCode !== 200) {
      const body = await safeJson(res)
      log(
        `GitHub ID token error body: ${body ? JSON.stringify(redact(body)) : '(non-JSON response)'}`,
      )
      return undefined
    }
    const json = await safeJson(res)
    const value = json?.value as string | undefined
    log(`GitHub ID token: hasValue=${!!value}`)
    return value || undefined
  } catch (err) /* c8 ignore start - network error */ {
    log(
      'GitHub ID token fetch error:',
      err instanceof Error ? err.message : String(err),
    )
    return undefined
  } /* c8 ignore stop */
}

/**
 * Exchange an OIDC ID token for an npm auth token via the
 * registry token exchange endpoint.
 */
const exchangeToken = async (
  idToken: string,
  packageName: string,
  registry: string,
): Promise<Token | undefined> => {
  // npm escaping: @scope/name → @scope%2Fname
  const escapedName = packageName.replace('/', '%2F')
  const exchangeUrl = new URL(
    `/-/npm/v1/oidc/token/exchange/package/${escapedName}`,
    registry,
  )

  log(`Exchanging token for package: ${packageName}`)
  log(`Exchange URL: ${exchangeUrl.href}`)

  try {
    const res = await request(exchangeUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${idToken}`,
      },
    })
    log(`Exchange response: status=${res.statusCode}`)
    if (res.statusCode !== 200) {
      const body = await safeJson(res)
      log(
        `Exchange error body: ${body ? JSON.stringify(redact(body)) : '(non-JSON response)'}`,
      )
      return undefined
    }
    const json = await safeJson(res)
    const hasToken = !!json?.token
    log(`Exchange result: hasToken=${hasToken}`)
    if (!json?.token || typeof json.token !== 'string') {
      return undefined
    }
    return `Bearer ${json.token}`
  } catch (err) /* c8 ignore start - network error */ {
    log(
      'Exchange request error:',
      err instanceof Error ? err.message : String(err),
    )
    return undefined
  } /* c8 ignore stop */
}
