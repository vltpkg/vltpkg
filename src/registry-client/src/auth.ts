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

/**
 * Ensure a registry URL ends with `/` so that `new URL(path, base)`
 * appends under the full path instead of replacing the last segment.
 *
 *   registryBase('https://r.io/scope/name')
 *   // → 'https://r.io/scope/name/'
 */
export const registryBase = (url: string): string =>
  url.endsWith('/') ? url : url + '/'

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

/**
 * Delete the token for `registry`. With `token`, also delete every other
 * key holding it: one login can save a token under many registries.
 */
export const deleteToken = async (
  registry: string,
  identity: string,
  token?: Token,
): Promise<void> => {
  const kc = getKC(identity)
  await kc.load()
  kc.delete(normalizeRegistryKey(registry))
  if (token) {
    for (const key of kc.keysSync()) {
      if (kc.getSync(key) === token) kc.delete(key)
    }
  }
  await kc.save()
}

export const setToken = async (
  registry: string,
  token: Token,
  identity: string,
): Promise<void> => {
  const kc = getKC(identity)
  await kc.load()
  kc.set(normalizeRegistryKey(registry), token)
  await kc.save()
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

/** Configured registry URLs, by config option name. */
export type RegistryURLs = {
  registry?: string
  registries?: Record<string, string>
  'scoped-registries'?: Record<string, string>
  'jsr-registries'?: Record<string, string>
}

/**
 * Normalized, deduped keys of the configured registries.
 * Unparseable URLs are skipped.
 */
export const registryKeys = (o: RegistryURLs): string[] => [
  ...new Set(
    [
      o.registry,
      ...Object.values(o.registries ?? {}),
      ...Object.values(o['scoped-registries'] ?? {}),
      ...Object.values(o['jsr-registries'] ?? {}),
    ]
      .filter((u): u is string => !!u && URL.canParse(u))
      .map(normalizeRegistryKey),
  ),
]

/**
 * Find the best matching token for a request URL by performing a
 * longest-prefix match against all known registry keys (runtime
 * tokens, `VLT_REGISTRY`, keychain entries, and `keys`: normalized
 * configured registry keys, e.g. from {@link registryKeys}). A key
 * that resolves no token is skipped.
 *
 * `VLT_TOKEN_<key>` env vars are only read for a known key: their
 * names are lossy (`.`, `-`, `/` all become `_`), so probing them by
 * request URL would hand the token to lookalike hosts.
 *
 * Used by `RegistryClient.request()`, which has the request URL, not
 * the registry URL it was built from.
 */
export const getTokenByURL = async (
  requestUrl: string,
  identity: string,
  keys: readonly string[] = [],
): Promise<Token | undefined> => {
  const normalized = normalizeRegistryKey(requestUrl)

  // Collect all known registry keys.
  const candidates: string[] = [...runtimeTokens.keys(), ...keys]

  const envReg = process.env.VLT_REGISTRY
  if (envReg) {
    candidates.push(normalizeRegistryKey(envReg))
  }

  const kc = getKC(identity)

  // Keychain entries
  for (const k of await kc.keys()) {
    candidates.push(k)
  }

  // Longest candidate key that is a prefix of the normalized request
  // URL and has a token (VLT_REGISTRY may have none).
  const matches = candidates
    .filter(c => normalized === c || normalized.startsWith(c + '/'))
    .sort((a, b) => b.length - a.length)
  for (const key of matches) {
    const tok = await getToken(key, identity)
    if (tok) return tok
  }
}
