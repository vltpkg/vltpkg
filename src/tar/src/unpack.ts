import { error } from '@vltpkg/error-cause'
import { randomBytes } from 'node:crypto'
import { lstat, mkdir, rename, writeFile } from 'node:fs/promises'
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path'
import { rimraf } from 'rimraf'
import { Header } from 'tar/header'
import type { HeaderData } from 'tar/header'
import { Pax } from 'tar/pax'
import { unzip as unzipCB } from 'node:zlib'
import { findTarDir } from './find-tar-dir.ts'

const unzip = async (input: Buffer) =>
  new Promise<Buffer>(
    (res, rej) =>
      /* c8 ignore start */
      unzipCB(input, (er, result) => (er ? rej(er) : res(result))),
    /* c8 ignore stop */
  )

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

type FileEntry = {
  path: string
  body: Buffer
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
const writeLaneWaiters: (() => void)[] = []

const acquireWriteLane = async () => {
  if (writeLanesUsed < writeLaneLimit) {
    writeLanesUsed++
    return
  }
  await new Promise<void>(res => writeLaneWaiters.push(res))
}

const releaseWriteLane = () => {
  const next = writeLaneWaiters.shift()
  if (next) next()
  else writeLanesUsed--
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

const unpackUnzipped = async (
  buffer: Buffer,
  target: string,
): Promise<void> => {
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
      { found: buffer.length },
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

  const tmp =
    dirname(target) + sep + '.' + basename(target) + '.' + tmpSuffix()
  const og = tmp + '.ORIGINAL'

  let succeeded = false
  try {
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
            entries.set(entryKey(dest), {
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
            entries.set(entryKey(dest), {
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
