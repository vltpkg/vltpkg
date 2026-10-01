import * as FS from 'node:fs'
import * as FSP from 'node:fs/promises'
import {
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { unshare } from '../../src/reify/unshare.ts'

const isWin = process.platform === 'win32'
const files = ['package.json', 'index.js', 'bin/cli.js', 'lib/a.js']

// a store entry, linked into pkg (except `skip`)
const setup = (t: Test, skip: string[] = []) => {
  const dir = t.testdir({
    store: {
      'package.json': '{"name":"x"}',
      'index.js': 'index',
      bin: { 'cli.js': 'cli' },
      lib: { 'a.js': 'a' },
    },
    pkg: {},
  })
  FS.chmodSync(resolve(dir, 'store/bin/cli.js'), 0o755)
  const store = resolve(dir, 'store')
  const pkg = resolve(dir, 'pkg')
  mkdirSync(resolve(pkg, 'bin'))
  mkdirSync(resolve(pkg, 'lib'))
  for (const f of files) {
    if (skip.includes(f)) {
      writeFileSync(resolve(pkg, f), readFileSync(resolve(store, f)))
    } else linkSync(resolve(store, f), resolve(pkg, f))
  }
  return { store, pkg }
}

const ino = (p: string) => statSync(p, { bigint: true }).ino

t.test('shared package: every file copied', async t => {
  const prev = process.umask(0o027)
  t.teardown(() => {
    process.umask(prev)
  })
  const { store, pkg } = setup(t)
  const before = files.map(f => ino(resolve(pkg, f)))
  await unshare(pkg)
  files.forEach((f, i) => {
    const s = statSync(resolve(store, f))
    const p = statSync(resolve(pkg, f))
    t.equal(p.nlink, 1, `${f} private`)
    t.equal(s.nlink, 1, `${f} store`)
    t.not(ino(resolve(pkg, f)), before[i], `${f} new inode`)
    t.equal(ino(resolve(store, f)), before[i], `${f} store inode`)
    t.equal(
      readFileSync(resolve(pkg, f), 'utf8'),
      readFileSync(resolve(store, f), 'utf8'),
    )
  })
  if (!isWin) {
    // like a copy from the store: bins keep their mode, the rest umask'd
    const mode = (f: string) => statSync(resolve(pkg, f)).mode & 0o777
    t.equal(mode('bin/cli.js'), 0o755)
    t.equal(mode('index.js'), 0o640)
  }
  t.strictSame(readdirSync(pkg).sort(), [
    'bin',
    'index.js',
    'lib',
    'package.json',
  ])
  writeFileSync(resolve(pkg, 'index.js'), 'changed')
  t.equal(readFileSync(resolve(store, 'index.js'), 'utf8'), 'index')
})

// windows reports no exec bits: fake them
t.test('exec files get the store mode', async t => {
  const { pkg } = setup(t)
  const chmods: [string, number][] = []
  const { unshare: mocked } = await t.mockImport<
    typeof import('../../src/reify/unshare.ts')
  >('../../src/reify/unshare.ts', {
    'node:fs': t.createMock(FS, {
      lstatSync: ((p: string, o?: FS.StatSyncOptions) => {
        const st = FS.lstatSync(p, o) as FS.Stats | undefined
        if (st && p.endsWith('cli.js')) st.mode |= 0o751
        return st
      }) as typeof FS.lstatSync,
    }),
    'node:fs/promises': t.createMock(FSP, {
      chmod: async (p: FS.PathLike, mode: FS.Mode) => {
        chmods.push([String(p), Number(mode)])
      },
    }),
  })
  await mocked(pkg)
  t.strictSame(
    chmods.map(([p, m]) => [dirname(p), m & 0o111]),
    [[resolve(pkg, 'bin'), 0o111]],
  )
  t.equal(statSync(resolve(pkg, 'bin/cli.js')).nlink, 1)
})

t.test('private package.json: nothing touched', async t => {
  const { pkg } = setup(t, ['package.json'])
  const before = files.map(f => ino(resolve(pkg, f)))
  await unshare(pkg)
  t.strictSame(
    files.map(f => ino(resolve(pkg, f))),
    before,
  )
})

t.test('no package.json: nothing touched', async t => {
  const { pkg } = setup(t)
  FS.rmSync(resolve(pkg, 'package.json'))
  await unshare(pkg)
  t.equal(statSync(resolve(pkg, 'index.js')).nlink, 2)
})

t.test('private file in a shared package kept', async t => {
  const { pkg } = setup(t, ['lib/a.js'])
  const a = ino(resolve(pkg, 'lib/a.js'))
  await unshare(pkg)
  t.equal(ino(resolve(pkg, 'lib/a.js')), a)
  t.equal(statSync(resolve(pkg, 'index.js')).nlink, 1)
})

t.test('dir symlinks not followed', async t => {
  const { pkg } = setup(t)
  const other = resolve(pkg, '../other')
  mkdirSync(other)
  writeFileSync(resolve(other, 'o.js'), 'o')
  linkSync(resolve(other, 'o.js'), resolve(other, 'o2.js'))
  const o = ino(resolve(other, 'o.js'))
  // junction: no privilege needed on windows, a symlink elsewhere
  symlinkSync(other, resolve(pkg, 'lnk'), 'junction')
  symlinkSync(pkg, resolve(pkg, 'lib/loop'), 'junction')
  await unshare(pkg)
  t.equal(ino(resolve(other, 'o.js')), o)
  t.equal(statSync(resolve(other, 'o.js')).nlink, 2)
  for (const f of files) {
    t.equal(statSync(resolve(pkg, f)).nlink, 1, f)
  }
})

t.test("a killed run's tmp copy is removed", async t => {
  const { pkg } = setup(t)
  const stray = resolve(pkg, 'lib/.vlt-unshare-0badf00d-3')
  writeFileSync(stray, 'partial')
  await unshare(pkg)
  t.strictSame(readdirSync(resolve(pkg, 'lib')), ['a.js'])
  t.equal(statSync(resolve(pkg, 'lib/a.js')).nlink, 1)
})

t.test('failed: package.json still shared, retry', async t => {
  const fails: Record<string, Partial<typeof FSP>> = {
    read: {
      readFile: (async (p: FS.PathLike) => {
        if (String(p).endsWith('a.js')) throw new Error('EIO')
        return FSP.readFile(p)
      }) as typeof FSP.readFile,
    },
    // a partial tmp copy is removed, the shared file kept
    write: {
      writeFile: (async (
        p: FS.PathLike,
        data: string,
        o: FS.WriteFileOptions,
      ) => {
        const lib = dirname(String(p)).endsWith('lib')
        await FSP.writeFile(p, lib ? '' : data, o)
        if (lib) throw new Error('EIO')
      }) as typeof FSP.writeFile,
    },
    // e.g. a file held open on windows
    rename: {
      rename: async (from: FS.PathLike, to: FS.PathLike) => {
        if (dirname(String(to)).endsWith('lib')) {
          throw new Error('EIO')
        }
        return FSP.rename(from, to)
      },
    },
  }
  for (const [name, mock] of Object.entries(fails)) {
    t.test(name, async t => {
      const { pkg } = setup(t)
      const { unshare: failing } = await t.mockImport<
        typeof import('../../src/reify/unshare.ts')
      >('../../src/reify/unshare.ts', {
        'node:fs/promises': t.createMock(FSP, mock),
      })
      await t.rejects(failing(pkg), { message: 'EIO' })
      t.equal(statSync(resolve(pkg, 'package.json')).nlink, 2)
      t.equal(statSync(resolve(pkg, 'lib/a.js')).nlink, 2)
      t.equal(readFileSync(resolve(pkg, 'lib/a.js'), 'utf8'), 'a')
      t.strictSame(readdirSync(resolve(pkg, 'lib')), ['a.js'])
      await unshare(pkg)
      for (const f of files) {
        t.equal(statSync(resolve(pkg, f)).nlink, 1, f)
      }
      t.strictSame(
        readdirSync(pkg, { recursive: true }).map(String).sort(),
        [
          'bin',
          'index.js',
          'lib',
          'package.json',
          ...files.slice(2).map(f => join(f)),
        ].sort(),
        'nothing else left',
      )
    })
  }
})
