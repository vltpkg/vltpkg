import { error } from '@vltpkg/error-cause'
import type { ErrorCauseOptions } from '@vltpkg/error-cause'
import {
  asManifest,
  longDependencyTypes,
  normalizeManifest,
} from '@vltpkg/types'
import type { NormalizedManifest } from '@vltpkg/types'
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
  #cache = new Map<string, NormalizedManifest>()

  /**
   * cache of `package.json` paths by manifest
   */
  #pathCache = new Map<NormalizedManifest, string>()

  /**
   * cache of load errors
   */
  #errCache = new Map<string, ErrorCauseOptions>()

  /**
   * `package.json` files read successfully, by filename
   */
  #read = new Set<string>()

  /**
   * Reads and parses contents of a `package.json` file at a directory `dir`.
   * `reload` will optionally skip reading from the cache when set to `true`.
   */
  read(
    dir: string,
    { reload }: { reload?: boolean } = {},
  ): NormalizedManifest {
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
      const res = normalizeManifest(
        asManifest(
          parse(readFileSync(filename, { encoding: 'utf8' })),
        ),
        filename,
      )
      this.#cache.set(dir, res)
      this.#pathCache.set(res, dir)
      this.#read.add(filename)
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

  /**
   * Optionally reads and parses contents of a `package.json` file at a
   * directory `dir`. Returns `undefined` if it could not be read.
   */
  maybeRead(
    dir: string,
    { reload }: { reload?: boolean } = {},
  ): NormalizedManifest | undefined {
    try {
      return this.read(dir, { reload })
    } catch {
      return undefined
    }
  }

  write(
    dir: string,
    manifest: NormalizedManifest,
    indent?: number,
  ): void {
    const filename =
      dir.endsWith('package.json') ?
        resolve(dir)
      : resolve(dir, 'package.json')
    this.fix(manifest)

    try {
      // This assumes kIndent and kNewline are already present on the manifest because we would
      // only write a package.json after reading it which will set those properties.
      writeFileSync(
        filename,
        stringify(this.#merge(filename, manifest), undefined, indent),
      )
      this.#cache.set(dir, manifest)
      this.#pathCache.set(manifest, dir)
      // a read that failed before this write is no longer valid
      this.#errCache.delete(dir)
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

  /**
   * The file's own content, with the top-level keys whose normalized
   * value the caller changed taken from `manifest`, so every other field
   * keeps its shape. Files never read are written as given.
   */
  #merge(filename: string, manifest: NormalizedManifest) {
    if (!this.#read.has(filename)) return manifest
    const text = readFileSync(filename, { encoding: 'utf8' })
    const data = parse(text) as Record<string, unknown>
    const before: Record<string, unknown> = normalizeManifest(
      asManifest(parse(text)),
      filename,
    )
    const after: Record<string, unknown> = manifest
    for (const key of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ])) {
      const value = after[key]
      if (JSON.stringify(value) === JSON.stringify(before[key]))
        continue
      if (value === undefined) delete data[key]
      else data[key] = value
    }
    return data
  }

  save(manifest: NormalizedManifest): void {
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

  fix(manifest: NormalizedManifest): void {
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
