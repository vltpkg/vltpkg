import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { Pax } from 'tar'
import type { HeaderData } from 'tar'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import {
  checkFs,
  unpack as unpackAsync,
  unpackFileSync,
  unpackSync,
  unpackToStoreSync,
} from '../src/unpack.ts'
import type { TarballFormat } from '../src/unpack.ts'
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
const paxPath = new Pax({
  path: 'package/some/empty/dir',
  // this is actually ignored
  mode: 0o666,
}).encode()
const longPath = 'package/asdfasdfasdfasdf'
const absolutePath = resolve('ignore/absolute/paths')
const pjEntry: (string | HeaderData)[] = [
  { path: 'package/package.json', size: pj.length },
  pj,
]

// a mix of everything, only used where the individual entries do not
// matter: writer parity and the failure/cleanup paths. `tarDir` is
// resolved once per archive, so every behavior assertion builds its own
// archive below rather than sharing this one.
const tarball = makeTar([
  ...pjEntry,

  { path: absolutePath, size: 1 },
  'z',

  // just here for coverage, doesn't actually do anything relevant
  gex,

  // this overrides the path
  paxPath,
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

// every case that is pure unpack behavior runs through both writers, so
// the sync path cannot drift from the async one.
type Unpacker = (
  tarData: Buffer,
  target: string,
  format?: TarballFormat,
) => Promise<void>
type UnpackModule = typeof import('../src/unpack.ts')
const writers: [string, (m: UnpackModule) => Unpacker][] = [
  ['async', m => m.unpack],
  [
    'sync',
    m => async (b, target, format) => m.unpackSync(b, target, format),
  ],
]
const real = { unpack: unpackAsync, unpackSync } as UnpackModule

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

for (const [writer, get] of writers) {
  const unpack = get(real)
  t.test(writer, t => {
    // one archive per behavior: `tarDir` is resolved from the first
    // entry of an archive, so a shared fixture would let that single
    // resolution decide every assertion.
    t.test('unpack a file into a dir', t => {
      const tar = makeTar([...pjEntry])
      const check = (t: Test, d: string) => {
        t.equal(lstatSync(d + '/package.json').isFile(), true)
        t.equal(readFileSync(d + '/package.json', 'utf8'), pj)
      }

      t.test('buffer', async t => {
        const d = t.testdir()
        await unpack(tar, d)
        check(t, d)
      })

      t.test('buffer, folder does not exist yet', async t => {
        const d = t.testdirName
        await unpack(tar, d)
        check(t, d)
      })

      t.test('gzipped', async t => {
        const d = t.testdir()
        await unpack(gzipSync(tar), d)
        check(t, d)
      })

      t.test('brotli, declared', async t => {
        const d = t.testdir()
        await unpack(brotliCompressSync(tar), d, 'brotli')
        check(t, d)
      })

      t.test('brotli is never sniffed', async t => {
        // no magic bytes to find: an undeclared .tar.br reads as a raw
        // tar, which is exactly why the format has to be passed in.
        await t.rejects(
          () => unpack(brotliCompressSync(tar), t.testdir()),
          { message: /Invalid tarball/ },
        )
      })

      t.end()
    })

    t.test('ignores mode, mtime and uid', async t => {
      const tar = makeTar([
        {
          path: 'package/dir/some-file',
          mode: 0o123,
          uid: 1234,
          mtime: new Date('2024-01-01'),
          size: 1,
        },
        'x',
      ])
      const d = t.testdirName
      await unpack(tar, d)
      const f = lstatSync(d + '/dir/some-file')
      t.equal(f.isFile(), true)
      t.not(f.mtime.toISOString(), '2024-01-01T00:00:00.000Z')
      t.not(f.mode & 0o777, 0o123)
    })

    t.test('an absolute path cannot become the tarDir', async t => {
      const tar = makeTar([
        { path: absolutePath, size: 1 },
        'z',
        ...pjEntry,
      ])
      const d = t.testdirName
      await unpack(tar, d)
      t.throws(() => lstatSync(absolutePath))
      t.equal(readFileSync(d + '/package.json', 'utf8'), pj)
    })

    t.test('ignores absolute paths outside the tarDir', async t => {
      const tar = makeTar([
        ...pjEntry,
        { path: absolutePath, size: 1 },
        'z',
      ])
      const d = t.testdirName
      await unpack(tar, d)
      t.throws(() => lstatSync(absolutePath))
      t.strictSame(readdirSync(d), ['package.json'])
    })

    t.test('ignores entries outside the tarDir', async t => {
      const tar = makeTar([
        ...pjEntry,
        { path: 'outside/directory', type: 'Directory' },
        { path: 'outside/ignoreme', size: 1 },
        'x',
        { path: '../dots', size: 1 },
        'x',
      ])
      const d = t.testdirName
      await unpack(tar, d)
      t.throws(() => lstatSync(d + '/../dots'))
      t.throws(() => lstatSync(d + '/ignoreme'))
      t.throws(() => lstatSync(d + '/directory'))
      t.throws(() => lstatSync(d + '/../outside/directory'))
      t.strictSame(readdirSync(d), ['package.json'])
    })

    t.test('filters out symbolic links', async t => {
      const tar = makeTar([
        ...pjEntry,
        {
          path: 'package/slinky',
          linkpath: 'package/target',
          type: 'SymbolicLink',
        },
      ])
      const d = t.testdirName
      await unpack(tar, d)
      t.throws(() => lstatSync(d + '/slinky'))
      t.strictSame(readdirSync(d), ['package.json'])
    })

    t.test('skips invalid headers', async t => {
      const tar = makeTar([
        Buffer.from('not a valid tar header, ignore and skip this'),
        ...pjEntry,
      ])
      const d = t.testdirName
      await unpack(tar, d)
      t.equal(readFileSync(d + '/package.json', 'utf8'), pj)
    })

    t.test('ignores global extended headers', async t => {
      const tar = makeTar([gex, ...pjEntry])
      const d = t.testdirName
      await unpack(tar, d)
      t.equal(readFileSync(d + '/package.json', 'utf8'), pj)
    })

    t.test('a pax header overrides the entry path', async t => {
      const tar = makeTar([
        paxPath,
        { path: 'package/some/e', type: 'Directory' },
      ])
      const d = t.testdirName
      await unpack(tar, d)
      t.throws(() => lstatSync(d + '/some/e'))
      const dir = lstatSync(d + '/some/empty/dir')
      t.equal(dir.isDirectory(), true)
      if (process.platform !== 'win32') {
        // the mode in the pax header is ignored
        t.equal(dir.mode & 0o700, 0o700, 'dir is mode 0o7xx')
      }
    })

    t.test('a long path header overrides the entry path', async t => {
      const tar = makeTar([
        {
          path: '././@LongPath',
          type: 'NextFileHasLongPath',
          size: longPath.length,
        },
        longPath,
        { path: 'package/a', size: 1 },
        'a',
      ])
      const d = t.testdirName
      await unpack(tar, d)
      t.throws(() => lstatSync(d + '/a'))
      t.equal(readFileSync(d + '/asdfasdfasdfasdf', 'utf8'), 'a')
    })

    t.test('rejects malformed tarballs', async t => {
      const tar = makeTar([...pjEntry])
      const d = t.testdir()
      await t.rejects(
        () => unpack(tar.subarray(0, tar.length - 1024), d),
        {
          message:
            'Invalid tarball: not terminated by 1024 null bytes',
        },
      )
      await t.rejects(() => unpack(Buffer.alloc(512), d), {
        message: 'Invalid tarball: not terminated by 1024 null bytes',
      })
      await t.rejects(() => unpack(Buffer.alloc(5), d), {
        message: 'Invalid tarball: length not divisible by 512',
      })
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
          await t.rejects(
            unpack(maliciousTar, dir),
            'throws an error when no file is extracted',
          )
        }
      })

      // a prefix comparison would let an entry escape into a sibling dir
      // whose name merely extends the target's
      t.test(
        'blocks escapes into name-extending siblings',
        async t => {
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
        },
      )

      // Test: Windows drive-relative paths should be blocked
      t.test(
        'blocks Windows drive-relative path escapes',
        async t => {
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
        },
      )

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

      t.test(
        'blocks directory entries escaping the tarDir',
        async t => {
          const maliciousTar = makeTar([
            { path: 'package/../../escape-dir', type: 'Directory' },
          ])
          const dir = t.testdir()
          await t.rejects(
            unpack(maliciousTar, dir),
            'throws an error when no file is extracted',
          )
        },
      )

      t.end()
    })

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

    t.test('gzip decompression ratio cap', async t => {
      const bomb = gzipSync(Buffer.alloc(2 * 1024 * 1024))
      await t.rejects(() => unpack(bomb, t.testdir()), {
        message: 'tarball exceeds maximum unpacked size',
      })
    })

    t.test('brotli decompression ratio cap', async t => {
      const bomb = brotliCompressSync(Buffer.alloc(8 * 1024 * 1024))
      await t.rejects(() => unpack(bomb, t.testdir(), 'brotli'), {
        message: 'tarball exceeds maximum unpacked size',
      })
    })

    t.test('non-bomb brotli errors pass through', async t => {
      await t.rejects(
        () =>
          unpack(Buffer.from('not brotli'), t.testdir(), 'brotli'),
        { code: /^ERR_/ },
      )
    })

    t.test('gzip absolute unpacked size ceiling', async t => {
      const prev = process.env.VLT_TAR_MAX_UNPACKED_BYTES
      process.env.VLT_TAR_MAX_UNPACKED_BYTES = '4096'
      t.teardown(() => {
        if (prev === undefined) {
          delete process.env.VLT_TAR_MAX_UNPACKED_BYTES
        } else {
          process.env.VLT_TAR_MAX_UNPACKED_BYTES = prev
        }
      })
      const unpack = get(
        await t.mockImport<UnpackModule>('../src/unpack.ts'),
      )
      await t.rejects(() => unpack(gzipped, t.testdir()), {
        message: 'tarball exceeds maximum unpacked size',
      })
    })

    t.test(
      'invalid VLT_TAR_MAX_UNPACKED_BYTES falls back',
      async t => {
        const gzippedFiles = gzipSync(makeFilesTar({ z: 'z' }))
        for (const raw of ['nope', '0', '-1']) {
          const prev = process.env.VLT_TAR_MAX_UNPACKED_BYTES
          process.env.VLT_TAR_MAX_UNPACKED_BYTES = raw
          t.teardown(() => {
            if (prev === undefined) {
              delete process.env.VLT_TAR_MAX_UNPACKED_BYTES
            } else {
              process.env.VLT_TAR_MAX_UNPACKED_BYTES = prev
            }
          })
          const unpack = get(
            await t.mockImport<UnpackModule>('../src/unpack.ts'),
          )
          const dir = t.testdirName
          await unpack(gzippedFiles, dir)
          t.equal(readFileSync(dir + '/z', 'utf8'), 'z', raw)
        }
      },
    )

    t.test('non-bomb zlib errors pass through', async t => {
      const garbage = Buffer.from([
        0x1f, 0x8b, 0xff, 0xff, 0xff, 0xff,
      ])
      await t.rejects(() => unpack(garbage, t.testdir()), {
        message: 'unknown compression method',
      })
    })
    t.end()
  })
}

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
      rimrafSync: (path: string) => {
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

t.test('both writers produce identical trees', async t => {
  const d = t.testdir()
  const tree = (dir: string) =>
    readdirSync(dir, { recursive: true })
      .map(
        f =>
          `${f} ${(lstatSync(resolve(dir, String(f))).mode & 0o777).toString(8)}`,
      )
      .sort()
  await unpackAsync(tarball, resolve(d, 'a'))
  unpackSync(tarball, resolve(d, 's'))
  t.strictSame(tree(resolve(d, 's')), tree(resolve(d, 'a')))
})

t.test('unpackFileSync', async t => {
  const head = Buffer.from('cache head bytes')
  const d = t.testdir({
    'pkg.tgz': gzipped,
    'entry.bin': Buffer.concat([head, gzipped]),
  })
  unpackFileSync(resolve(d, 'pkg.tgz'), resolve(d, 'out'))
  t.equal(readFileSync(resolve(d, 'out/package.json'), 'utf8'), pj)
  unpackFileSync(
    resolve(d, 'entry.bin'),
    resolve(d, 'offset'),
    head.length,
  )
  t.equal(readFileSync(resolve(d, 'offset/package.json'), 'utf8'), pj)
  t.throws(
    () => unpackFileSync(resolve(d, 'nope.tgz'), resolve(d, 'out2')),
    { code: 'ENOENT' },
  )
  // an offset past EOF yields an empty buffer: 0 % 512 passes, the
  // trailing-null check is what rejects it
  t.throws(
    () =>
      unpackFileSync(resolve(d, 'pkg.tgz'), resolve(d, 'out3'), 1e9),
    { message: 'Invalid tarball: not terminated by 1024 null bytes' },
  )
})

t.test('unpackFileSync, brotli', async t => {
  const head = Buffer.from('cache head bytes')
  const br = brotliCompressSync(tarball)
  const d = t.testdir({
    'pkg.tar.br': br,
    'entry.bin': Buffer.concat([head, br]),
  })
  unpackFileSync(
    resolve(d, 'pkg.tar.br'),
    resolve(d, 'out'),
    0,
    'brotli',
  )
  t.equal(readFileSync(resolve(d, 'out/package.json'), 'utf8'), pj)
  unpackFileSync(
    resolve(d, 'entry.bin'),
    resolve(d, 'offset'),
    head.length,
    'brotli',
  )
  t.equal(readFileSync(resolve(d, 'offset/package.json'), 'utf8'), pj)
})

t.test('sync errors do not leave garbage lying around', async t => {
  const dir = t.testdir({ still: 'here' })
  const FS = await import('node:fs')
  const poop = new Error('poop')
  const { unpackSync } = await t.mockImport<UnpackModule>(
    '../src/unpack.ts',
    {
      'node:fs': t.createMock(FS, {
        writeFileSync: () => {
          throw poop
        },
      }),
    },
  )
  t.throws(() => unpackSync(tarball, dir), poop)
  t.equal(readFileSync(dir + '/still', 'utf8'), 'here')
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

t.test('unpackToStoreSync', async t => {
  const prevMask = process.umask(0o022)
  t.teardown(() => {
    process.umask(prevMask)
  })
  const isWin = process.platform === 'win32'
  const mode = (p: string) => lstatSync(p).mode & 0o777
  const tree = (dir: string) =>
    readdirSync(dir, { recursive: true })
      .map(f => {
        const p = resolve(dir, String(f))
        const st = lstatSync(p)
        const body = st.isFile() ? readFileSync(p, 'utf8') : '/'
        return `${String(f)} ${(st.mode & 0o777).toString(8)} ${body}`
      })
      .sort()

  t.test('index, modes and bins', async t => {
    const pj = JSON.stringify({
      name: '@s/p',
      version: '1.0.0',
      bin: { p: './bin/p.js', q: 'lib/q' },
    })
    const tar = makeTar([
      { path: 'package/package.json', size: pj.length },
      pj,
      { path: 'package/bin/p.js', size: 1, mode: 0o644 },
      'p',
      { path: 'package/lib/q', size: 1, mode: 0o644 },
      'q',
      { path: 'package/lib/deep/x/y.js', size: 1, mode: 0o755 },
      'y',
      // today's unpack only honors the world exec bit
      { path: 'package/owner-exec', size: 1, mode: 0o744 },
      'o',
      { path: 'package/README', size: 2, mode: 0o644 },
      'hi',
      { path: 'package/lib/binding.gyp', size: 1, mode: 0o644 },
      'g',
      { path: 'package/empty/dir', type: 'Directory' },
    ])
    // parents of the tmp dir are created
    const dir = resolve(t.testdir(), '.tmp/abc.1')
    const { index } = unpackToStoreSync(gzipSync(tar), dir)
    t.strictSame(index, {
      v: 1,
      files: [
        ['README', 2, 0],
        ['bin/p.js', 1, 1],
        ['lib/binding.gyp', 1, 0],
        ['lib/deep/x/y.js', 1, 1],
        ['lib/q', 1, 1],
        ['owner-exec', 1, 0],
        ['package.json', pj.length, 0],
      ],
      dirs: [
        'bin',
        'lib',
        'empty',
        'lib/deep',
        'empty/dir',
        'lib/deep/x',
      ],
      // binding.gyp only counts at the package root
      scripts: false,
      bins: { p: 'bin/p.js', q: 'lib/q' },
      name: '@s/p',
      version: '1.0.0',
      manifest: JSON.stringify(JSON.parse(pj)),
    })
    t.equal(
      readFileSync(resolve(dir, 'lib/deep/x/y.js'), 'utf8'),
      'y',
    )
    t.equal(lstatSync(resolve(dir, 'empty/dir')).isDirectory(), true)
    if (!isWin) {
      for (const [p, , exec] of index.files) {
        t.equal(mode(resolve(dir, p)), exec ? 0o755 : 0o644, p)
      }
      for (const p of index.dirs) {
        t.equal(mode(resolve(dir, p)), 0o755, p)
      }
    }
  })

  t.test(
    'bins get the bin chmod mode under any umask',
    { skip: isWin && 'no posix modes' },
    async t => {
      process.umask(0o027)
      t.teardown(() => {
        process.umask(0o022)
      })
      const pj = JSON.stringify({ bin: { a: 'a.js', b: 'b.js' } })
      const tar = makeTar([
        { path: 'package/package.json', size: pj.length },
        pj,
        { path: 'package/a.js', size: 1, mode: 0o644 },
        'a',
        { path: 'package/b.js', size: 1, mode: 0o755 },
        'b',
        { path: 'package/c.js', size: 1, mode: 0o755 },
        'c',
      ])
      const dir = resolve(t.testdir(), 'x')
      unpackToStoreSync(tar, dir)
      // (mode & 0o777) | 0o111, as reify leaves an unpacked bin
      t.equal(mode(resolve(dir, 'a.js')), 0o751)
      t.equal(mode(resolve(dir, 'b.js')), 0o751)
      // not a bin: as unpackSync writes it
      t.equal(mode(resolve(dir, 'c.js')), 0o750)
    },
  )

  t.test('dirs differing only by case', async t => {
    // a case-insensitive fs on a case-folding platform
    t.intercept(process, 'platform', { value: 'darwin' })
    const FS = await import('node:fs')
    const made = new Set<string>()
    const { unpackToStoreSync } = await t.mockImport<UnpackModule>(
      '../src/unpack.ts',
      {
        'node:fs': t.createMock(FS, {
          mkdirSync: (p: string, o?: { recursive?: boolean }) => {
            const k = p.toLowerCase()
            if (made.has(k) && !o?.recursive) {
              throw Object.assign(new Error('EEXIST'), {
                code: 'EEXIST',
              })
            }
            made.add(k)
          },
          writeFileSync: () => {},
        }),
      },
    )
    const { index } = unpackToStoreSync(
      makeFilesTar({
        'package.json': '{}',
        'Lib/a.js': 'a',
        'lib/b.js': 'b',
      }),
      resolve(t.testdir(), 'x'),
    )
    t.strictSame(index.dirs, ['Lib', 'lib'])
  })

  t.test('brotli', async t => {
    // the store writer is told the same way unpack() is: nothing in the
    // bytes says brotli, and a cache entry's key (its url) is the signal.
    const dir = resolve(t.testdir(), 'br')
    const { index } = unpackToStoreSync(
      brotliCompressSync(makeFilesTar({ 'package.json': pj })),
      dir,
      'brotli',
    )
    t.strictSame(index.files, [['package.json', pj.length, 0]])
    t.equal(readFileSync(resolve(dir, 'package.json'), 'utf8'), pj)
  })

  t.test('scripts', async t => {
    const scripts = (files: Record<string, string>) =>
      unpackToStoreSync(
        makeFilesTar(files),
        resolve(t.testdir(), 'x'),
      ).index.scripts
    t.equal(
      scripts({ 'package.json': '{}', 'binding.gyp': '{}' }),
      true,
      'root binding.gyp',
    )
    t.equal(
      scripts({
        'package.json': JSON.stringify({
          scripts: { postinstall: 'x' },
        }),
      }),
      true,
      'install script',
    )
    t.equal(scripts({ 'package.json': '{}' }), false, 'none')
  })

  t.test('same tree as unpackSync without bins', async t => {
    const d = t.testdir()
    unpackSync(tarball, resolve(d, 'u'))
    const { index } = unpackToStoreSync(tarball, resolve(d, 's'))
    t.strictSame(tree(resolve(d, 's')), tree(resolve(d, 'u')))
    // ancestors of entries included, shortest first
    t.strictSame(index.dirs, [
      'dir',
      'some',
      'some/empty',
      'some/empty/dir',
    ])
  })

  t.test('rejects, writing nothing', async t => {
    const d = t.testdir({ exists: { keep: 'me' } })
    const tmp = resolve(d, 'tmp')
    t.throws(
      () => unpackToStoreSync(makeFilesTar({ 'a.js': 'a' }), tmp),
      { message: 'no package.json in tarball' },
    )
    t.throws(
      () =>
        unpackToStoreSync(makeFilesTar({ 'package.json': '[' }), tmp),
      { message: 'invalid package.json in tarball' },
    )
    t.throws(() => unpackToStoreSync(Buffer.alloc(10), tmp), {
      message: 'Invalid tarball: length not divisible by 512',
    })
    t.equal(existsSync(tmp), false)
    t.throws(
      () =>
        unpackToStoreSync(
          makeFilesTar({ 'package.json': '{}' }),
          resolve(d, 'exists'),
        ),
      { code: 'EEXIST' },
    )
    t.equal(readFileSync(resolve(d, 'exists/keep'), 'utf8'), 'me')
  })

  t.test('write failure removes dir', async t => {
    const FS = await import('node:fs')
    const poop = new Error('poop')
    const { unpackToStoreSync } = await t.mockImport<UnpackModule>(
      '../src/unpack.ts',
      {
        'node:fs': t.createMock(FS, {
          writeFileSync: () => {
            throw poop
          },
        }),
      },
    )
    const d = t.testdir()
    t.throws(
      () =>
        unpackToStoreSync(
          makeFilesTar({ 'package.json': '{}' }),
          resolve(d, 'x'),
        ),
      poop,
    )
    t.strictSame(readdirSync(d), [])
  })
})
