import {
  lstatSync,
  readdirSync,
  readFileSync,
  statSync,
} from 'node:fs'
import { join, relative } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { rimrafSync } from 'rimraf'
import { readStoreIndex, storeIndexPath } from './store-index.ts'
import { storeLayout } from './unpack.ts'

const noThrow = { throwIfNoEntry: false } as const

const entryName = /^([0-9a-f]{128})(?:\.json)?$/

const relPath = (from: string, to: string) =>
  relative(from, to).replace(/\\/g, '/')

/**
 * Integrity hex names of the global store entries under `root`, each
 * with an entry dir, a sidecar index or both. Sorted.
 */
export const storeEntryNames = (root: string): string[] => {
  let names: string[]
  try {
    names = readdirSync(root)
  } catch {
    return []
  }
  const hexes = new Set<string>()
  for (const name of names) {
    const hex = entryName.exec(name)?.[1]
    if (hex) hexes.add(hex)
  }
  return [...hexes].sort()
}

/**
 * Remove a global store entry. Dir first: a sidecar without its dir is
 * a plain miss. Projects linked from it keep their files.
 */
export const removeStoreEntry = (storeEntry: string): void => {
  rimrafSync(storeEntry)
  rimrafSync(storeIndexPath(storeEntry))
}

/**
 * When a global store entry was written, in ms: its sidecar's mtime,
 * else its dir's, else 0.
 */
export const storeEntryTime = (storeEntry: string): number =>
  (
    statSync(storeIndexPath(storeEntry), noThrow) ??
    statSync(storeEntry, noThrow)
  )?.mtimeMs ?? 0

/**
 * True if a file of the global store entry has another hardlink
 * (nlink > 1), i.e. some `node_modules` uses it. Without a valid
 * sidecar nothing can link from it, so false.
 */
export const storeEntryLinked = (storeEntry: string): boolean =>
  !!readStoreIndex(storeEntry)?.files.some(
    ([p]) =>
      (lstatSync(join(storeEntry, p), noThrow)?.nlink ?? 1) > 1,
  )

/**
 * Check a global store entry against the tarball it was exploded from:
 * sidecar index, file list and every file's bytes. Returns why it does
 * not match, or undefined if it does.
 */
export const verifyStoreEntry = (
  storeEntry: string,
  tarData: Buffer,
): string | undefined => {
  let layout: ReturnType<typeof storeLayout>
  try {
    layout = storeLayout(tarData, storeEntry)
  } catch {
    return 'bad tarball'
  }
  const index = readStoreIndex(storeEntry)
  if (!index) return 'no index'
  if (!isDeepStrictEqual(index, layout.index)) return 'index differs'
  const found = new Set<string>()
  try {
    for (const d of readdirSync(storeEntry, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!d.isDirectory()) {
        found.add(relPath(storeEntry, join(d.parentPath, d.name)))
      }
    }
  } catch {
    return 'missing'
  }
  for (const f of layout.files) {
    const p = relPath(storeEntry, f.path)
    if (!found.delete(p)) return `missing ${p}`
    if (!readFileSync(f.path).equals(f.body)) return `modified ${p}`
  }
  const [extra] = found
  return extra === undefined ? undefined : `extra ${extra}`
}
