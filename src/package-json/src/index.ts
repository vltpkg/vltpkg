import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { error } from '@vltpkg/error-cause'
import { Manifest, asManifest } from '@vltpkg/types'
import { parse } from 'polite-json'

export class PackageJson {
  /**
   * Reads and parses contents of a `package.json` file at a directory `dir`.
   */
  cache: Map<string, Manifest> = new Map()

  read(dir: string): Manifest {
    const cachedPackageJson = this.cache.get(dir)
    if (cachedPackageJson) {
      return cachedPackageJson
    }

    const filename = resolve(dir, 'package.json')
    try {
      const res: Manifest = asManifest(
        parse(readFileSync(filename, { encoding: 'utf8' })),
      )
      this.cache.set(dir, res)
      return res
    } catch (err) {
      throw error('Could not read package.json file', {
        path: filename,
        cause: err as Error,
      })
    }
  }
}
