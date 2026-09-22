/**
 * Normalize a registry URL into a stable key that preserves the
 * path prefix.  The result is `origin + pathname` with trailing
 * slashes stripped so that
 *   `https://r.io/luke/`  and  `https://r.io/luke`
 * both produce the same key.
 *
 * For plain-origin registries the result is identical to the old
 * `new URL(url).origin` behaviour (e.g. `https://registry.npmjs.org`).
 *
 * Kept out of `./auth.ts` so `./registry-error.ts`, which the install path
 * imports as a subpath, can key a URL without pulling in the keychain.
 */
export const normalizeRegistryKey = (url: string): string => {
  const u = new URL(url)
  return (u.origin + u.pathname).replace(/\/+$/, '')
}
