import { error } from '@vltpkg/error-cause'
import { randomBytes } from 'crypto'
import { lstat, mkdir, rename, writeFile } from 'fs/promises'
import { basename, dirname, parse, resolve } from 'path'
import { rimraf } from 'rimraf'
import { Header } from 'tar/header'
import type { HeaderData } from 'tar/header'
import { Pax } from 'tar/pax'
import { unzip as unzipCB } from 'zlib'
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

const checkFs = (
  h: Header,
  tarDir: string | undefined,
): h is Header & { path: string } => {
  /* c8 ignore start - impossible */
  if (!h.path) return false
  if (!tarDir) return false
  /* c8 ignore stop */
  h.path = h.path.replace(/[\\/]+/g, '/')
  const parsed = parse(h.path)
  if (parsed.root) return false
  const p = h.path.replace(/\\/, '/')
  // any .. at the beginning, end, or middle = no good
  if (/(\/|)^\.\.(\/|$)/.test(p)) return false
  // packages should always be in a 'package' tarDir in the archive
  if (!p.startsWith(tarDir)) return false
  return true
}

const write = async (
  path: string,
  body: Buffer,
  executable = false,
) => {
  await mkdirp(dirname(path))
  // if the mode is world-executable, then make it executable
  // this is needed for some packages that have a file that is
  // not a declared bin, but still used as a cli executable.
  await writeFile(path, body, {
    mode: executable ? 0o777 : 0o666,
  })
}

const made = new Set<string>()
const making = new Map<string, Promise<boolean>>()
const mkdirp = async (d: string) => {
  if (!made.has(d)) {
    const m =
      making.get(d) ??
      mkdir(d, { recursive: true, mode: 0o777 }).then(() =>
        making.delete(d),
      )
    making.set(d, m)
    await m
    made.add(d)
  }
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
    dirname(target) + '/.' + basename(target) + '.' + tmpSuffix()
  const og = tmp + '.ORIGINAL'
  await Promise.all([rimraf(tmp), rimraf(og)])

  let succeeded = false
  try {
    let tarDir: string | undefined = undefined
    let offset = 0
    let h: Header
    let ex: HeaderData | undefined = undefined
    let gex: HeaderData | undefined = undefined
    while (
      offset < buffer.length &&
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      (h = new Header(buffer, offset, ex, gex)) &&
      !h.nullBlock
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
          if (!checkFs(h, tarDir)) continue
          await write(
            resolve(tmp, h.path.substring(tarDir.length)),
            body,
            // if it's world-executable, it's an executable
            // otherwise, make it read-only.
            1 === ((h.mode ?? 0x666) & 1),
          )
          break

        case 'Directory':
          /* c8 ignore next 2 */
          if (!tarDir) tarDir = findTarDir(h.path, tarDir)
          if (!tarDir) continue
          if (!checkFs(h, tarDir)) continue
          await mkdirp(resolve(tmp, h.path.substring(tarDir.length)))
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
