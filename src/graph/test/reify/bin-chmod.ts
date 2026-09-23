import * as FSP from 'node:fs/promises'
import { chmodSync, linkSync, statSync } from 'node:fs'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Node } from '../../src/node.ts'

const isWin = process.platform === 'win32'

const chmods: [string, number][] = []
const { binChmod, binChmodAll } = await t.mockImport<
  typeof import('../../src/reify/bin-chmod.ts')
>('../../src/reify/bin-chmod.ts', {
  'node:fs/promises': t.createMock(FSP, {
    chmod: async (path: string, mode: number) => {
      chmods.push([path, mode])
      return FSP.chmod(path, mode)
    },
  }),
})
t.beforeEach(() => (chmods.length = 0))

const fakeNode = (dir: string, bins?: Record<string, string>) =>
  ({ bins, resolvedLocation: () => dir }) as unknown as Node

t.test('per-file mode, executables left alone', async t => {
  const dir = t.testdir({
    store: { 'linked.js': '' },
    pkg: { 'a.js': '', 'b.js': '', 'user.js': '' },
  })
  const pkg = `${dir}/pkg`
  chmodSync(`${pkg}/a.js`, 0o644)
  chmodSync(`${pkg}/b.js`, 0o664)
  chmodSync(`${pkg}/user.js`, 0o744)
  // a global store link: already executable, shares the store inode
  chmodSync(`${dir}/store/linked.js`, 0o755)
  linkSync(`${dir}/store/linked.js`, `${pkg}/linked.js`)
  const node = fakeNode(pkg, {
    a: 'a.js',
    b: 'b.js',
    user: 'user.js',
    linked: 'linked.js',
    missing: 'missing.js',
  })
  await binChmodAll([node, fakeNode(pkg)], new PathScurry(dir))
  const mode = (f: string) => statSync(`${pkg}/${f}`).mode & 0o777
  if (isWin) {
    t.equal(chmods.length, 4, 'no exec bits on windows')
    return
  }
  t.strictSame(
    chmods.map(([p]) => p.slice(pkg.length + 1)).sort(),
    ['a.js', 'b.js', 'user.js'],
    'linked and missing bins skipped',
  )
  t.equal(mode('a.js'), 0o755)
  t.equal(mode('b.js'), 0o775, 'no mode carried over between files')
  t.equal(mode('user.js'), 0o755)
  t.equal(mode('linked.js'), 0o755)
})

// windows never reports exec bits: fake them so the skip runs everywhere
t.test('exec bits already set: skipped', async t => {
  const chmods: unknown[] = []
  const { binChmod } = await t.mockImport<
    typeof import('../../src/reify/bin-chmod.ts')
  >('../../src/reify/bin-chmod.ts', {
    'node:fs': { statSync: () => ({ mode: 0o100755 }) },
    'node:fs/promises': {
      chmod: async (...a: unknown[]) => chmods.push(a),
    },
  })
  const dir = t.testdir()
  await binChmod(fakeNode(dir, { x: 'x.js' }), new PathScurry(dir))
  t.strictSame(chmods, [])
})

t.test('no bins', async t => {
  await binChmod(fakeNode(t.testdir()), new PathScurry(t.testdirName))
  t.strictSame(chmods, [])
})

t.test(
  'unreadable target skipped',
  { skip: isWin && 'symlinks' },
  async t => {
    const dir = t.testdir({
      a: t.fixture('symlink', 'b'),
      b: t.fixture('symlink', 'a'),
    })
    await binChmod(fakeNode(dir, { loop: 'a' }), new PathScurry(dir))
    t.strictSame(chmods, [])
  },
)
