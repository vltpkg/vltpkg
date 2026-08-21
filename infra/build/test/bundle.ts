import { bundle } from '../src/bundle.ts'
import t from 'tap'
import {
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

t.test('default', async t => {
  const dir = t.testdir()
  const res = await bundle({
    outdir: dir,
  })
  const contents = readdirSync(res.outdir)

  t.ok(contents.includes('vlt.js'))
  t.ok(contents.includes('vlr.js'))

  const js = readdirSync(res.outdir)
    .filter(f => /\.js$/.exec(f))
    .map(f => [f, readFileSync(join(res.outdir, f), 'utf8')] as const)

  const codeSplit = js
    .filter(([, v]) =>
      v.includes('var __CODE_SPLIT_SCRIPT_NAME = import'),
    )
    .map(([f]) => f)

  const codeSplitCallers = js.filter(([, v]) =>
    v.includes('var __CODE_SPLIT_SCRIPT_NAME = resolve'),
  )

  t.ok(codeSplit.length, 'code split files found')
  t.ok(codeSplitCallers.length, 'code split callers found')
  t.ok(
    codeSplitCallers.every(([, v]) =>
      codeSplit.some(c =>
        v.includes(`(import.meta.dirname, "${c}")`),
      ),
    ),
    'code split callers reference code split files',
  )

  for (const [f, v] of js) {
    const mains = v.match(/var __CODE_SPLIT_SCRIPT_NAME = import/g)
    t.ok(
      !mains || mains.length <= 1,
      `${f} has at most one isMain script name`,
    )
  }

  const revalidate = js.find(
    ([f]) => f === 'registry-client-src-revalidate.js',
  )
  t.ok(revalidate, 'revalidate chunk emitted')
  t.notOk(
    revalidate?.[1].includes('vlt-cache-unzip'),
    'revalidate chunk does not inline unzip isMain',
  )
  t.ok(
    revalidate?.[1].includes('cache-unzip-src-unzip.js'),
    'revalidate chunk stubs unzip as a sibling',
  )

  await t.test('bundled revalidate child runs', async t => {
    const server = createServer((_req, res) => {
      res.statusCode = 304
      res.setHeader('date', new Date().toUTCString())
      res.end()
    })
    await new Promise<void>(res =>
      server.listen(0, '127.0.0.1', () => res()),
    )
    t.teardown(() => server.close())
    const { port } = server.address() as AddressInfo
    const target = `http://127.0.0.1:${port}/pkg`
    const cacheRoot = t.testdir()
    const rcDir = join(cacheRoot, 'registry-client')
    mkdirSync(rcDir, { recursive: true })

    const statusBytes = Buffer.from('200')
    const headerItems: Buffer[] = []
    for (const [k, v] of Object.entries({
      date: new Date('2020-01-01').toUTCString(),
      etag: '"abc"',
      'content-type': 'application/json',
    })) {
      for (const b of [Buffer.from(k), Buffer.from(v)]) {
        const lb = Buffer.alloc(4)
        lb.writeUInt32BE(4 + b.byteLength)
        headerItems.push(lb, b)
      }
    }
    let headLength = 4 + statusBytes.byteLength
    for (const h of headerItems) headLength += h.byteLength
    const headLenBytes = Buffer.alloc(4)
    headLenBytes.writeUInt32BE(headLength)
    const encoded = Buffer.concat([
      headLenBytes,
      statusBytes,
      ...headerItems,
      Buffer.from('{"ok":true}'),
    ])
    const hash = createHash('sha512').update(target).digest('hex')
    writeFileSync(join(rcDir, hash), encoded)
    writeFileSync(join(rcDir, `${hash}.key`), target)

    const script = join(dir, 'registry-client-src-revalidate.js')
    const result = await new Promise<{
      status: number | null
      signal: NodeJS.Signals | null
    }>(res => {
      const cp = spawn(process.execPath, [script, cacheRoot], {
        stdio: ['pipe', 'inherit', 'inherit'],
      })
      cp.stdin.write(`GET ${target}\0`, () => cp.stdin.end())
      cp.on('close', (status, signal) => res({ status, signal }))
    })
    t.matchOnlyStrict(result, { status: 0, signal: null })
  })
})

t.test('bins', async t => {
  const dir = t.testdir()
  const res = await bundle({
    outdir: dir,
    bins: ['vlr'],
  })
  const contents = readdirSync(res.outdir)
  t.notOk(contents.includes('vlt.js'))
  t.ok(contents.includes('vlr.js'))
})

t.test('hashbangs', async t => {
  const dir = t.testdir()
  const res = await bundle({
    outdir: dir,
    bins: ['vlt'],
    hashbang: true,
  })
  const contents = readFileSync(join(res.outdir, 'vlt.js'), 'utf8')
  t.ok(contents.startsWith('#!/usr/bin/env -S node'))
})
