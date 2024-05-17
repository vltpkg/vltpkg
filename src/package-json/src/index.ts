import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { error } from '@vltpkg/error-cause'
import { Manifest, asManifest } from '@vltpkg/types'
import { parse } from 'polite-json'

export class PackageJson {
  /**
   * Reads and parses contents of a `package.json` file at a directory `dir`.
   */
  localPackageJsonCache: Map<string, Manifest> = new Map()

  read(dir: string): Manifest {
    const cachedPackageJson = this.localPackageJsonCache.get(dir)
    if (cachedPackageJson) {
      return cachedPackageJson
    }

    const filename = resolve(dir, 'package.json')
    let content: string = ''
    try {
      content = readFileSync(filename, { encoding: 'utf8' })
    } catch (err) {
      throw error('Could not read package.json file', {
        path: filename,
        cause: err as Error,
      })
    }

    let res: Manifest
    try {
      res = asManifest(parse(content))
    } catch (err) {
      throw error('Invalid package.json file', {
        path: filename,
        cause: err as Error,
      })
    }

    this.localPackageJsonCache.set(dir, res)
    return res
  }
}
