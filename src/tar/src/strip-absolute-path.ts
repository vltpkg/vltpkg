import { win32 } from 'node:path'

/**
 * Iteratively strips absolute path roots from a path.
 * Returns a tuple of [stripped_root, remaining_path].
 *
 * This handles:
 * - Unix absolute paths: `/foo` -> ['/', 'foo']
 * - Multiple slashes: `////foo` -> ['////', 'foo']
 * - Windows absolute: `c:\foo` -> ['c:\', 'foo']
 * - Windows UNC: `\\server\share\foo` -> ['\\server\share\', 'foo']
 * - Chained roots: `c:\c:\d:\foo` -> ['c:\c:\d:\', 'foo']
 * - Windows long paths: `//?/C:/foo` -> ['//?/C:/', 'foo']
 * - Drive-relative: `c:foo` -> ['c:', 'foo']
 */
export const stripAbsolutePath = (path: string): [string, string] => {
  let root = ''
  let parsed = win32.parse(path)

  while (win32.isAbsolute(path) || parsed.root) {
    // For paths starting with `/` (but not `//?/` Windows long paths),
    // strip one `/` at a time to handle multiple slashes like `////foo`
    const r =
      path.startsWith('/') && !path.startsWith('//?/') ?
        '/'
      : parsed.root
    path = path.substring(r.length)
    root += r
    parsed = win32.parse(path)
  }

  return [root, path]
}
