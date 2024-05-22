import { spawnSync } from 'child_process'
import { lstatSync, readFileSync } from 'fs'
import { resolve } from 'path'
import t, { Test } from 'tap'
import { Pax } from 'tar'
import { fileURLToPath } from 'url'
import { Worker } from 'worker_threads'
import { gzipSync } from 'zlib'
import { makeTar } from './fixtures/make-tar.js'

const workerScript = new URL('../dist/esm/worker.js', import.meta.url)

const w = new Worker(workerScript)
t.teardown(() => w.terminate())

const pj = JSON.stringify({
  name: 'some-package',
  version: '1.2.3',
})
const gex = new Pax(
  {
    dev: 12345,
  },
  true,
).encode()
const ex = new Pax({
  path: 'package/some/empty/dir',
  // this is actually ignored
  mode: 0o666,
}).encode()
const longPath = 'package/asdfasdfasdfasdf'
const getTarball = () =>
  makeTar([
    { path: 'package/package.json', size: pj.length },
    pj,

    { path: resolve('ignore/absolute/paths'), size: 1 },
    'z',

    // just here for coverage, doesn't actually do anything relevant
    gex,

    // this overrides the path
    ex,
    { path: 'package/some/e', type: 'Directory' },

    Buffer.from('not a valid tar header, ignore and skip this'),

    { path: 'outside/directory', type: 'Directory' },

    // ignore mode/dates/uid/etc.
    {
      path: 'package/dir/some-file',
      mode: 0o123,
      uid: 1234,
      mtime: new Date('2024-01-01'),
      size: 1,
    },
    'x',

    {
      path: '././@LongPath',
      type: 'NextFileHasLongPath',
      size: longPath.length,
    },
    longPath,
    {
      path: 'package/a',
      size: 1,
    },
    'a',

    // entries that will always be filtered out
    {
      path: 'package/slinky',
      linkpath: 'package/target',
      type: 'SymbolicLink',
    },
    { path: '../dots', size: 1 },
    'x',
    { path: 'outside/ignoreme', size: 1 },
    'x',
  ])

t.test('unpack into a dir', t => {
  const check = (t: Test, result: any, id: number) => {
    t.matchOnly(result, { id, ok: true })
    t.throws(() => lstatSync(resolve('ignore/absolute/paths')))
    const d = t.testdirName
    t.equal(lstatSync(d + '/package.json').isFile(), true)
    const f = lstatSync(d + '/dir/some-file')
    t.equal(f.isFile(), true)
    t.not(f.mtime.toISOString(), '2024-01-01T00:00:00.000Z')
    t.not(f.mode & 0o777, 0o123)
    t.throws(() => lstatSync(d + '/slinky'))
    t.throws(() => lstatSync(d + '/../dots'))
    t.throws(() => lstatSync(d + '/ignoreme'))
    t.throws(() => lstatSync(d + '/a'))
    t.throws(() => lstatSync(d + '/directory'))
    t.throws(() => lstatSync(d + '/../outside/directory'))
    t.equal(readFileSync(d + '/asdfasdfasdfasdf', 'utf8'), 'a')

    // got path overridden with pax header
    t.throws(() => lstatSync(d + '/some/e'))
    const dir = lstatSync(d + '/some/empty/dir')
    t.equal(dir.isDirectory(), true)
    if (process.platform !== 'win32') {
      t.equal(dir.mode & 0o700, 0o700, 'dir is mode 0o7xx')
    }
    t.end()
  }

  t.test('buffer', async t => {
    const p = new Promise<any>(res => w.once('message', res))
    const raw = getTarball()
    const tb = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.length,
    )
    w.postMessage({ tarData: tb, target: t.testdir(), id: 1 }, [tb])
    check(t, await p, 1)
  })

  t.test('gzipped', async t => {
    const p = new Promise<any>(res => w.once('message', res))
    const raw = gzipSync(getTarball())
    const tb = raw.buffer.slice(
      raw.byteOffset,
      raw.byteOffset + raw.length,
    )
    w.postMessage({ tarData: tb, target: t.testdir(), id: 2 }, [tb])
    check(t, await p, 2)
  })

  t.test('Uint8Array', async t => {
    const p = new Promise<any>(res => w.once('message', res))
    const tb = new Uint8Array(getTarball()).buffer
    w.postMessage({ tarData: tb, target: t.testdir(), id: 3 }, [tb])
    check(t, await p, 3)
  })

  t.test('report invalid args', async t => {
    const p = new Promise<any>(res => w.once('message', res))
    w.postMessage({ id: 5, target: 13, tarData: 'asdf' })
    t.strictSame(await p, { id: 5, error: 'invalid arguments' })
  })

  t.test('cannot be main', t => {
    const res = spawnSync(
      process.execPath,
      [fileURLToPath(workerScript)],
      {
        encoding: 'utf8',
      },
    )
    t.equal(res.status, 1)
    t.match(res.stderr, /worker\.js should be run in a worker thread/)
    t.end()
  })

  t.end()
})
