import * as FS from 'node:fs'
import {
  cpSync,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, posix, resolve, win32 } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
import { linkFromStore } from '../src/link-tree.ts'
import type { StoreLinkResult } from '../src/link-tree.ts'
import { storeCopiedPath } from '../src/store-entry.ts'
import { storeIndexPath } from '../src/store-index.ts'
import type { StoreIndex } from '../src/store-index.ts'
import { unpackToStoreSync } from '../src/unpack.ts'
import { makeTar } from './fixtures/make-tar.ts'

type LinkTree = typeof import('../src/link-tree.ts')

const how = (r: StoreLinkResult) => r && r.how

const prevMask = process.umask(0o022)
t.teardown(() => {
  process.umask(prevMask)
})
const isWin = process.platform === 'win32'

const pj = JSON.stringify({
  name: 'pkg',
  version: '1.0.0',
  bin: 'bin/cli.js',
})
const tar = makeTar([
  { path: 'package/package.json', size: pj.length },
  pj,
  { path: 'package/index.js', size: 5 },
  'index',
  { path: 'package/bin/cli.js', size: 3 },
  'cli',
  { path: 'package/lib/a.js', size: 1 },
  'a',
  { path: 'package/lib/deep/b.js', size: 1, mode: 0o755 },
  'b',
  // sort after package.json, so its deferral is observable
  { path: 'package/readme.md', size: 2 },
  'rm',
  { path: 'package/src/x.js', size: 1 },
  'x',
])

// what the explode child does: write, sidecar, then rename into place
const makeEntry = (t: Test, symlink = false) => {
  const store =
    t.testdir({
      store: {},
      ...(symlink && {
        real: {},
        link: t.fixture('symlink', 'real'),
      }),
    }) + '/store'
  const entry = resolve(store, 'abc')
  const tmp = resolve(store, '.tmp/abc.1')
  const { index } = unpackToStoreSync(tar, tmp)
  writeFileSync(storeIndexPath(entry), JSON.stringify(index))
  renameSync(tmp, entry)
  const target = resolve(
    store,
    '../project/node_modules/.vlt/x/node_modules/pkg',
  )
  return { entry, index, target }
}

const errno = (code: string) =>
  Object.assign(new Error(code), { code }) as NodeJS.ErrnoException

const mockFS = (t: Test, mocks: Partial<typeof FS>) =>
  t.mockImport<LinkTree>('../src/link-tree.ts', {
    'node:fs': t.createMock(FS, mocks),
  })

// clonefile(2) is darwin-only: what it does, or the errno it fails with
const mockClone = async (
  t: Test,
  fail: (src: string, dst: string) => string | undefined = () =>
    undefined,
) => {
  const clones: string[] = []
  const mod = await t.mockImport<LinkTree>('../src/link-tree.ts', {
    '../src/clonefile.ts': {
      cloneDir: (src: string, dst: string) => {
        const code = fail(src, dst)
        if (code) return code
        clones.push(dst)
        cpSync(src, dst, { recursive: true })
        return true
      },
    },
  })
  return { ...mod, clones }
}

const checkTree = (
  t: Test,
  entry: string,
  index: StoreIndex,
  target: string,
  nlink: (p: string) => number,
) => {
  for (const [p, size] of index.files) {
    const s = statSync(resolve(entry, p))
    const l = statSync(resolve(target, p))
    t.equal(l.size, size, p)
    t.equal(
      readFileSync(resolve(target, p), 'utf8'),
      readFileSync(resolve(entry, p), 'utf8'),
    )
    t.equal(l.nlink, nlink(p), `${p} nlink`)
    if (!isWin) t.equal(l.mode & 0o777, s.mode & 0o777, `${p} mode`)
  }
  // no temp dirs left behind
  t.strictSame(readdirSync(dirname(target)), [basename(target)])
}

const noTrace = (t: Test, target: string) => {
  t.equal(existsSync(target), false, 'target not created')
  if (existsSync(dirname(target))) {
    t.strictSame(readdirSync(dirname(target)), [], 'no tmp left')
  }
}

t.test('links every file, package.json last', async t => {
  const { entry, index, target } = makeEntry(t)
  const order: string[] = []
  const { linkFromStore } = await mockFS(t, {
    linkSync: (src: FS.PathLike, dst: FS.PathLike) => {
      order.push(basename(String(dst)))
      FS.linkSync(src, dst)
    },
  })
  t.strictSame(linkFromStore(entry, target), { how: 'link', index })
  checkTree(t, entry, index, target, () => 2)
  t.equal(order.length, index.files.length)
  t.not(index.files.at(-1)?.[0], 'package.json', 'not last by path')
  t.equal(order.at(-1), 'package.json')
  if (!isWin) {
    t.equal(
      statSync(resolve(target, 'bin/cli.js')).mode & 0o777,
      0o755,
    )
    t.equal(statSync(resolve(target, 'lib/a.js')).mode & 0o777, 0o644)
  }
})

t.test('replaces an existing target', async t => {
  const { entry, index, target } = makeEntry(t)
  FS.mkdirSync(target, { recursive: true })
  writeFileSync(resolve(target, 'old'), 'old')
  t.equal(how(linkFromStore(entry, target)), 'link')
  t.equal(existsSync(resolve(target, 'old')), false)
  checkTree(t, entry, index, target, () => 2)
})

t.test('copy option copies every file', async t => {
  const { entry, index, target } = makeEntry(t)
  t.equal(how(linkFromStore(entry, target, { copy: true })), 'copy')
  checkTree(t, entry, index, target, () => 1)
  // copies are writable and do not write through to the store
  writeFileSync(resolve(target, 'index.js'), 'changed')
  t.equal(readFileSync(resolve(entry, 'index.js'), 'utf8'), 'index')
})

t.test(
  'copies keep store modes under any umask',
  { skip: isWin && 'no posix modes' },
  async t => {
    process.umask(0o027)
    t.teardown(() => {
      process.umask(0o022)
    })
    const { entry, index, target } = makeEntry(t)
    t.equal(how(linkFromStore(entry, target, { copy: true })), 'copy')
    checkTree(t, entry, index, target, () => 1)
    t.equal(
      statSync(resolve(target, 'bin/cli.js')).mode & 0o777,
      0o751,
    )
  },
)

t.test('install scripts: linked', async t => {
  const { entry, index, target } = makeEntry(t)
  writeFileSync(
    storeIndexPath(entry),
    JSON.stringify({ ...index, scripts: true }),
  )
  t.equal(how(linkFromStore(entry, target)), 'link')
  checkTree(t, entry, index, target, () => 2)
  // reify copies it before they run: nlink will not show this use
  t.equal(existsSync(storeCopiedPath(entry)), true, 'marked')
})

t.test('copyScripts', async t => {
  t.test('install scripts: copied', async t => {
    const { entry, index, target } = makeEntry(t)
    writeFileSync(
      storeIndexPath(entry),
      JSON.stringify({ ...index, scripts: true }),
    )
    t.equal(
      how(linkFromStore(entry, target, { copyScripts: true })),
      'copy',
    )
    checkTree(t, entry, index, target, () => 1)
    t.equal(existsSync(storeCopiedPath(entry)), true, 'marked')
    writeFileSync(resolve(target, 'index.js'), 'changed')
    t.equal(readFileSync(resolve(entry, 'index.js'), 'utf8'), 'index')
  })

  t.test('no install scripts: linked', async t => {
    const { entry, index, target } = makeEntry(t)
    t.equal(
      how(linkFromStore(entry, target, { copyScripts: true })),
      'link',
    )
    checkTree(t, entry, index, target, () => 2)
  })
})

t.test('clone option clones the entry', async t => {
  const { entry, index, target } = makeEntry(t)
  const { linkFromStore, clones } = await mockClone(t)
  t.strictSame(linkFromStore(entry, target, { clone: true }), {
    how: 'clone',
    index,
  })
  checkTree(t, entry, index, target, () => 1)
  t.equal(clones.length, 1, 'one clone')
  t.equal(dirname(String(clones[0])), dirname(target), 'sibling tmp')
  // nlink cannot show a clone: marked like a copy
  t.equal(existsSync(storeCopiedPath(entry)), true)

  t.test('copy and install scripts need no copy on top', async t => {
    const { entry, index, target } = makeEntry(t)
    const { linkFromStore, clones } = await mockClone(t)
    t.equal(
      how(linkFromStore(entry, target, { clone: true, copy: true })),
      'clone',
    )
    writeFileSync(
      storeIndexPath(entry),
      JSON.stringify({ ...index, scripts: true }),
    )
    t.match(linkFromStore(entry, target + '2', { clone: true }), {
      how: 'clone',
      index: { scripts: true },
    })
    t.equal(
      how(
        linkFromStore(entry, target + '3', {
          clone: true,
          copyScripts: true,
        }),
      ),
      'clone',
    )
    t.equal(clones.length, 3)
  })

  t.test('not asked: never tried', async t => {
    const { entry, target } = makeEntry(t)
    const { linkFromStore, clones } = await mockClone(t)
    t.equal(how(linkFromStore(entry, target)), 'link')
    t.strictSame(clones, [])
  })

  t.test('a failed clone is a miss, not a link', async t => {
    const { entry, target } = makeEntry(t)
    let code: string | undefined = 'ENOENT'
    const { linkFromStore, clones } = await mockClone(t, () => code)
    t.equal(linkFromStore(entry, target, { clone: true }), false)
    noTrace(t, target)
    t.equal(existsSync(storeCopiedPath(entry)), false)
    t.equal(existsSync(entry), true, 'entry kept')
    // still tried, still clones
    code = undefined
    t.equal(
      how(linkFromStore(entry, target, { clone: true })),
      'clone',
    )
    t.equal(clones.length, 1)
  })

  t.test('a partial clone is cleaned up', async t => {
    const { entry, target } = makeEntry(t)
    const { linkFromStore } = await mockClone(t, (_, dst) => {
      FS.mkdirSync(resolve(dst, 'lib'), { recursive: true })
      writeFileSync(resolve(dst, 'lib/a.js'), 'a')
      return 'ENOSPC'
    })
    t.equal(linkFromStore(entry, target, { clone: true }), false)
    noTrace(t, target)
  })

  t.test('a clone that cannot work stops cloning', async t => {
    for (const fatal of ['ENOTSUP', 'EXDEV', 'EPERM', 'EACCES']) {
      const { entry, target } = makeEntry(t)
      let tries = 0
      const { linkFromStore } = await mockClone(t, () => {
        tries++
        return fatal
      })
      t.equal(
        linkFromStore(entry, target, { clone: true }),
        false,
        fatal,
      )
      const other = resolve(dirname(target), 'other')
      t.equal(linkFromStore(entry, other, { clone: true }), false)
      t.equal(tries, 1, 'never again')
      noTrace(t, target)
      // linking is no clone: unaffected
      t.equal(how(linkFromStore(entry, target)), 'link')
    }
  })

  t.test('a damaged entry is found and discarded', async t => {
    const damaged = async (
      t: Test,
      damage: (entry: string, index: StoreIndex) => void,
    ) => {
      const { entry, index, target } = makeEntry(t)
      const { linkFromStore } = await mockClone(t)
      damage(entry, index)
      t.equal(linkFromStore(entry, target, { clone: true }), false)
      noTrace(t, target)
      t.equal(existsSync(entry), false, 'entry removed')
      t.equal(existsSync(storeIndexPath(entry)), false)
    }
    t.test('missing file', async t => {
      await damaged(t, entry => rmSync(resolve(entry, 'lib/a.js')))
    })
    t.test('extra file', async t => {
      await damaged(t, entry =>
        writeFileSync(resolve(entry, 'lib/extra.js'), 'x'),
      )
    })
    t.test('missing directory', async t => {
      await damaged(t, entry =>
        rmSync(resolve(entry, 'lib/deep'), { recursive: true }),
      )
    })
    t.test('directory that is a file', async t => {
      await damaged(t, entry => {
        rmSync(resolve(entry, 'lib/deep'), { recursive: true })
        writeFileSync(resolve(entry, 'lib/deep'), 'x')
      })
    })
    t.test('index names a directory it does not list', async t => {
      await damaged(t, (entry, index) =>
        writeFileSync(
          storeIndexPath(entry),
          JSON.stringify({
            ...index,
            files: [...index.files, ['other/x.js', 1, 0]],
          }),
        ),
      )
    })
  })

  t.test('VLT_STORE_VERIFY=1 checks package.json', async t => {
    process.env.VLT_STORE_VERIFY = '1'
    t.teardown(() => {
      delete process.env.VLT_STORE_VERIFY
    })
    const { entry, index, target } = makeEntry(t)
    const { linkFromStore } = await mockClone(t)
    t.equal(
      how(linkFromStore(entry, target, { clone: true })),
      'clone',
    )
    writeFileSync(
      storeIndexPath(entry),
      JSON.stringify({
        ...index,
        files: index.files.filter(f => f[0] !== 'package.json'),
      }),
    )
    rmSync(resolve(entry, 'package.json'))
    const other = resolve(dirname(target), 'other')
    t.equal(
      how(linkFromStore(entry, other, { clone: true })),
      'clone',
      'none to check',
    )
    writeFileSync(storeIndexPath(entry), JSON.stringify(index))
    writeFileSync(resolve(entry, 'package.json'), '{}')
    const changed = resolve(dirname(target), 'changed')
    t.equal(linkFromStore(entry, changed, { clone: true }), false)
    t.equal(existsSync(entry), false, 'entry removed')
  })
})

t.test('store miss creates nothing', async t => {
  t.test('no sidecar', async t => {
    const { entry, target } = makeEntry(t)
    rmSync(storeIndexPath(entry))
    t.equal(linkFromStore(entry, target), false)
    t.equal(existsSync(dirname(target)), false)
  })
  t.test('bad sidecar', async t => {
    const { entry, target } = makeEntry(t)
    writeFileSync(storeIndexPath(entry), '{"v":2}')
    t.equal(linkFromStore(entry, target), false)
    t.equal(existsSync(dirname(target)), false)
  })
  t.test('entry not a directory', async t => {
    const { entry, target } = makeEntry(t)
    rmSync(entry, { recursive: true })
    t.equal(linkFromStore(entry, target), false)
    writeFileSync(entry, 'x')
    t.equal(linkFromStore(entry, target), false)
    t.equal(existsSync(dirname(target)), false)
  })
  t.test('symlinked target parent', async t => {
    const { entry } = makeEntry(t, true)
    const target = resolve(entry, '../../link/pkg')
    t.equal(linkFromStore(entry, target), false)
    t.strictSame(readdirSync(resolve(entry, '../../real')), [])
  })
})

t.test('index without package.json', async t => {
  const { entry, index, target } = makeEntry(t)
  const files = index.files.filter(([p]) => p !== 'package.json')
  writeFileSync(
    storeIndexPath(entry),
    JSON.stringify({ ...index, files }),
  )
  t.equal(how(linkFromStore(entry, target)), 'link')
  t.equal(existsSync(resolve(target, 'package.json')), false)
  t.equal(statSync(resolve(target, 'index.js')).nlink, 2)
})

t.test('process-wide downgrade to copy', async t => {
  for (const code of ['EXDEV', 'EPERM', 'EACCES', 'ENOTSUP']) {
    t.test(code, async t => {
      const { entry, index, target } = makeEntry(t)
      let calls = 0
      const { linkFromStore } = await mockFS(t, {
        linkSync: () => {
          calls++
          throw errno(code)
        },
      })
      t.equal(how(linkFromStore(entry, target)), 'copy')
      checkTree(t, entry, index, target, () => 1)
      t.equal(calls, 1, 'stops linking after the first failure')
      const other = resolve(dirname(target), 'other')
      t.equal(how(linkFromStore(entry, other)), 'copy')
      t.equal(calls, 1, 'still copying on the next package')
      t.equal(statSync(resolve(other, 'index.js')).nlink, 1)
    })
  }
})

t.test('EMLINK copies that file only', async t => {
  const { entry, index, target } = makeEntry(t)
  const { linkFromStore } = await mockFS(t, {
    linkSync: (src: FS.PathLike, dst: FS.PathLike) => {
      if (String(src).endsWith('a.js')) throw errno('EMLINK')
      FS.linkSync(src, dst)
    },
  })
  t.equal(how(linkFromStore(entry, target)), 'link')
  checkTree(t, entry, index, target, p => (p === 'lib/a.js' ? 1 : 2))
  const other = resolve(dirname(target), 'other')
  t.equal(how(linkFromStore(entry, other)), 'link')
  t.equal(
    statSync(resolve(other, 'index.js')).nlink,
    3,
    'no downgrade',
  )
})

t.test('package.json copied after a link: all copied', async t => {
  const copied = (entry: string) => existsSync(storeCopiedPath(entry))
  t.test('downgrade mid-package', async t => {
    const { entry, index, target } = makeEntry(t)
    let calls = 0
    const { linkFromStore } = await mockFS(t, {
      linkSync: (src: FS.PathLike, dst: FS.PathLike) => {
        if (++calls === 2) throw errno('EPERM')
        FS.linkSync(src, dst)
      },
    })
    t.equal(how(linkFromStore(entry, target)), 'copy')
    checkTree(t, entry, index, target, () => 1)
    t.equal(copied(entry), true)
    t.equal(calls, 2)
  })
  t.test('EMLINK on package.json', async t => {
    const { entry, index, target } = makeEntry(t)
    const { linkFromStore } = await mockFS(t, {
      linkSync: (src: FS.PathLike, dst: FS.PathLike) => {
        if (String(src).endsWith('package.json')) {
          throw errno('EMLINK')
        }
        FS.linkSync(src, dst)
      },
    })
    t.equal(how(linkFromStore(entry, target)), 'copy')
    checkTree(t, entry, index, target, () => 1)
    t.equal(copied(entry), true)
  })
})

t.test('ENOENT', async t => {
  t.test('source gone: entry discarded', async t => {
    for (const [copy, gone] of [
      [false, 'lib/a.js'],
      [true, 'lib/a.js'],
      [false, 'package.json'],
    ] as const) {
      const { entry, target } = makeEntry(t)
      rmSync(resolve(entry, gone))
      t.equal(linkFromStore(entry, target, { copy }), false)
      noTrace(t, target)
      t.equal(existsSync(entry), false, 'entry removed')
      t.equal(
        existsSync(storeIndexPath(entry)),
        false,
        'sidecar removed',
      )
    }
  })

  t.test('discard is best effort, sidecar goes last', async t => {
    const { entry, target } = makeEntry(t)
    rmSync(resolve(entry, 'lib/a.js'))
    const { rimraf, rimrafSync } = await import('rimraf')
    const { linkFromStore } = await t.mockImport<LinkTree>(
      '../src/link-tree.ts',
      {
        rimraf: {
          rimraf,
          rimrafSync: (p: string) => {
            if (p === entry) throw errno('EBUSY')
            return rimrafSync(p)
          },
        },
      },
    )
    t.equal(linkFromStore(entry, target), false)
    noTrace(t, target)
    t.equal(existsSync(entry), true)
    t.equal(existsSync(storeIndexPath(entry)), true, 'sidecar kept')
  })

  t.test('target parent gone: throws, entry kept', async t => {
    const { entry, target } = makeEntry(t)
    let removed = false
    const { linkFromStore } = await mockFS(t, {
      linkSync: (src: FS.PathLike, dst: FS.PathLike) => {
        if (!removed) {
          removed = true
          rmSync(dirname(target), { recursive: true, force: true })
        }
        FS.linkSync(src, dst)
      },
    })
    t.throws(() => linkFromStore(entry, target), { code: 'ENOENT' })
    t.equal(existsSync(dirname(target)), false)
    t.equal(existsSync(resolve(entry, 'package.json')), true)
    t.equal(existsSync(storeIndexPath(entry)), true)
    // not mistaken for overlayfs: still linking afterwards
    t.equal(how(linkFromStore(entry, target)), 'link')
    t.equal(statSync(resolve(target, 'index.js')).nlink, 2)
  })

  t.test('both sides present: overlayfs, copy', async t => {
    const { entry, index, target } = makeEntry(t)
    let calls = 0
    const { linkFromStore } = await mockFS(t, {
      linkSync: () => {
        calls++
        throw errno('ENOENT')
      },
    })
    t.equal(how(linkFromStore(entry, target)), 'copy')
    checkTree(t, entry, index, target, () => 1)
    t.equal(calls, 1)
  })
})

t.test('other link errors throw and clean up', async t => {
  for (const er of [errno('EIO'), new Error('boom')]) {
    const { entry, target } = makeEntry(t)
    const { linkFromStore } = await mockFS(t, {
      linkSync: () => {
        throw er
      },
    })
    t.throws(() => linkFromStore(entry, target), er)
    noTrace(t, target)
    t.equal(existsSync(storeIndexPath(entry)), true, 'entry kept')
  }
})

t.test('name clash (case-insensitive target) is a miss', async t => {
  const clash = (
    t: Test,
    patch: (i: StoreIndex) => Partial<StoreIndex>,
    copy = false,
  ) => {
    const { entry, index, target } = makeEntry(t)
    writeFileSync(
      storeIndexPath(entry),
      JSON.stringify({ ...index, ...patch(index) }),
    )
    t.equal(linkFromStore(entry, target, { copy }), false)
    noTrace(t, target)
    t.equal(existsSync(storeIndexPath(entry)), true, 'entry kept')
  }
  const dupFile = ({ files }: StoreIndex): Partial<StoreIndex> => ({
    files: [...files, ['index.js', 5, 0]],
  })
  t.test('dir', async t => {
    clash(t, ({ dirs }) => ({ dirs: [...dirs, 'lib'] }))
  })
  t.test('file, linking', async t => {
    clash(t, dupFile)
  })
  t.test('file, copying', async t => {
    clash(t, dupFile, true)
  })
})

t.test('VLT_STORE_VERIFY=1 discards a modified entry', async t => {
  process.env.VLT_STORE_VERIFY = '1'
  t.teardown(() => {
    delete process.env.VLT_STORE_VERIFY
  })
  const { linkFromStore } = await t.mockImport<LinkTree>(
    '../src/link-tree.ts',
  )
  const { entry, target } = makeEntry(t)
  t.equal(how(linkFromStore(entry, target)), 'link')
  // written in place through the link
  writeFileSync(resolve(target, 'package.json'), '{}')
  const other = resolve(dirname(target), 'other')
  t.equal(linkFromStore(entry, other), false)
  t.strictSame(
    readdirSync(dirname(target)),
    ['pkg'],
    'no other, no tmp',
  )
  t.equal(existsSync(entry), false, 'entry removed')
  t.equal(existsSync(storeIndexPath(entry)), false, 'sidecar removed')
})

t.test('copy read errors other than ENOENT throw', async t => {
  const { entry, index, target } = makeEntry(t)
  writeFileSync(
    storeIndexPath(entry),
    JSON.stringify({
      ...index,
      files: [['lib', 0, 0], ...index.files],
    }),
  )
  t.throws(() => linkFromStore(entry, target, { copy: true }), {
    code: 'EISDIR',
  })
  noTrace(t, target)
})

t.test(
  'failure before package.json leaves it out of tmp',
  async t => {
    const { entry, index, target } = makeEntry(t)
    let calls = 0
    let failed: string | undefined
    let tmpHadPj: boolean | undefined
    const { linkFromStore } = await mockFS(t, {
      linkSync: (src: FS.PathLike, dst: FS.PathLike) => {
        // second-to-last link, which sorts after package.json
        if (++calls === index.files.length - 1) {
          failed = basename(String(dst))
          const tmp = readdirSync(dirname(target)).find(n =>
            n.startsWith('.pkg.'),
          )
          tmpHadPj = existsSync(
            resolve(dirname(target), String(tmp), 'package.json'),
          )
          throw errno('EIO')
        }
        FS.linkSync(src, dst)
      },
    })
    t.throws(() => linkFromStore(entry, target), { code: 'EIO' })
    t.equal(failed, 'x.js')
    t.equal(tmpHadPj, false)
    noTrace(t, target)
  },
)

// both mappers run on every platform: CI coverage is per-OS
for (const path of [win32, posix]) {
  t.test(
    `${path === win32 ? 'windows' : 'posix'} separators`,
    async t => {
      const index: StoreIndex = {
        v: 1,
        files: [
          ['lib/a.js', 1, 0],
          ['package.json', 2, 0],
        ],
        dirs: ['lib'],
        scripts: false,
      }
      const calls: string[][] = []
      const dir = {
        isDirectory: () => true,
        isSymbolicLink: () => false,
      }
      const s = path.sep
      const { linkFromStore } = await t.mockImport<LinkTree>(
        '../src/link-tree.ts',
        {
          'node:path': path,
          'node:fs': t.createMock(FS, {
            readFileSync: () => JSON.stringify(index),
            lstatSync: (p: string) =>
              p.endsWith(`${s}pkg`) ? undefined : dir,
            mkdirSync: (p: string) => {
              calls.push(['mkdir', p])
            },
            linkSync: (a: string, b: string) => {
              calls.push(['link', a, b])
            },
            renameSync: (a: string, b: string) => {
              calls.push(['rename', a, b])
            },
          }),
          rimraf: {
            rimraf: async () => false,
            rimrafSync: () => false,
          },
        },
      )
      const root = path === win32 ? 'C:' : ''
      const target = [root, 'proj', 'node_modules', 'pkg'].join(s)
      const entry = [root, 'store', 'v1', 'abc'].join(s)
      t.equal(how(linkFromStore(entry, target)), 'link')
      const tmp = String(calls[0]?.[1])
      t.equal(path.dirname(tmp), path.dirname(target))
      t.match(path.basename(tmp), /^\.pkg\.[0-9a-f]+\.\d+$/)
      t.strictSame(calls, [
        ['mkdir', tmp],
        ['mkdir', tmp + s + 'lib'],
        [
          'link',
          [entry, 'lib', 'a.js'].join(s),
          [tmp, 'lib', 'a.js'].join(s),
        ],
        [
          'link',
          entry + s + 'package.json',
          tmp + s + 'package.json',
        ],
        ['rename', tmp, target],
      ])
    },
  )
}

t.test('copies mark the entry, links do not', async t => {
  const copied = (entry: string) => existsSync(storeCopiedPath(entry))
  t.test('link, EMLINK', async t => {
    const { entry, target } = makeEntry(t)
    t.ok(linkFromStore(entry, target))
    t.equal(copied(entry), false)
    const { linkFromStore: emlink } = await mockFS(t, {
      linkSync: () => {
        throw errno('EMLINK')
      },
    })
    t.ok(emlink(entry, resolve(dirname(target), 'other')))
    t.equal(copied(entry), false, 'per-file copies only')
  })
  t.test('copy, twice', async t => {
    const { entry, target } = makeEntry(t)
    t.ok(linkFromStore(entry, target, { copy: true }))
    t.equal(copied(entry), true)
    t.ok(linkFromStore(entry, target, { copy: true }))
    t.equal(copied(entry), true)
  })
  t.test('downgrade', async t => {
    const { entry, target } = makeEntry(t)
    const { linkFromStore } = await mockFS(t, {
      linkSync: () => {
        throw errno('EXDEV')
      },
    })
    t.ok(linkFromStore(entry, target))
    t.equal(copied(entry), true)
  })
  t.test('clash: none', async t => {
    const { entry, index, target } = makeEntry(t)
    writeFileSync(
      storeIndexPath(entry),
      JSON.stringify({
        ...index,
        files: [...index.files, index.files[0]],
      }),
    )
    t.equal(linkFromStore(entry, target, { copy: true }), false)
    t.equal(existsSync(entry), true)
    t.equal(copied(entry), false)
  })
  t.test('damaged entry discard removes it', async t => {
    const { entry, target } = makeEntry(t)
    t.ok(linkFromStore(entry, target, { copy: true }))
    rmSync(resolve(entry, 'lib/a.js'))
    const other = resolve(dirname(target), 'other')
    t.equal(linkFromStore(entry, other, { copy: true }), false)
    t.equal(copied(entry), false)
    t.equal(existsSync(storeIndexPath(entry)), false)
  })
})
