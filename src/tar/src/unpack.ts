import { error } from '@vltpkg/error-cause'
import { randomBytes } from 'node:crypto'
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { lstat, mkdir, rename, writeFile } from 'node:fs/promises'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path'
import { rimraf, rimrafSync } from 'rimraf'
import { Header } from 'tar/header'
import type { HeaderData } from 'tar/header'
import { Pax } from 'tar/pax'
import { unzip as unzipCB, unzipSync as unzipSyncCB } from 'node:zlib'
import { findTarDir } from './find-tar-dir.ts'
import { storeIndexManifest } from './store-index.ts'
import type { StoreIndex, StoreIndexFile } from './store-index.ts'

// Matches node-tar's MAX_DECOMPRESSION_RATIO, which npm uses via pacote.
const MAX_DECOMPRESSION_RATIO = 1000

// node-tar streams, so its ratio alone bounds peak memory. We inflate into
// a single Buffer, so without a ceiling a large tarball still commits
// ratio * compressed bytes.
const defaultMaxUnpackedBytes = 2 * 1024 * 1024 * 1024

const parseMaxUnpackedBytes = (raw: string | undefined): number => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ?
      Math.floor(n)
    : defaultMaxUnpackedBytes
}
const maxUnpackedBytes = parseMaxUnpackedBytes(
  process.env.VLT_TAR_MAX_UNPACKED_BYTES,
)

const unzipMax = (len: number) =>
  Math.min(maxUnpackedBytes, len * MAX_DECOMPRESSION_RATIO)

const unzipError = (er: unknown, found: number, max: number) =>
  (er as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE' ?
    error('tarball exceeds maximum unpacked size', {
      found,
      max,
      cause: er,
    })
  : er

const unzip = async (input: Buffer) => {
  const max = unzipMax(input.length)
  return new Promise<Buffer>((res, rej) =>
    unzipCB(input, { maxOutputLength: max }, (er, result) =>
      er ? rej(unzipError(er, input.length, max)) : res(result),
    ),
  )
}

const unzipSync = (input: Buffer): Buffer => {
  const max = unzipMax(input.length)
  try {
    return unzipSyncCB(input, { maxOutputLength: max })
  } catch (er) {
    throw unzipError(er, input.length, max)
  }
}

const exists = async (path: string): Promise<boolean> => {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

let id = 1
const tmp = randomBytes(6).toString('hex') + '.'
const tmpSuffix = () => tmp + String(id++)

/** A file parsed out of a tarball, at its destination path. */
export type FileEntry = {
  path: string
  body: Buffer
  /** written with the exec bit: world-executable in the tar header */
  executable: boolean
  dir: false
}
type DirEntry = {
  path: string
  dir: true
}
type Entry = FileEntry | DirEntry

/* c8 ignore start - case-folding is platform-specific */
const foldKeys =
  process.platform === 'darwin' || process.platform === 'win32'
const entryKey = (p: string) => (foldKeys ? p.toLowerCase() : p)
/* c8 ignore stop */

// Shared across concurrent unpacks. Reify runs many extractions at
// once; a per-tarball pool would multiply in-flight writeFile fds.
const parseWriteLanes = (raw: string | undefined): number => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 64
}
const writeLaneLimit = parseWriteLanes(
  process.env.VLT_TAR_WRITE_LANES,
)
let writeLanesUsed = 0
const writeLaneWaiters: ((() => void) | undefined)[] = []
let writeLaneHead = 0

const acquireWriteLane = async () => {
  if (writeLanesUsed < writeLaneLimit) {
    writeLanesUsed++
    return
  }
  await new Promise<void>(res => writeLaneWaiters.push(res))
}

const releaseWriteLane = () => {
  // consume from a head index instead of shift(): shift is O(n) per
  // release, quadratic when many writes queue behind the lane limit.
  const next = writeLaneWaiters[writeLaneHead]
  if (next) {
    writeLaneWaiters[writeLaneHead] = undefined
    writeLaneHead++
    if (writeLaneHead === writeLaneWaiters.length) {
      writeLaneWaiters.length = 0
      writeLaneHead = 0
    }
    next()
  } else {
    writeLanesUsed--
  }
}

const withWriteLane = async <T>(fn: () => Promise<T>): Promise<T> => {
  await acquireWriteLane()
  try {
    return await fn()
  } finally {
    releaseWriteLane()
  }
}

const rethrowFirst = (
  results: PromiseSettledResult<unknown>[],
): void => {
  for (const result of results) {
    if (result.status === 'rejected') throw result.reason
  }
}

// Fast path: accept only paths that cannot escape. Anything else
// falls through to relative()/resolve() so drive-relative and
// `./`-segment cases keep today's exact (platform/cwd-dependent)
// behavior.
const isClearlySafeRelPath = (sub: string): boolean => {
  const len = sub.length
  if (len === 0) return true
  // leading /
  if (sub.charCodeAt(0) === 47) return false
  // <letter>: prefix (drive-relative)
  if (len >= 2 && sub.charCodeAt(1) === 58) {
    const c = sub.charCodeAt(0)
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
      return false
    }
  }
  let i = 0
  while (i < len) {
    let j = i
    while (j < len && sub.charCodeAt(j) !== 47) j++
    const slen = j - i
    if (slen === 1 && sub.charCodeAt(i) === 46) return false
    if (
      slen === 2 &&
      sub.charCodeAt(i) === 46 &&
      sub.charCodeAt(i + 1) === 46
    ) {
      return false
    }
    i = j + 1
  }
  return true
}

export const checkFs = (
  h: { path?: string },
  tarDir: string | undefined,
  target: string,
): h is { path: string } => {
  if (!h.path) return false
  if (!tarDir) return false
  h.path = h.path.replace(/[\\/]+/g, '/')

  // packages should always be in a 'package' tarDir in the archive
  if (!h.path.startsWith(tarDir)) return false

  const sub = h.path.slice(tarDir.length)
  if (isClearlySafeRelPath(sub)) return true

  // entries must stay within the package root. separator-aware, so that
  // a sibling dir whose name extends the target's is not a prefix match.
  const rel = relative(target, resolve(target, sub))
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return false
  }
  return true
}

const write = async (
  path: string,
  body: Buffer,
  executable = false,
) => {
  // if the mode is world-executable, then make it executable
  // this is needed for some packages that have a file that is
  // not a declared bin, but still used as a cli executable.
  await writeFile(path, body, {
    mode: executable ? 0o777 : 0o666,
  })
}

export const unpack = async (
  tarData: Buffer,
  target: string,
): Promise<void> => {
  const isGzip = tarData[0] === 0x1f && tarData[1] === 0x8b
  await unpackUnzipped(
    isGzip ? await unzip(tarData) : tarData,
    target,
  )
}

/**
 * Same as {@link unpack}, but blocking. Faster: the async writers pay a
 * libuv round trip per file, which costs more than the IO itself.
 */
export const unpackSync = (tarData: Buffer, target: string): void => {
  const isGzip = tarData[0] === 0x1f && tarData[1] === 0x8b
  unpackUnzippedSync(isGzip ? unzipSync(tarData) : tarData, target)
}

/**
 * Unpack a tarball straight from a file on disk, skipping `offset`
 * leading bytes. Used to extract from a cache entry in place, so the
 * tarball never lands in the registry client's in-memory cache.
 */
export const unpackFileSync = (
  file: string,
  target: string,
  offset = 0,
): void => unpackSync(readFileSync(file).subarray(offset), target)

/** Sibling temp path used to build `target` before renaming it in. */
export const tmpName = (target: string) =>
  dirname(target) + sep + '.' + basename(target) + '.' + tmpSuffix()

/**
 * What a tarball unpacks to under a root: every directory that holds an
 * entry (ancestors excluded) and every file.
 */
type TarEntries = { dirs: Set<string>; files: FileEntry[] }

/**
 * Walk the tar headers and collect what has to be written. No IO, so
 * all writers share it and cannot drift on path sanitization.
 */
const parseTarball = (buffer: Buffer, tmp: string): TarEntries => {
  /* c8 ignore start */
  const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b
  if (isGzip) {
    throw error('still gzipped after unzipping', {
      found: isGzip,
      wanted: false,
    })
  }
  /* c8 ignore stop */

  // another real quick gutcheck before we get started
  if (buffer.length % 512 !== 0) {
    throw error('Invalid tarball: length not divisible by 512', {
      found: buffer.length,
    })
  }
  if (buffer.length < 1024) {
    throw error(
      'Invalid tarball: not terminated by 1024 null bytes',
      {
        found: buffer.length,
      },
    )
  }
  // make sure the last kb is all zeros
  for (let i = buffer.length - 1024; i < buffer.length; i++) {
    if (buffer[i] !== 0) {
      throw error(
        'Invalid tarball: not terminated by 1024 null bytes',
        { found: buffer.subarray(i, i + 10) },
      )
    }
  }

  const entries = new Map<string, Entry>()
  let tarDir: string | undefined = undefined
  let offset = 0
  let h: Header
  let ex: HeaderData | undefined = undefined
  let gex: HeaderData | undefined = undefined
  while (
    offset < buffer.length &&
    !(h = new Header(buffer, offset, ex, gex)).nullBlock
  ) {
    offset += 512
    ex = undefined
    gex = undefined
    const size = h.size ?? 0
    const body = buffer.subarray(offset, offset + size)
    // skip invalid headers
    if (!h.cksumValid) continue
    offset += 512 * Math.ceil(size / 512)

    // TODO: tarDir might not be named "package/"
    // find the first tarDir in the first entry, and use that.
    switch (h.type) {
      case 'File':
        if (!tarDir) tarDir = findTarDir(h.path, tarDir)
        /* c8 ignore next */
        if (!tarDir) continue
        if (!checkFs(h, tarDir, tmp)) continue
        {
          const dest = resolve(tmp, h.path.substring(tarDir.length))
          const key = entryKey(dest)
          // a repeated path is fine (last wins), but flipping between
          // file and directory would silently discard data.
          if (entries.get(key)?.dir === true) {
            throw error('file/directory collision in tarball', {
              path: dest,
            })
          }
          entries.set(key, {
            path: dest,
            body,
            executable: 1 === ((h.mode ?? 0x666) & 1),
            dir: false,
          })
        }
        break

      case 'Directory':
        /* c8 ignore next 2 */
        if (!tarDir) tarDir = findTarDir(h.path, tarDir)
        if (!tarDir) continue
        if (!checkFs(h, tarDir, tmp)) continue
        {
          const dest = resolve(tmp, h.path.substring(tarDir.length))
          const key = entryKey(dest)
          if (entries.get(key)?.dir === false) {
            throw error('file/directory collision in tarball', {
              path: dest,
            })
          }
          entries.set(key, {
            path: dest,
            dir: true,
          })
        }
        break

      case 'GlobalExtendedHeader':
        gex = Pax.parse(body.toString(), gex, true)
        break

      case 'ExtendedHeader':
      case 'OldExtendedHeader':
        ex = Pax.parse(body.toString(), ex, false)
        break

      case 'NextFileHasLongPath':
      case 'OldGnuLongPath':
        ex ??= Object.create(null) as HeaderData
        ex.path = body.toString().replace(/\0.*/, '')
        break
    }
  }

  // Per-unpack memo: paths are tmp-scoped and never reused across
  // unpacks. The unique dir set is the memo; making/made globals
  // previously leaked ~18k strings per install.
  const dirs = new Set<string>()
  const files: FileEntry[] = []
  for (const e of entries.values()) {
    if (e.dir) dirs.add(e.path)
    else {
      dirs.add(dirname(e.path))
      files.push(e)
    }
  }
  return { dirs, files }
}

const unpackUnzipped = async (
  buffer: Buffer,
  target: string,
): Promise<void> => {
  const tmp = tmpName(target)
  const og = tmp + '.ORIGINAL'

  let succeeded = false
  try {
    const { dirs, files } = parseTarball(buffer, tmp)

    rethrowFirst(
      await Promise.allSettled(
        [...dirs].map(d =>
          mkdir(d, { recursive: true, mode: 0o777 }),
        ),
      ),
    )
    rethrowFirst(
      await Promise.allSettled(
        files.map(f =>
          withWriteLane(() => write(f.path, f.body, f.executable)),
        ),
      ),
    )

    const targetExists = await exists(target)
    if (targetExists) await rename(target, og)
    await rename(tmp, target)
    if (targetExists) await rimraf(og)
    succeeded = true
  } finally {
    // do not handle error or obscure throw site, just do the cleanup
    // if it didn't complete successfully.
    if (!succeeded) {
      /* c8 ignore start */
      if (await exists(og)) {
        await rimraf(target)
        await rename(og, target)
      }
      /* c8 ignore stop */
      await rimraf(tmp)
    }
  }
}

const unpackUnzippedSync = (buffer: Buffer, target: string): void => {
  const tmp = tmpName(target)
  const og = tmp + '.ORIGINAL'

  let succeeded = false
  try {
    const { dirs, files } = parseTarball(buffer, tmp)

    for (const d of dirs) {
      mkdirSync(d, { recursive: true, mode: 0o777 })
    }
    for (const f of files) {
      // if the mode is world-executable, then make it executable
      // this is needed for some packages that have a file that is
      // not a declared bin, but still used as a cli executable.
      writeFileSync(f.path, f.body, {
        mode: f.executable ? 0o777 : 0o666,
      })
    }

    const targetExists = !!lstatSync(target, {
      throwIfNoEntry: false,
    })
    if (targetExists) renameSync(target, og)
    renameSync(tmp, target)
    if (targetExists) rimrafSync(og)
    succeeded = true
  } finally {
    if (!succeeded) {
      /* c8 ignore start */
      if (lstatSync(og, { throwIfNoEntry: false })) {
        rimrafSync(target)
        renameSync(og, target)
      }
      /* c8 ignore stop */
      rimrafSync(tmp)
    }
  }
}

/**
 * What a gzipped or raw tarball explodes to in the global store at
 * `dir`: its sidecar index, files and package.json `bin` target paths.
 * Same parsing and path safety as {@link unpackSync}. No IO. Throws if
 * the tarball has no valid package.json.
 */
export const storeLayout = (
  tarData: Buffer,
  dir: string,
): { index: StoreIndex; files: FileEntry[]; binFiles: string[] } => {
  const isGzip = tarData[0] === 0x1f && tarData[1] === 0x8b
  const { dirs, files } = parseTarball(
    isGzip ? unzipSync(tarData) : tarData,
    dir,
  )
  const rel = (p: string) => relative(dir, p).replace(/\\/g, '/')

  const list = files.map(f => [rel(f.path), f] as const)
  const pj = list.find(([p]) => p === 'package.json')?.[1]
  if (!pj) throw error('no package.json in tarball', { path: dir })
  const manifest = storeIndexManifest(
    pj.body,
    list.some(([p]) => p === 'binding.gyp'),
  )
  const bins = new Set(
    Object.values(manifest.bins ?? {}).map(entryKey),
  )
  const indexFiles: StoreIndexFile[] = []
  const binFiles: string[] = []
  for (const [p, f] of list) {
    if (bins.has(entryKey(p))) {
      f.executable = true
      binFiles.push(f.path)
    }
    indexFiles.push([p, f.body.length, f.executable ? 1 : 0])
  }
  const allDirs = new Set<string>()
  for (const d of dirs) {
    for (let p = rel(d); p && !allDirs.has(p);) {
      allDirs.add(p)
      p = p.slice(0, Math.max(0, p.lastIndexOf('/')))
    }
  }
  // stable sort: lexical within each length
  const indexDirs = [...allDirs]
    .sort()
    .sort((a, b) => a.length - b.length)

  return {
    index: {
      v: 1,
      files: indexFiles.sort((a, b) => (a[0] < b[0] ? -1 : 1)),
      dirs: indexDirs,
      ...manifest,
    },
    files,
    binFiles,
  }
}

/**
 * Explode a gzipped or raw tarball into `dir` for the global store and
 * return its sidecar index (see {@link storeLayout}), written straight
 * into `dir` (which must not exist; the caller renames it into place).
 * Same modes as {@link unpackSync} followed by reify's bin chmod.
 * Throws, writing nothing, without a valid package.json. Removes `dir`
 * on failure.
 */
export const unpackToStoreSync = (
  tarData: Buffer,
  dir: string,
): { index: StoreIndex } => {
  const { index, files, binFiles } = storeLayout(tarData, dir)
  mkdirSync(dirname(dir), { recursive: true })
  mkdirSync(dir, { mode: 0o777 })
  let succeeded = false
  try {
    // recursive: tolerates dirs that differ only by case, like unpackSync
    for (const d of index.dirs) {
      mkdirSync(join(dir, d), { recursive: true, mode: 0o777 })
    }
    for (const f of files) {
      writeFileSync(f.path, f.body, {
        mode: f.executable ? 0o777 : 0o666,
      })
    }
    // reify's bin chmod result (umask'd mode plus all exec bits), so it
    // never has to chmod a store inode through a link
    let binMode = 0
    for (const p of binFiles) {
      binMode ||= (statSync(p).mode & 0o777) | 0o111
      chmodSync(p, binMode)
    }
    succeeded = true
  } finally {
    if (!succeeded) rimrafSync(dir)
  }
  return { index }
}
