import type { Codes } from '@vltpkg/error-cause'

const codes = new Set<Codes>(['EINVALIDNAME'])

/**
 * Is this error a path-safety verdict? Walks the cause chain, because
 * lower layers (eg `PackageJson.read`) re-wrap what they throw.
 */
export const isPathSecurityError = (er: unknown): boolean => {
  for (
    let e: unknown = er;
    e && typeof e === 'object';
    e = (e as { cause?: unknown }).cause
  ) {
    const { code } = e as { code?: unknown }
    if (typeof code === 'string' && codes.has(code as Codes))
      return true
  }
  return false
}
