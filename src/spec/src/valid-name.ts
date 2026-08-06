import { error } from '@vltpkg/error-cause'

/**
 * A package name that is safe to use as a filesystem path segment.
 *
 * Rejects: empty, absolute (`/x`, `\x`, `C:x`), any `/` outside a
 * well-formed `@scope/name`, any `\`, control characters and NUL, `.` or
 * `..` in either segment, and the reserved store dirs `node_modules` and
 * `.vlt`. Allows legacy-ugly but harmless names: leading `_`, uppercase,
 * spaces, non-ASCII, `~`.
 */
const pathSafeName =
  /^(?!(?:node_modules|\.vlt)$)(?![A-Za-z]:)(?:@(?!\.\.?\/)[^/\\\x00-\x1f\x7f]+\/)?(?!\.\.?$)[^/\\\x00-\x1f\x7f]+$/i

/**
 * Is a given value usable as a filesystem path segment?
 */
export const isPathSafeName = (name: unknown): boolean =>
  typeof name === 'string' && pathSafeName.test(name)

/**
 * Throw unless `name` is usable as a filesystem path segment. `from` is
 * the actionable origin of the name: a tarball URL, git spec, or manifest
 * path.
 */
export const assertPathSafeName = (
  name: unknown,
  from?: string,
): void => {
  if (isPathSafeName(name)) return
  throw error(
    'Invalid package name: not usable as a path segment',
    {
      code: 'EINVALIDNAME',
      found: name,
      from,
      wanted: 'a single path segment, or a well-formed @scope/name',
    },
    assertPathSafeName,
  )
}
