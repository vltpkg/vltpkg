import type { Integrity } from '@vltpkg/types'
import { createHash } from 'node:crypto'
import { Header } from 'tar'
import type { HeaderData } from 'tar'

export const integrityOf = (b: Buffer): Integrity =>
  `sha512-${createHash('sha512').update(b).digest('base64')}`

export const hexOf = (b: Buffer) =>
  createHash('sha512').update(b).digest('hex')

/** tarball from `[header, body]` pairs, bodies as strings */
export const makeTar = (entries: [HeaderData, string?][]) => {
  const chunks: Buffer[] = []
  for (const [h, body = ''] of entries) {
    const hb = Buffer.alloc(512)
    new Header({
      type: 'File',
      mode: 0o644,
      size: body.length,
      ...h,
    }).encode(hb, 0)
    chunks.push(hb)
    if (body) {
      const b = Buffer.alloc(512 * Math.ceil(body.length / 512))
      b.write(body)
      chunks.push(b)
    }
  }
  chunks.push(Buffer.alloc(1024))
  return Buffer.concat(chunks)
}

/** an encoded cache entry: head length, status, headers, body */
export const encodeEntry = (
  headers: Record<string, string>,
  body: Buffer,
  status = '200',
) => {
  const parts = [Buffer.from(status)]
  for (const [k, v] of Object.entries(headers)) {
    for (const b of [Buffer.from(k), Buffer.from(v)]) {
      const len = Buffer.alloc(4)
      len.writeUInt32BE(b.length + 4)
      parts.push(len, b)
    }
  }
  const head = Buffer.concat(parts)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(head.length + 4)
  return Buffer.concat([len, head, body])
}

export const pkg = JSON.stringify({
  name: 'x',
  version: '1.0.0',
  bin: { x: 'bin/x.js' },
})

/** a package with a bin, a world-exec file and a nested dir */
export const pkgTar = (extra = '') =>
  makeTar([
    [{ path: 'package/package.json' }, pkg],
    [{ path: 'package/bin/x.js' }, '#!/usr/bin/env node\n'],
    [{ path: 'package/tool.sh', mode: 0o755 }, 'echo hi\n'],
    [{ path: 'package/lib/deep/index.js' }, 'module.exports = 1\n'],
    [{ path: 'package/README.md' }, `# x${extra}\n`],
  ])
