import {
  chmodSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, sep } from 'node:path'
import { debuglog } from 'node:util'
import { rimrafSync } from 'rimraf'
import { removeStoreEntry } from './store-entry.ts'
import { readStoreIndex } from './store-index.ts'
import type { StoreIndex, StoreIndexFile } from './store-index.ts'
import { tmpName } from './unpack.ts'

const debug = debuglog('vlt')

const noThrow = { throwIfNoEntry: false } as const

// debug spot-check: linked package.json size must match the index
const verify = process.env.VLT_STORE_VERIFY === '1'

/**
 * How reify places packages: `auto` and `hardlink` link from the global
 * store, `copy` copies from it, `unpack` skips it.
 */
export type StoreLinker = 'auto' | 'hardlink' | 'copy' | 'unpack'

export type LinkFromStoreOptions = {
  /**
   * copy every file instead of hardlinking. Implied when the index says
   * the package runs install scripts, which must not write into the store.
   */
  copy?: boolean
}

// Process-wide: once links fail for a reason that will not go away
// (other device, no hardlink support, permissions), stop trying.
let copyAll = false

const downgrade = (code: string) => {
  copyAll = true
  debug('global store: linking failed, copying from now on', code)
}

// false: the source is gone, i.e. the store entry is damaged
const place = (
  src: string,
  dst: string,
  exec: 0 | 1,
  copy: boolean,
): boolean => {
  if (!copy && !copyAll) {
    try {
      linkSync(src, dst)
      return true
    } catch (er) {
      const { code = '' } = er as NodeJS.ErrnoException
      if (code === 'ENOENT') {
        if (!lstatSync(src, noThrow)) return false
        // target side vanished (node_modules removed mid-install)
        if (!lstatSync(dirname(dst), noThrow)) throw er
        // overlayfs can fail cross-layer links with ENOENT
        downgrade(code)
      } else if (
        code === 'EXDEV' ||
        code === 'EPERM' ||
        code === 'EACCES' ||
        code === 'ENOTSUP'
      ) {
        downgrade(code)
      } else if (code !== 'EMLINK') {
        throw er
      }
    }
  }
  let body: Buffer
  try {
    body = readFileSync(src)
  } catch (er) {
    if ((er as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw er
  }
  // `wx`: only ever a fresh file, never truncate what may be a link
  writeFileSync(dst, body, { mode: exec ? 0o777 : 0o666, flag: 'wx' })
  // store bins have every exec bit, whatever the umask
  if (exec) chmodSync(dst, statSync(src).mode & 0o777)
  return true
}

/**
 * Fill `tmp` from the entry. 'damaged': a source file is gone (or,
 * with VLT_STORE_VERIFY=1, package.json changed size). 'clash': two
 * index paths map to one name on a case-insensitive target.
 */
const fill = (
  storeEntry: string,
  tmp: string,
  index: StoreIndex,
  copy: boolean,
): 'damaged' | 'clash' | undefined => {
  // Index paths are validated relative '/'-paths: concatenation is
  // safe and much cheaper than join() on this per-file hot path.
  const native =
    sep === '/' ?
      (p: string) => p
    : (p: string) => p.replaceAll('/', sep)
  const put = ([p, , exec]: StoreIndexFile) =>
    place(
      storeEntry + sep + native(p),
      tmp + sep + native(p),
      exec,
      copy,
    )
  try {
    for (const d of index.dirs) mkdirSync(tmp + sep + native(d))
    let pj: StoreIndexFile | undefined
    for (const f of index.files) {
      if (f[0] === 'package.json') pj = f
      else if (!put(f)) return 'damaged'
    }
    if (!pj) return
    // last, so an interrupted tmp dir never looks complete
    if (!put(pj)) return 'damaged'
    if (verify && statSync(tmp + sep + pj[0]).size !== pj[1]) {
      return 'damaged'
    }
  } catch (er) {
    if ((er as NodeJS.ErrnoException).code === 'EEXIST')
      return 'clash'
    throw er
  }
}

/**
 * Materialize a global store entry at `target` from its sidecar index:
 * hardlink each file into a sibling temp dir (package.json last), then
 * rename it into place. Files that cannot be linked are copied, as is
 * every file of a package with install scripts. Returns false, leaving
 * `target` untouched, on a store miss (no valid index, entry not a
 * directory, symlinked target parent), a name clash on a
 * case-insensitive target, or a damaged entry, which is removed.
 */
export const linkFromStore = (
  storeEntry: string,
  target: string,
  { copy = false }: LinkFromStoreOptions = {},
): boolean => {
  const index = readStoreIndex(storeEntry)
  if (!index || !lstatSync(storeEntry, noThrow)?.isDirectory()) {
    return false
  }
  const parent = lstatSync(dirname(target), noThrow)
  if (parent?.isSymbolicLink()) return false
  if (!parent) mkdirSync(dirname(target), { recursive: true })

  const tmp = tmpName(target)
  const og = tmp + '.ORIGINAL'
  let succeeded = false
  try {
    mkdirSync(tmp)
    const miss = fill(storeEntry, tmp, index, copy || index.scripts)
    if (miss === 'clash') {
      debug('global store: name clash in target', storeEntry)
      return false
    }
    if (miss) {
      debug('global store: removing damaged entry', storeEntry)
      try {
        removeStoreEntry(storeEntry)
      } catch {}
      return false
    }

    const targetExists = !!lstatSync(target, noThrow)
    if (targetExists) renameSync(target, og)
    renameSync(tmp, target)
    if (targetExists) rimrafSync(og)
    succeeded = true
    return true
  } finally {
    if (!succeeded) {
      /* c8 ignore start */
      if (lstatSync(og, noThrow)) {
        rimrafSync(target)
        renameSync(og, target)
      }
      /* c8 ignore stop */
      rimrafSync(tmp)
    }
  }
}
