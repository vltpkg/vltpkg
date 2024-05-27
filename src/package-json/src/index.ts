import { error, ErrorCauseObject } from '@vltpkg/error-cause'
import { asManifest, Manifest } from '@vltpkg/types'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'polite-json'

export class PackageJson {
  /**
   * cache of `package.json` loads
   */
  cache: Map<string, Manifest> = new Map()

  /**
   * cache of load errors
   */
  errCache: Map<string, ErrorCauseObject> = new Map()

  /**
   * Reads and parses contents of a `package.json` file at a directory `dir`.
   */
  read(dir: string): Manifest {
    const cachedPackageJson = this.cache.get(dir)
    if (cachedPackageJson) {
      return cachedPackageJson
    }

    const filename = resolve(dir, 'package.json')

    const fail = (err: ErrorCauseObject) =>
      error('Could not read package.json file', err, this.read)

    const cachedError = this.errCache.get(dir)
    if (cachedError) {
      throw fail(cachedError as ErrorCauseObject)
    }

    try {
      const res: Manifest = asManifest(
        parse(readFileSync(filename, { encoding: 'utf8' })),
      )
      this.cache.set(dir, res)
      return res
    } catch (err) {
      const ec: ErrorCauseObject = {
        path: filename,
        cause: err as Error,
      }
      this.errCache.set(dir, ec)
      throw fail(ec)
    }
  }
}
