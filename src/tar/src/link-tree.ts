import {
  chmodSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, sep } from 'node:path'
import { debuglog } from 'node:util'
import { rimrafSync } from 'rimraf'
import { cloneDir } from './clonefile.ts'
import {
  markStoreEntryCopied,
  removeStoreEntry,
} from './store-entry.ts'
import { readStoreIndex } from './store-index.ts'
import type { StoreIndex, StoreIndexFile } from './store-index.ts'
import { tmpName } from './unpack.ts'

const debug = debuglog('vlt')

const noThrow = { throwIfNoEntry: false } as const

// debug spot-check: linked package.json size must match the index
const verify = process.env.VLT_STORE_VERIFY === '1'

/**
 * How reify places packages: `auto` and `hardlink` link from the global
 * store, `clone` clones from it (macOS), `copy` copies from it, `unpack`
 * skips it.
 */
export type StoreLinker =
  'auto' | 'hardlink' | 'clone' | 'copy' | 'unpack'

/**
 * How a store entry was placed (`clone`: the whole directory cloned
 * copy-on-write; `copy`: every file copied, for install scripts, `copy`
 * or a downgrade) and its index, or false on a miss.
 */
export type StoreLinkResult =
  { how: 'link' | 'clone' | 'copy'; index: StoreIndex } | false

export type LinkFromStoreOptions = {
  /**
   * copy every file instead of hardlinking. Implied when the index says
   * the package runs install scripts, which must not write into the store.
   */
  copy?: boolean
  /**
   * clone the entry directory copy-on-write (`clonefile(2)`: macOS on
   * APFS) instead of placing files one by one. Where a clone fails,
   * files are linked or copied as without it; where one cannot work at
   * all (no clones on this filesystem, another volume), never tried
   * again in this process. A clone never writes into the store, so
   * `copy` and install scripts need no copy on top of it.
   */
  clone?: boolean
}

// Process-wide: once links fail for a reason that will not go away
// (other device, no hardlink support, permissions), stop trying.
let copyAll = false

const downgrade = (code: string) => {
  copyAll = true
  debug('global store: linking failed, copying from now on', code)
}

// Same for clones: no clonefile, no clones on this filesystem, another
// volume, or permissions.
let cloneNone = false

// Index paths are validated relative '/'-paths: concatenation is safe
// and much cheaper than join() on the per-file hot path.
const native = (p: string) =>
  sep === '/' ? p : p.replaceAll('/', sep)

// false: not cloned, place the files one by one
const cloneEntry = (storeEntry: string, tmp: string): boolean => {
  if (cloneNone) return false
  const res = cloneDir(storeEntry, tmp)
  if (res === true) return true
  if (
    res === 'ENOTSUP' ||
    res === 'EXDEV' ||
    res === 'EPERM' ||
    res === 'EACCES'
  ) {
    cloneNone = true
    debug('global store: cloning failed, linking from now on', res)
  }
  // ENOENT (entry gone) and the rest: one entry, and placing its
  // files finds out what is wrong with it
  return false
}

/**
 * A clone holds whatever the entry holds, so a file missing from the
 * entry is silently missing from the clone: count the names in every
 * directory against the index (one readdir per directory, far cheaper
 * than a stat per file). 'damaged' on any difference, or, with
 * VLT_STORE_VERIFY=1, when package.json changed size.
 */
const checkClone = (
  tmp: string,
  index: StoreIndex,
): 'damaged' | undefined => {
  const counts = new Map<string, number>([['', 0]])
  for (const d of index.dirs) counts.set(d, 0)
  for (const p of [...index.dirs, ...index.files.map(f => f[0])]) {
    const i = p.lastIndexOf('/')
    const d = i === -1 ? '' : p.slice(0, i)
    const n = counts.get(d)
    // a directory the index does not list: not a valid entry
    if (n === undefined) return 'damaged'
    counts.set(d, n + 1)
  }
  for (const [d, n] of counts) {
    let names: string[]
    try {
      names = readdirSync(d ? tmp + sep + native(d) : tmp)
    } catch {
      // a directory the entry does not have
      return 'damaged'
    }
    if (names.length !== n) return 'damaged'
  }
  const pj = index.files.find(f => f[0] === 'package.json')
  if (
    verify &&
    pj &&
    statSync(tmp + sep + 'package.json').size !== pj[1]
  ) {
    return 'damaged'
  }
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
 * hardlink each file into a sibling temp dir (package.json last), or
 * with `clone` clone the whole entry there, then rename it into place.
 * Files that cannot be linked are copied, as is every file of a
 * package with install scripts. Returns how, with the index, or false,
 * leaving `target` untouched, on a store miss (no valid index, entry
 * not a directory, symlinked target parent), a name clash on a
 * case-insensitive target, or a damaged entry, which is removed.
 */
export const linkFromStore = (
  storeEntry: string,
  target: string,
  { copy = false, clone = false }: LinkFromStoreOptions = {},
): StoreLinkResult => {
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
    const cloned = clone && cloneEntry(storeEntry, tmp)
    // a clone is copy-on-write: install scripts write into it, never
    // into the store, so it needs no copy on top
    const copied = !cloned && (copy || index.scripts)
    if (!cloned) mkdirSync(tmp)
    const miss =
      cloned ?
        checkClone(tmp, index)
      : fill(storeEntry, tmp, index, copied)
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
    // nlink stays 1 (a clone shares blocks, not inodes): tell
    // prune-store it is used
    if (cloned || copied || copyAll) markStoreEntryCopied(storeEntry)
    succeeded = true
    return {
      how:
        cloned ? 'clone'
        : copied || copyAll ? 'copy'
        : 'link',
      index,
    }
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
