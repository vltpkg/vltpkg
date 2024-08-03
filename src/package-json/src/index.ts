import { error, ErrorCauseObject } from '@vltpkg/error-cause'
import { asManifest, Manifest } from '@vltpkg/types'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse, stringify } from 'polite-json'

export class PackageJson {
  /**
   * cache of `package.json` loads
   */
  #cache: Map<string, Manifest> = new Map()

  /**
   * cache of `package.json` paths by manifest
   */
  #pathCache: Map<Manifest, string> = new Map()

  /**
   * cache of load errors
   */
  #errCache: Map<string, ErrorCauseObject> = new Map()

  /**
   * Reads and parses contents of a `package.json` file at a directory `dir`.
   * `reload` will optionally skip reading from the cache when set to `true`.
   */
  read(dir: string, { reload }: { reload?: boolean } = {}): Manifest {
    const cachedPackageJson = !reload && this.#cache.get(dir)
    if (cachedPackageJson) {
      return cachedPackageJson
    }

    const filename = resolve(dir, 'package.json')

    const fail = (err: ErrorCauseObject) =>
      error('Could not read package.json file', err, this.read)

    const cachedError = !reload && this.#errCache.get(dir)
    if (cachedError) {
      throw fail(cachedError as ErrorCauseObject)
    }

    try {
      const res: Manifest = asManifest(
        parse(readFileSync(filename, { encoding: 'utf8' })),
      )
      this.#cache.set(dir, res)
      this.#pathCache.set(res, dir)
      return res
    } catch (err) {
      const ec: ErrorCauseObject = {
        path: filename,
        cause: err as Error,
      }
      this.#errCache.set(dir, ec)
      throw fail(ec)
    }
  }

  write(dir: string, manifest: Manifest): void {
    const filename = resolve(dir, 'package.json')

    try {
      // This assumes kIndent and kNewline are already present on the manifest because we would
      // only write a package.json after reading it which will set those properties.
      writeFileSync(filename, stringify(manifest))
      this.#cache.set(dir, manifest)
      this.#pathCache.set(manifest, dir)
    } catch (err) {
      // If there was an error writing to this package.json then also delete it from our cache
      // just in case a future read would get stale data.
      this.#cache.delete(dir)
      this.#pathCache.delete(manifest)
      throw error(
        'Could not write package.json file',
        {
          path: filename,
          cause: err as Error,
        },
        this.write,
      )
    }
  }

  save(manifest: Manifest): void {
    const dir = this.#pathCache.get(manifest)
    if (!dir) {
      throw error(
        'Could not save manifest',
        {
          manifest,
        },
        this.save,
      )
    }
    this.write(dir, manifest)
  }
}
