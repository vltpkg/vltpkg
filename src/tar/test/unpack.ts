import { lstatSync, readFileSync } from 'fs'
//@ts-expect-error
import mutateFS from 'mutate-fs'
import { resolve } from 'path'
import t, { Test } from 'tap'
import { Pax } from 'tar'
import { gzipSync } from 'zlib'
import { unpack } from '../dist/esm/unpack.js'
import { makeTar } from './fixtures/make-tar.js'

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
const tarball = makeTar([
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

const gzipped = gzipSync(tarball)

t.test('unpack into a dir', t => {
  const check = (t: Test) => {
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

    t.throws(
      () => unpack(tarball.subarray(0, tarball.length - 1024), d),
      {
        message: 'Invalid tarball: not terminated by 1024 null bytes',
      },
    )
    t.throws(() => unpack(Buffer.alloc(512), d), {
      message: 'Invalid tarball: not terminated by 1024 null bytes',
    })
    t.throws(() => unpack(Buffer.alloc(5), d), {
      message: 'Invalid tarball: length not divisible by 512',
    })
    // got path overridden with pax header
    t.throws(() => lstatSync(d + '/some/e'))
    const dir = lstatSync(d + '/some/empty/dir')
    t.equal(dir.isDirectory(), true)
    if (process.platform !== 'win32') {
      t.equal(dir.mode & 0o700, 0o700, 'dir is mode 0o7xx')
    }
    t.end()
  }

  t.test('buffer', t => {
    unpack(tarball, t.testdir())
    check(t)
  })

  t.test('buffer, folder does not exist yet', t => {
    unpack(tarball, t.testdirName)
    check(t)
  })

  t.test('gzipped', t => {
    unpack(gzipped, t.testdir())
    check(t)
  })

  t.test('Uint8Array', t => {
    unpack(new Uint8Array(tarball), t.testdir())
    check(t)
  })

  t.test('ArrayBuffer', t => {
    unpack(new Uint8Array(tarball).buffer, t.testdir())
    check(t)
  })

  t.test('errors do not leave garbage lying around', t => {
    const dir = t.testdir({ still: 'here' })
    t.teardown(mutateFS.fail('write', new Error('poop')))
    t.throws(() => unpack(tarball, dir), new Error('poop'))
    t.equal(readFileSync(dir + '/still', 'utf8'), 'here')
    t.end()
  })

  t.end()
})
