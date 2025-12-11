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
  if (pkg.private) {
    return
  }
  const exports =
    'exports' in pkg && typeof pkg.exports === 'object' ?
      pkg.exports
    : null
  if (!exports) {
    return
  }
  return {
    // get readme local to workspace
    readme: join(cwd, './README.md'),
    // get entry points from package.json exports
    entryPoints: Object.values(exports)
      .map(p => (typeof p === 'string' ? p : p.import.default))
      .filter(p => !p.endsWith('package.json'))
      .map(p => (console.log(p), p))
      .map(p => join(cwd, p)),
  }
}
