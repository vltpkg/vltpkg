// @ts-check
import { join } from 'node:path'
import { readFileSync } from 'node:fs'

/**
 * @param {string} cwd
 * @returns {Record<string, unknown>}
 */
const readPkg = cwd => {
  try {
    return JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
  } catch {
    return {}
  }
}

/**
 * @param {string} cwd
 * @returns {undefined | Partial<import('typedoc').TypeDocOptions>}
 */
export default cwd => {
  const pkg = readPkg(cwd)
  // Private workspaces are not included in the docs site.

  if (pkg.private) {
    return
  }

  const exports =
    'exports' in pkg && typeof pkg.exports === 'object' ?
      pkg.exports
    : null

  // get actual code entry points from package.json exports
  const entryPoints = Object.values(exports ?? {})
    .map(p => (typeof p === 'string' ? p : p.import.default))
    .filter(p => !p.endsWith('package.json'))
    .map(p => join(cwd, p))

  // If there are no entry points (like the gui) then it means to skip this workspace.
  if (entryPoints.length === 0) {
    return
  }

  return {
    // get readme local to workspace
    readme: join(cwd, './README.md'),
    entryPoints,
  }
}
