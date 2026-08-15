import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { Pax } from 'tar'
import { gzipSync } from 'node:zlib'
import { checkFs, unpack } from '../src/unpack.ts'
import { findTarDir } from '../src/find-tar-dir.ts'
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
    ])
    const dir = t.testdir()
    await t.rejects(
      unpack(maliciousTar, dir),
      'throws an error when no file is extracted',
    )
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
      const maliciousTar = makeTar([{ path, size: 4 }, 'evil'])
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
      await t.rejects(
        unpack(maliciousTar, dir),
        'throws an error when no file is extracted',
      )
    }
  })

  // a prefix comparison would let an entry escape into a sibling dir
  // whose name merely extends the target's
  t.test('blocks escapes into name-extending siblings', async t => {
    for (const path of [
      'package/../foobar/forbidden',
      'package/../foo.bar',
    ]) {
      const brokenTar = makeTar([{ path, size: 4 }, 'broken'])
      const dir = t.testdir()
      await t.rejects(
        unpack(brokenTar, resolve(dir, 'foo')),
        'throws an error when no file is extracted',
      )
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
      const maliciousTar = makeTar([{ path, size: 4 }, 'evil'])
      const dir = t.testdir()
      await t.rejects(
        unpack(maliciousTar, dir),
        'throws an error when no file is extracted',
      )
    }
  })

  t.test('blocks Windows drive-relative path escapes', async t => {
    const driveRelativePaths = [
      'c:../../../windows/system32/evil.dll',
      'd:..\\..\\important\\file.txt',
      'c:foo/../../../escape.txt',
    ]
    for (const path of driveRelativePaths) {
      const maliciousTar = makeTar([{ path, size: 4 }, 'evil'])
      const dir = t.testdir()
      await t.rejects(
        unpack(maliciousTar, dir),
        'throws an error when no file is extracted',
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
      { path: '../../../tmp/evil-dir', type: 'Directory' },
    ])
    const dir = t.testdir()
    await t.rejects(
      unpack(maliciousTar, dir),
      'throws an error when no file is extracted',
    )
  })

  t.test('blocks directory entries with traversal', async t => {
    const maliciousTar = makeTar([
      { path: 'package/../../escape-dir', type: 'Directory' },
    ])
    const dir = t.testdir()
    await t.rejects(
      unpack(maliciousTar, dir),
      'throws an error when no file is extracted',
    )
  })

  t.end()
})

const makeFilesTar = (files: Record<string, string>) => {
  const chunks: (string | { path: string; size: number })[] = []
  for (const [name, body] of Object.entries(files)) {
    chunks.push(
      { path: `package/${name}`, size: Buffer.byteLength(body) },
      body,
    )
  }
  return makeTar(chunks)
}

t.test('last-wins under parallelism', async t => {
  const tar = makeTar([
    { path: 'package/x', size: 1 },
    'a',
    { path: 'package/x', size: 1 },
    'b',
    { path: 'package/x', size: 1 },
    'c',
  ])
  const dir = t.testdirName
  await unpack(tar, dir)
  t.equal(readFileSync(dir + '/x', 'utf8'), 'c')
})

t.test('last-wins collapsed . and .. segments', async t => {
  const tar = makeTar([
    { path: 'package/a/b', size: 1 },
    '1',
    { path: 'package/a/./b', size: 1 },
    '2',
    { path: 'package/bar', size: 1 },
    '3',
    { path: 'package/foo/../bar', size: 1 },
    '4',
  ])
  const dir = t.testdirName
  await unpack(tar, dir)
  t.equal(readFileSync(dir + '/a/b', 'utf8'), '2')
  t.equal(readFileSync(dir + '/bar', 'utf8'), '4')
})

t.test('file/dir collision at same path rejects', async t => {
  const dir = t.testdir()
  const fileThenDir = makeTar([
    { path: 'package/a', size: 1 },
    'x',
    { path: 'package/a/', type: 'Directory' },
  ])
  await t.rejects(
    unpack(fileThenDir, resolve(dir, 'out')),
    { message: 'file/directory collision in tarball' },
    'file then directory',
  )
  const dirThenFile = makeTar([
    { path: 'package/a/', type: 'Directory' },
    { path: 'package/a', size: 1 },
    'x',
  ])
  await t.rejects(
    unpack(dirThenFile, resolve(dir, 'out2')),
    { message: 'file/directory collision in tarball' },
    'directory then file',
  )
})

t.test(
  'A/a last-wins on case-insensitive fs',
  {
    skip:
      process.platform !== 'darwin' &&
      process.platform !== 'win32' &&
      'case-sensitive file system',
  },
  async t => {
    const tar = makeTar([
      { path: 'package/A', size: 1 },
      '1',
      { path: 'package/a', size: 1 },
      '2',
    ])
    const dir = t.testdirName
    await unpack(tar, dir)
    t.equal(readdirSync(dir).length, 1)
    t.equal(readFileSync(dir + '/A', 'utf8'), '2')
    t.equal(readFileSync(dir + '/a', 'utf8'), '2')
  },
)

t.test('empty-after-filter still rejects', async t => {
  const tar = makeTar([
    {
      path: 'package/slinky',
      linkpath: 'package/target',
      type: 'SymbolicLink',
    },
    { path: '../outside/x', size: 1 },
    'x',
  ])
  await t.rejects(
    unpack(tar, t.testdir()),
    'throws an error when no file is extracted',
  )
})

t.test('no preclean on successful unpack', async t => {
  const FSP = await import('node:fs/promises')
  const lstatCalls: string[] = []
  const rimrafCalls: string[] = []
  const { unpack } = await t.mockImport<
    typeof import('../src/unpack.ts')
  >('../src/unpack.ts', {
    'node:fs/promises': t.createMock(FSP, {
      lstat: async (path: Parameters<typeof FSP.lstat>[0]) => {
        lstatCalls.push(String(path))
        return FSP.lstat(path)
      },
    }),
    rimraf: {
      rimraf: async (path: string) => {
        rimrafCalls.push(path)
      },
    },
  })
  const dir = resolve(t.testdir(), 'out')
  await unpack(makeFilesTar({ 'hello.txt': 'hello' }), dir)
  t.equal(readFileSync(dir + '/hello.txt', 'utf8'), 'hello')
  t.strictSame(lstatCalls, [dir])
  t.strictSame(rimrafCalls, [])
})

t.test('concurrent write failure', async t => {
  const dir = t.testdir({ still: 'here' })
  const FSP = await import('node:fs/promises')
  const poop = new Error('poop')
  let n = 0
  const unhandled: unknown[] = []
  const onUnhandled = (er: unknown) => unhandled.push(er)
  process.on('unhandledRejection', onUnhandled)
  t.teardown(() =>
    process.removeListener('unhandledRejection', onUnhandled),
  )
  const { unpack } = await t.mockImport<
    typeof import('../src/unpack.ts')
  >('../src/unpack.ts', {
    'node:fs/promises': t.createMock(FSP, {
      writeFile: async (
        path: Parameters<typeof FSP.writeFile>[0],
        data: Parameters<typeof FSP.writeFile>[1],
        options?: Parameters<typeof FSP.writeFile>[2],
      ) => {
        n++
        if (n === 3) throw poop
        return FSP.writeFile(path, data, options)
      },
    }),
  })
  const files: Record<string, string> = {}
  for (let i = 0; i < 8; i++) files[`f${i}.txt`] = String(i)
  await t.rejects(() => unpack(makeFilesTar(files), dir), poop)
  await new Promise<void>(res => setImmediate(res))
  t.equal(unhandled.length, 0, 'no unhandledRejection')
  t.equal(readFileSync(dir + '/still', 'utf8'), 'here')
  t.throws(() => lstatSync(dir + '/f0.txt'))
})

t.test('lane pool saturation', async t => {
  const prev = process.env.VLT_TAR_WRITE_LANES
  process.env.VLT_TAR_WRITE_LANES = '2'
  t.teardown(() => {
    if (prev === undefined) {
      delete process.env.VLT_TAR_WRITE_LANES
    } else {
      process.env.VLT_TAR_WRITE_LANES = prev
    }
  })
  const { unpack } = await t.mockImport<
    typeof import('../src/unpack.ts')
  >('../src/unpack.ts')
  const files: Record<string, string> = {}
  for (let i = 0; i < 5; i++) files[`f${i}.txt`] = `body-${i}`
  const dir = t.testdirName
  await unpack(makeFilesTar(files), dir)
  for (let i = 0; i < 5; i++) {
    t.equal(readFileSync(dir + `/f${i}.txt`, 'utf8'), `body-${i}`)
  }
})

t.test('invalid VLT_TAR_WRITE_LANES falls back', async t => {
  for (const raw of ['nope', '0', '-1']) {
    const prev = process.env.VLT_TAR_WRITE_LANES
    process.env.VLT_TAR_WRITE_LANES = raw
    t.teardown(() => {
      if (prev === undefined) {
        delete process.env.VLT_TAR_WRITE_LANES
      } else {
        process.env.VLT_TAR_WRITE_LANES = prev
      }
    })
    const { unpack } = await t.mockImport<
      typeof import('../src/unpack.ts')
    >('../src/unpack.ts')
    const dir = t.testdirName
    await unpack(makeFilesTar({ z: 'z' }), dir)
    t.equal(readFileSync(dir + '/z', 'utf8'), 'z', raw)
  }
})

t.test('checkFs differential vs relative() impl', t => {
  const checkFsOld = (
    h: { path?: string },
    tarDir: string | undefined,
    target: string,
  ): boolean => {
    if (!h.path) return false
    if (!tarDir) return false
    h.path = h.path.replace(/[\\/]+/g, '/')
    if (!h.path.startsWith(tarDir)) return false
    const rel = relative(
      target,
      resolve(target, h.path.slice(tarDir.length)),
    )
    if (
      rel === '..' ||
      rel.startsWith(`..${sep}`) ||
      isAbsolute(rel)
    ) {
      return false
    }
    return true
  }

  const fixturePaths = [
    'package/package.json',
    resolve('ignore/absolute/paths'),
    'package/some/empty/dir',
    'package/some/e',
    'outside/directory',
    'package/dir/some-file',
    'package/asdfasdfasdfasdf',
    'package/a',
    'package/slinky',
    '../dots',
    'outside/ignoreme',
    '////package/safe.txt',
    '../etc/passwd',
    'package/../../../etc/passwd',
    'package/foo/../../../../../../tmp/evil',
    '..\\windows\\system32\\config',
    'package/../foobar/forbidden',
    'package/../foo.bar',
    'c:../../../windows/system32/evil.dll',
    'd:..\\..\\important\\file.txt',
    'c:foo/../../../escape.txt',
    'c:\\c:\\d:\\package/safe.txt',
    '../../../tmp/evil-dir',
    'package/../../escape-dir',
  ]

  const permutations = [
    '',
    '.',
    '..',
    './.',
    'package',
    'package/',
    'package/.',
    'package/..',
    'package/./foo',
    'package/foo/.',
    'package/foo/..',
    'package/foo/../bar',
    'package/foo/../../bar',
    'package/a/./b',
    'package/a/b/c/../../d',
    'package/.hidden',
    'package/foo.',
    'package/...',
    'package/foo/bar/baz',
    'package//foo',
    'package\\\\foo',
    'package/c:foo',
    'package/C:foo',
    'package/1:foo',
    'package/:foo',
    '/package/foo',
    'package/../package/foo',
    'package/foo/../../../etc/passwd',
    'foo/bar',
    'package/foo\\bar',
    'package/foo/bar/',
    'package/././foo',
    'package/foo/././bar',
    'package/foo/bar/..',
    'package/foo/bar/../..',
    'package/foo/bar/../../..',
    'package/n:foo',
    'package/foo/bar/baz/qux',
    'PACKAGE/foo',
    'package/foo/./../bar',
    'package/.',
    'package/..',
    'package/../',
    'package/foo//bar',
    'package/./',
    'package/c:/windows/x',
  ]

  const targets = ['/tmp/extract-target', 'C:\\Users\\extract-target']

  const tarDirs = (path: string) => {
    const found = findTarDir(path)
    const dirs: (string | undefined)[] = [
      'package/',
      'package',
      undefined,
    ]
    if (found !== undefined && !dirs.includes(found)) {
      dirs.push(found)
    }
    return dirs
  }

  t.equal(
    checkFs({}, 'package/', targets[0] ?? ''),
    false,
    'missing path',
  )
  t.equal(
    checkFs({ path: 'package/foo' }, undefined, targets[0] ?? ''),
    false,
    'missing tarDir',
  )

  for (const path of [...fixturePaths, ...permutations]) {
    for (const target of targets) {
      for (const tarDir of tarDirs(path)) {
        const next = checkFs({ path }, tarDir, target)
        const old = checkFsOld({ path }, tarDir, target)
        t.equal(next, old, JSON.stringify({ path, tarDir, target }))
      }
    }
  }
  t.end()
})
