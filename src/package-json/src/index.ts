import { error } from '@vltpkg/error-cause'
import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import { asManifest, longDependencyTypes } from '@vltpkg/types'
import type { Manifest } from '@vltpkg/types'
import { readFileSync, writeFileSync, lstatSync } from 'node:fs'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import { parse, stringify } from 'polite-json'
import { walkUp } from 'walk-up-path'

const exists = (path: string): boolean => {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

export class PackageJson {
  /**
   * cache of `package.json` loads
   */
  #cache = new Map<string, Manifest>()

  /**
   * cache of `package.json` paths by manifest
   */
  #pathCache = new Map<Manifest, string>()

  /**
   * cache of load errors
   */
  #errCache = new Map<string, ErrorCauseOptions>()

  /**
   * Reads and parses contents of a `package.json` file at a directory `dir`.
   * `reload` will optionally skip reading from the cache when set to `true`.
   */
  read(dir: string, { reload }: { reload?: boolean } = {}): Manifest {
    const cachedPackageJson = !reload && this.#cache.get(dir)
    if (cachedPackageJson) {
      return cachedPackageJson
    }

    const filename =
      dir.endsWith('package.json') ?
        resolve(dir)
      : resolve(dir, 'package.json')

    const fail = (err: ErrorCauseOptions) =>
      error('Could not read package.json file', err, this.read)

    const cachedError = !reload && this.#errCache.get(dir)
    if (cachedError) {
      throw fail(cachedError)
    }

    try {
      const res: Manifest = asManifest(
        parse(readFileSync(filename, { encoding: 'utf8' })),
      )
      this.#cache.set(dir, res)
      this.#pathCache.set(res, dir)
      return res
    } catch (err) {
      const ec: ErrorCauseOptions = {
        path: filename,
        cause: err,
      }
      this.#errCache.set(dir, ec)
      throw fail(ec)
    }
  }

  write(dir: string, manifest: Manifest, indent?: number): void {
    const filename =
      dir.endsWith('package.json') ?
        resolve(dir)
      : resolve(dir, 'package.json')
    this.fix(manifest)

    try {
      // This assumes kIndent and kNewline are already present on the manifest because we would
      // only write a package.json after reading it which will set those properties.
      writeFileSync(filename, stringify(manifest, undefined, indent))
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
          cause: err,
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

  fix(manifest: Manifest): void {
    for (const depType of longDependencyTypes) {
      const deps = manifest[depType]
      if (deps) {
        // should sort dependencies by name
        manifest[depType] = Object.fromEntries(
          Object.entries(deps).sort(([a], [b]) =>
            a.localeCompare(b, 'en'),
          ),
        )
      }
    }
  }

  /**
   * Walks up the directory tree from the current working directory
   * and returns the path to the first `package.json` file found.
   * Returns undefined if no package.json is found.
   */
  find(
    cwd: string = process.cwd(),
    home: string = homedir(),
  ): string | undefined {
    for (const dir of walkUp(cwd)) {
      // don't look in home directory
      if (dir === home) break

      const packageJsonPath = resolve(dir, 'package.json')
      if (exists(packageJsonPath)) {
        return packageJsonPath
      }
    }
  }
}
