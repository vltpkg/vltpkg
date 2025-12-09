import { existsSync, lstatSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { Pax } from 'tar'
import { gzipSync } from 'node:zlib'
import { unpack } from '../src/unpack.ts'
import { makeTar } from './fixtures/make-tar.ts'

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
// TODO: these fixtures will need to be rewritten each on their own
// makeTar call, since the `tarDir` is cached in between file runs,
// it may be masking issues.
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
  const check = async (t: Test) => {
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

    await t.rejects(
      () => unpack(tarball.subarray(0, tarball.length - 1024), d),
      {
        message: 'Invalid tarball: not terminated by 1024 null bytes',
      },
    )
    await t.rejects(() => unpack(Buffer.alloc(512), d), {
      message: 'Invalid tarball: not terminated by 1024 null bytes',
    })
    await t.rejects(() => unpack(Buffer.alloc(5), d), {
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

  t.test('buffer', async t => {
    await unpack(tarball, t.testdir())
    await check(t)
  })

  t.test('buffer, folder does not exist yet', async t => {
    await unpack(tarball, t.testdirName)
    await check(t)
  })

  t.test('gzipped', async t => {
    await unpack(gzipped, t.testdir())
    await check(t)
  })

  t.test('errors do not leave garbage lying around', async t => {
    const dir = t.testdir({ still: 'here' })
    const FSP = await import('node:fs/promises')
    const poop = new Error('poop')
    const { unpack } = await t.mockImport<
      typeof import('../src/unpack.ts')
    >('../src/unpack.ts', {
      'node:fs/promises': t.createMock(FSP, {
        writeFile: async () => {
          throw poop
        },
      }),
    })
    await t.rejects(() => unpack(tarball, dir), poop)
    t.equal(readFileSync(dir + '/still', 'utf8'), 'here')
    t.end()
  })

  t.end()
})

t.test('validate unpack path sanitization', async t => {
  // Test: Multiple absolute path prefixes should be denied
  t.test('strips multiple absolute path prefixes', async t => {
    const maliciousTar = makeTar([
      { path: '////package/safe.txt', size: 4 },
      'safe',
      { path: 'package/valid.txt', size: 5 },
      'valid',
    ])
    const dir = t.testdir()
    await unpack(maliciousTar, dir)
    // The file should fail to be extracted
    t.equal(existsSync(dir + '/safe.txt'), false)
    // Should NOT escape to root
    t.equal(existsSync('/package/safe.txt'), false)
    // Valid file should be extracted
    t.equal(existsSync(dir + '/valid.txt'), true)
  })

  // Test: Path traversal with .. should be blocked
  t.test('blocks path traversal with ..', async t => {
    const traversalPaths = [
      '../etc/passwd',
      'package/../../../etc/passwd',
      'package/foo/../../../../../../tmp/evil',
      '..\\windows\\system32\\config',
    ]
    for (const path of traversalPaths) {
      const maliciousTar = makeTar([
        { path: 'package/valid.txt', size: 5 },
        'valid',
        { path, size: 4 },
        'evil',
      ])
      const dir = t.testdir()
      const FSP = await import('node:fs/promises')
      const mkdirCalls: string[] = []
      const writeFileCalls: string[] = []
      const { unpack } = await t.mockImport<
        typeof import('../src/unpack.ts')
      >('../src/unpack.ts', {
        'node:fs/promises': t.createMock(FSP, {
          mkdir: async (path: string, ...args: any[]) => {
            mkdirCalls.push(path)
            return FSP.mkdir(path, ...args)
          },
          writeFile: async (
            path: string,
            data: Parameters<typeof FSP.writeFile>[1],
            options?: Parameters<typeof FSP.writeFile>[2],
          ) => {
            writeFileCalls.push(path)
            return FSP.writeFile(path, data, options)
          },
        }),
      })
      await unpack(maliciousTar, dir)
      t.equal(
        existsSync(dir + '/valid.txt'),
        true,
        `valid file exists for ${path}`,
      )
      // Verify no mkdir or writeFile calls contain '..'
      for (const call of mkdirCalls) {
        t.notMatch(
          call,
          /(?<!\.)\.\.(?!\.)/, // not match .. or .\.
          `mkdir should not be called with .. in path: ${call}`,
        )
      }
      for (const call of writeFileCalls) {
        t.notMatch(
          call,
          /(?<!\.)\.\.(?!\.)/, // not match .. or .\.
          `writeFile should not be called with .. in path: ${call}`,
        )
      }
    }
  })

  // Test: Windows drive-relative paths should be blocked
  t.test('blocks Windows drive-relative path escapes', async t => {
    const driveRelativePaths = [
      'c:../../../windows/system32/evil.dll',
      'd:..\\..\\important\\file.txt',
      'c:foo/../../../escape.txt',
    ]
    for (const path of driveRelativePaths) {
      const maliciousTar = makeTar([
        { path: 'package/valid.txt', size: 5 },
        'valid',
        { path, size: 4 },
        'evil',
      ])
      const dir = t.testdir()
      await unpack(maliciousTar, dir)
      t.equal(
        existsSync(dir + '/valid.txt'),
        true,
        `valid file exists for ${path}`,
      )
    }
  })

  // Test: Chained Windows roots should be blocked
  t.test('strips chained Windows roots', async t => {
    const maliciousTar = makeTar([
      { path: 'c:\\c:\\d:\\package/safe.txt', size: 4 },
      'safe',
    ])
    const dir = t.testdir()
    await t.rejects(
      unpack(maliciousTar, dir),
      'throws an error when no file is extracted',
    )
  })

  // Test: Directory traversal via symlink-like paths (though symlinks are already filtered)
  t.test('blocks directory entries with traversal', async t => {
    const maliciousTar = makeTar([
      { path: 'package/valid.txt', size: 5 },
      'valid',
      { path: '../../../tmp/evil-dir', type: 'Directory' },
      { path: 'package/../../escape-dir', type: 'Directory' },
    ])
    const dir = t.testdir()
    await unpack(maliciousTar, dir)
    t.equal(existsSync(dir + '/valid.txt'), true)
    t.equal(existsSync('/tmp/evil-dir'), false)
  })

  t.end()
})
