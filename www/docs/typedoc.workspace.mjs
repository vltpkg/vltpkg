// @ts-check
import { join } from 'path'
import { readFileSync } from 'fs'

/**
 * @param {string} cwd
 * @return {Record<string, unknown>}
 */
const readPkg = cwd => {
  try {
    return JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'))
  } catch {
    return {}
  }
}

/** @param {string} cwd */
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
  return {
    readme: join(cwd, './README.md'),
    entryPoints: Object.values(exports ?? {})
      .filter(p => !p.endsWith('package.json'))
      .map(p => join(cwd, p)),
  }
}
