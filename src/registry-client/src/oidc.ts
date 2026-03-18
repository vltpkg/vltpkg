import { request } from 'undici'
import type { Token } from './auth.ts'
import { setRuntimeToken } from './auth.ts'

export type OidcOptions = {
  /** The package name being published, e.g. `@scope/name` */
  packageName: string
  /** The full registry URL, e.g. `https://registry.npmjs.org/` */
  registry: string
}

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
    /* c8 ignore next 3 - defensive */
  } catch {
    return undefined
  }
}

const _oidc = async ({
  packageName,
  registry,
}: OidcOptions): Promise<Token | undefined> => {
  const isGitHub = process.env.GITHUB_ACTIONS === 'true'
  const isGitLab = process.env.GITLAB_CI === 'true'
  const isCircle = process.env.CIRCLECI === 'true'

  if (!isGitHub && !isGitLab && !isCircle) {
    return undefined
  }

  // NPM_ID_TOKEN is supported as an override in all CI environments
  let idToken = process.env.NPM_ID_TOKEN

  if (!idToken && isGitHub) {
    idToken = await fetchGitHubIdToken(registry)
  }

  if (!idToken) {
    return undefined
  }

  const token = await exchangeToken(idToken, packageName, registry)

  if (token) {
    setRuntimeToken(registry, token)
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

  if (!requestUrl || !requestToken) {
    return undefined
  }

  const audience = `npm:${new URL(registry).hostname}`
  const url = new URL(requestUrl)
  url.searchParams.append('audience', audience)

  try {
    const res = await request(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${requestToken}`,
      },
    })
    if (res.statusCode !== 200) {
      return undefined
    }
    const json = (await res.body.json()) as {
      value?: string
    }
    return json.value || undefined
    /* c8 ignore next 3 - network error */
  } catch {
    return undefined
  }
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

  try {
    const res = await request(exchangeUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${idToken}`,
      },
    })
    if (res.statusCode !== 200) {
      return undefined
    }
    const json = (await res.body.json()) as {
      token?: string
    }
    if (!json.token) {
      return undefined
    }
    return `Bearer ${json.token}`
    /* c8 ignore next 3 - network error */
  } catch {
    return undefined
  }
}
