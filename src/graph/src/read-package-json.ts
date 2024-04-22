import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let localPackageJsonCache = new Map()

/**
 * Reads and parses contents of a `package.json` file at a directory `dir`.
 */
export const readPackageJson = (
  dir: string,
): Record<string, string> => {
  const cachedPackageJson = localPackageJsonCache.get(dir)
  if (cachedPackageJson) {
    return cachedPackageJson
  }
  const filename = resolve(dir, 'package.json')
  const content = readFileSync(filename, { encoding: 'utf8' })
  const res = JSON.parse(content)
  localPackageJsonCache.set(dir, res)
  return res
}
