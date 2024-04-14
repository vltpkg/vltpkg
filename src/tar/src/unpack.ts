import { randomBytes } from 'crypto'
import { mkdirSync, renameSync, writeFileSync } from 'fs'
import { dirname, parse, resolve } from 'path'
import { rimrafSync } from 'rimraf'
import { Header, HeaderData } from 'tar/header'
import { Pax } from 'tar/pax'
import { unzipSync } from 'zlib'

const checkFs = (h: Header): h is Header & { path: string } => {
  /* c8 ignore start - impossible */
  if (!h.path) return false
  /* c8 ignore stop */
  const parsed = parse(h.path)
  if (parsed.root) return false
  const p = h.path.replace(/\\/, '/')
  // any .. at the beginning, end, or middle = no good
  if (/(\/|)^\.\.(\/|$)/.test(p)) return false
  // packages should always be in a 'package' folder in the archive
  if (!p.startsWith('package/')) return false
  return true
}

const tmpSuffix = randomBytes(6).toString('hex')
const writeFile = (path: string, body: Buffer) => {
  mkdir(dirname(path))
  const tmpFile = `${path}.${tmpSuffix}`
  writeFileSync(tmpFile, body, { mode: 0o666 })
  renameSync(tmpFile, path)
}

const made = new Set<string>()
const mkdir = (d: string) => {
  if (!made.has(d)) {
    mkdirSync(d, { recursive: true, mode: 0o777 })
    made.add(d)
  }
}

export const unpack = (
  tarData: ArrayBufferLike | Uint8Array | Buffer,
  target: string,
  didGzipAlready = false,
): void => {
  const buffer: Buffer = Buffer.isBuffer(tarData)
    ? tarData
    : tarData instanceof Uint8Array
      ? Buffer.from(tarData.buffer)
      : Buffer.from(tarData)

  const isGzip = buffer[0] === 0x1f && buffer[1] === 0x8b
  // if it's gzip, just unpack it all right away
  if (isGzip) {
    /* c8 ignore start */
    if (didGzipAlready) {
      throw new Error('gunzipped but still gzipped??!')
    }
    /* c8 ignore stop */
    return unpack(unzipSync(buffer), target, true)
  }

  // another real quick gutcheck before we get started
  if (buffer.length % 512 !== 0) {
    throw new Error('Invalid tarball: length not divisible by 512')
  }
  if (buffer.length < 1024) {
    throw new Error(
      'Invalid tarball: not terminated by 1024 null bytes',
    )
  }
  // make sure the last kb is all zeros
  for (let i = buffer.length - 1024; i < buffer.length; i++) {
    if (buffer[i] !== 0) {
      throw new Error(
        'Invalid tarball: not terminated by 1024 null bytes',
      )
    }
  }

  rimrafSync(target)

  let offset = 0
  let h: Header
  let ex: HeaderData | undefined = undefined
  let gex: HeaderData | undefined = undefined
  while (
    offset < buffer.length &&
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
    switch (h.type) {
      case 'File':
        if (!checkFs(h)) {
          continue
        }
        writeFile(
          resolve(target, h.path.substring('package/'.length)),
          body,
        )
        break
      case 'Directory':
        if (!checkFs(h)) continue
        mkdir(resolve(target, h.path.substring('package/'.length)))
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
}
