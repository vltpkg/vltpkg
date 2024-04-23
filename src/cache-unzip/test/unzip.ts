import { Cache } from '@vltpkg/cache'
import { spawnSync } from 'child_process'
import { dirname, resolve } from 'path'
import t from 'tap'
import { fileURLToPath } from 'url'
import { gzipSync } from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const script = resolve(__dirname, '../dist/esm/unzip.js')

t.test('validate args', async t => {
  t.match(spawnSync(process.execPath, [script]), { status: 1 })
  t.match(spawnSync(process.execPath, [script, 'path']), {
    status: 1,
  })
  t.match(
    spawnSync(process.execPath, [
      script,
      t.testdir(),
      'nope',
      'not valid',
      'no valid keys',
    ]),
    { status: 1 },
  )
})

t.test('unzip some stuff in the cache', async t => {
  const cache = new Cache({ path: t.testdir() })

  const head10 = Buffer.alloc(10)
  head10.writeUint32BE(10, 0)

  const plain = Buffer.concat([head10, Buffer.from('not gzipped')])
  const gzip = Buffer.concat([
    head10,
    gzipSync(Buffer.from('yes gzipped')),
  ])

  cache.set('gz1', gzip)
  cache.set('gz2', gzip)
  cache.set('plain1', plain)
  cache.set('plain2', plain)

  await cache.promise()

  // gutcheck, make sure it got written to cache
  const g = new Cache({ path: t.testdirName })
  t.strictSame(
    await g.fetch('gz1'),
    Buffer.concat([head10, gzipSync(Buffer.from('yes gzipped'))]),
  )
  t.strictSame(
    await g.fetch('gz2'),
    Buffer.concat([head10, gzipSync(Buffer.from('yes gzipped'))]),
  )
  t.strictSame(
    await g.fetch('plain1'),
    Buffer.concat([head10, Buffer.from('not gzipped')]),
  )
  t.strictSame(
    await g.fetch('plain2'),
    Buffer.concat([head10, Buffer.from('not gzipped')]),
  )

  const res = spawnSync(
    process.execPath,
    [script, t.testdirName, 'gz1', 'gz2', 'plain1', 'bogus'],
    { stdio: 'inherit' },
  )
  t.matchOnlyStrict(res, {
    status: 0,
    signal: null,
    output: [null, null, null],
    pid: Number,
    stdout: null,
    stderr: null,
  })

  const c = new Cache({ path: t.testdirName })
  t.same(
    await c.fetch('gz1'),
    Buffer.concat([head10, Buffer.from('yes gzipped')]),
  )
  t.same(
    await c.fetch('gz2'),
    Buffer.concat([head10, Buffer.from('yes gzipped')]),
  )
  t.same(
    await c.fetch('plain1'),
    Buffer.concat([head10, Buffer.from('not gzipped')]),
  )
  t.same(
    await c.fetch('plain2'),
    Buffer.concat([head10, Buffer.from('not gzipped')]),
  )
})
