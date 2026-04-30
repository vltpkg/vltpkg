import { Keychain } from '@vltpkg/keychain'

export type Token = `Bearer ${string}` | `Basic ${string}`

/**
 * Normalize a registry URL into a stable key that preserves the
 * path prefix.  The result is `origin + pathname` with trailing
 * slashes stripped so that
 *   `https://r.io/luke/`  and  `https://r.io/luke`
 * both produce the same key.
 *
 * For plain-origin registries the result is identical to the old
 * `new URL(url).origin` behaviour (e.g. `https://registry.npmjs.org`).
 */
export const normalizeRegistryKey = (url: string): string => {
  const u = new URL(url)
  return (u.origin + u.pathname).replace(/\/+$/, '')
}

// just exported for testing
export const keychains = new Map<string, Keychain<Token>>()

/**
 * In-memory token store for OIDC-exchanged tokens.
 * These take precedence over env vars and keychain.
 */
export const runtimeTokens = new Map<string, Token>()

export const setRuntimeToken = (registry: string, token: Token) => {
  runtimeTokens.set(normalizeRegistryKey(registry), token)
}

export const clearRuntimeTokens = () => {
  runtimeTokens.clear()
}

export const getKC = (identity: string) => {
  const kc = keychains.get(identity)
  if (kc) return kc
  const i = identity ? `vlt/auth/${identity}` : 'vlt/auth'
  const nkc = new Keychain<Token>(i)
  keychains.set(identity, nkc)
  return nkc
}

export const isToken = (t: any): t is Token =>
  typeof t === 'string' &&
  (t.startsWith('Bearer ') || t.startsWith('Basic '))

export const deleteToken = async (
  registry: string,
  identity: string,
): Promise<void> => {
  const kc = getKC(identity)
  await kc.load()
  kc.delete(normalizeRegistryKey(registry))
  await kc.save()
}

export const setToken = async (
  registry: string,
  token: Token,
  identity: string,
): Promise<void> => {
  const kc = getKC(identity)
  return kc.set(normalizeRegistryKey(registry), token)
}

export const getToken = async (
  registry: string,
  identity: string,
): Promise<Token | undefined> => {
  const kc = getKC(identity)
  const key = normalizeRegistryKey(registry)

  // Runtime tokens (e.g. from OIDC exchange) take precedence
  const rt = runtimeTokens.get(key)
  if (rt) return rt

  const envReg = process.env.VLT_REGISTRY
  if (envReg && key === normalizeRegistryKey(envReg)) {
    const envTok = process.env.VLT_TOKEN
    if (envTok) return `Bearer ${envTok}`
  }
  const tok =
    process.env[`VLT_TOKEN_${key.replace(/[^a-zA-Z0-9]+/g, '_')}`]
  if (tok) return `Bearer ${tok}`
  return kc.get(key)
}

/**
 * Find the best matching token for a request URL by performing a
 * longest-prefix match against all known registry keys (runtime
 * tokens, env-var registries, and keychain entries).
 *
 * This is used by `RegistryClient.request()` which only has the
 * full request URL — not the configured registry URL that was used
 * to construct it.
 */
export const getTokenByURL = async (
  requestUrl: string,
  identity: string,
): Promise<Token | undefined> => {
  const normalized = normalizeRegistryKey(requestUrl)

  // Collect all known registry keys.
  const candidates: string[] = [...runtimeTokens.keys()]

  const envReg = process.env.VLT_REGISTRY
  if (envReg) {
    candidates.push(normalizeRegistryKey(envReg))
  }

  const kc = getKC(identity)

  // Keychain entries
  for (const k of await kc.keys()) {
    candidates.push(k)
  }

  // Find the longest candidate key that is a prefix of the
  // normalized request URL.
  let bestKey: string | undefined
  let bestLen = 0
  for (const candidate of candidates) {
    if (
      candidate.length > bestLen &&
      (normalized === candidate ||
        normalized.startsWith(candidate + '/'))
    ) {
      bestKey = candidate
      bestLen = candidate.length
    }
  }

  if (bestKey) {
    return getToken(bestKey, identity)
  }

  // Fall back to origin-only match (handles VLT_TOKEN_* env vars
  // which we can't enumerate by URL).
  return getToken(requestUrl, identity)
}
