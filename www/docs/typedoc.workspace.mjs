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
  const tshy =
    pkg.tshy && typeof pkg.tshy === 'object' ? pkg.tshy : {}
  const exports =
    'exports' in tshy && typeof tshy.exports === 'object' ?
      tshy.exports
    : null
  if (!exports) {
    return
  }
  return {
    // get readme local to workspace
    readme: join(cwd, './README.md'),
    // get entry points from package.json exports
    entryPoints: Object.values(exports)
      .filter(p => !p.endsWith('package.json'))
      .map(p => join(cwd, p)),
  }
}
