import { error } from '@vltpkg/error-cause'
import { isManifest, normalizeBinPaths } from '@vltpkg/types'
import type { Manifest } from '@vltpkg/types'
import { readFileSync } from 'node:fs'
import { debuglog } from 'node:util'

const debug = debuglog('vlt')

/** `[path, size, exec]` of one file in a global store entry. */
export type StoreIndexFile = [path: string, size: number, exec: 0 | 1]

/**
 * Sidecar index of a global store entry, stored at
 * {@link storeIndexPath}. Lets a reader materialize the entry without
 * walking it, and know before touching it whether the package runs
 * install scripts.
 */
export type StoreIndex = {
  v: 1
  /** relative, `/`-separated, sorted by path */
  files: StoreIndexFile[]
  /** every directory, shortest first */
  dirs: string[]
  /** has an install/preinstall/postinstall script or a root binding.gyp */
  scripts: boolean
  /** normalized package.json `bin` */
  bins?: Record<string, string>
  name?: string
  version?: string
  /**
   * package.json as compact JSON text, if a valid manifest, so reify
   * need not read it back from disk. Text, so a reader that does not
   * need it skips the parse. Absent in entries written before it.
   */
  manifest?: string
}

/** Index fields read from the tarball's own package.json. */
export type StoreIndexManifest = Pick<
  StoreIndex,
  'scripts' | 'bins' | 'name' | 'version' | 'manifest'
>

/** The sidecar is a sibling, so it is never linked with the tree. */
export const storeIndexPath = (storeEntry: string) =>
  storeEntry + '.json'

const isRecord = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === 'object' && !Array.isArray(x)

const isOptString = (x: unknown) =>
  x === undefined || typeof x === 'string'

// empty, `.` or `..` segment, or a backslash: could escape when joined
const unsafePath = /(?:^|\/)\.{0,2}(?:\/|$)|\\/

const isRelPath = (p: unknown): p is string =>
  typeof p === 'string' && !unsafePath.test(p)

const isIndexFile = (f: unknown): f is StoreIndexFile =>
  Array.isArray(f) &&
  f.length === 3 &&
  isRelPath(f[0]) &&
  typeof f[1] === 'number' &&
  (f[2] === 0 || f[2] === 1)

const isStoreIndex = (x: unknown): x is StoreIndex =>
  isRecord(x) &&
  x.v === 1 &&
  typeof x.scripts === 'boolean' &&
  isOptString(x.name) &&
  isOptString(x.version) &&
  (x.bins === undefined ||
    (isRecord(x.bins) &&
      Object.values(x.bins).every(b => typeof b === 'string'))) &&
  Array.isArray(x.dirs) &&
  x.dirs.every(isRelPath) &&
  Array.isArray(x.files) &&
  x.files.every(isIndexFile) &&
  isOptString(x.manifest)

/**
 * Read the sidecar index of a global store entry. Missing, unparseable
 * or malformed is a store miss (undefined), never an error.
 */
export const readStoreIndex = (
  storeEntry: string,
): StoreIndex | undefined => {
  let index: unknown
  try {
    index = JSON.parse(
      readFileSync(storeIndexPath(storeEntry), 'utf8'),
    )
  } catch (er) {
    if ((er as NodeJS.ErrnoException).code !== 'ENOENT') {
      debug('global store: invalid index', storeEntry)
    }
    return undefined
  }
  if (isStoreIndex(index)) return index
  debug('global store: invalid index', storeEntry)
  return undefined
}

/**
 * Index fields from a tarball's package.json. `scripts` uses the same
 * predicate as reify's build check: an install lifecycle script, or a
 * root binding.gyp (implicit `node-gyp rebuild`). Throws on anything
 * but a JSON object, so such tarballs never become store entries.
 */
export const storeIndexManifest = (
  packageJson: Buffer,
  bindingGyp: boolean,
): StoreIndexManifest => {
  let pkg: unknown
  try {
    pkg = JSON.parse(
      packageJson.toString('utf8').replace(/^\uFEFF/, ''),
    )
  } catch (cause) {
    throw error('invalid package.json in tarball', { cause })
  }
  if (!isRecord(pkg)) {
    throw error('invalid package.json in tarball', { found: pkg })
  }
  const { name, version, scripts, bin } = pkg
  const s = isRecord(scripts) ? scripts : {}
  const result: StoreIndexManifest = {
    scripts:
      !!(s.install || s.preinstall || s.postinstall) || bindingGyp,
  }
  const bins = normalizeBinPaths({
    name: typeof name === 'string' ? name : undefined,
    bin: bin as Manifest['bin'],
  })
  if (bins && Object.keys(bins).length) result.bins = bins
  if (typeof name === 'string') result.name = name
  if (typeof version === 'string') result.version = version
  if (isManifest(pkg)) result.manifest = JSON.stringify(pkg)
  return result
}
