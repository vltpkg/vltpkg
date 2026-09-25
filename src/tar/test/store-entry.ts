import * as FS from 'node:fs'
import {
  chmodSync,
  existsSync,
  linkSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import t from 'tap'
import type { Test } from 'tap'
import {
  markStoreEntryCopied,
  removeStoreEntry,
  storeCopiedPath,
  storeEntryCopied,
  storeEntryLinked,
  storeEntryNames,
  storeEntryTime,
  verifyStoreEntry,
} from '../src/store-entry.ts'
import { storeIndexPath } from '../src/store-index.ts'
import { storeLayout, unpackToStoreSync } from '../src/unpack.ts'
import { makeTar } from './fixtures/make-tar.ts'

const pj = JSON.stringify({
  name: 'pkg',
  version: '1.0.0',
  bin: 'cli',
})
const tar = makeTar([
  { path: 'package/package.json', size: pj.length },
  pj,
  { path: 'package/cli', size: 3 },
  'cli',
  { path: 'package/lib/a.js', size: 1 },
  'a',
])
const hex = 'ab'.repeat(64)
const isWin = process.platform === 'win32'

const makeEntry = (t: Test) => {
  const store = t.testdir({ store: {} }) + '/store'
  const entry = resolve(store, hex)
  const { index } = unpackToStoreSync(tar, resolve(store, '.tmp/x'))
  writeFileSync(storeIndexPath(entry), JSON.stringify(index))
  renameSync(resolve(store, '.tmp/x'), entry)
  return { store, entry, index }
}

t.test('storeLayout does no IO', async t => {
  const dir = t.testdir() + '/nope'
  const { index, files } = storeLayout(gzipSync(tar), dir)
  t.strictSame(
    index.files.map(([p]) => p),
    ['cli', 'lib/a.js', 'package.json'],
  )
  t.equal(files.find(f => f.path.endsWith('cli'))?.executable, true)
  t.equal(existsSync(dir), false)
})

t.test('storeEntryNames', async t => {
  t.strictSame(storeEntryNames(t.testdirName + '/missing'), [])
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(x => x.repeat(128))
  const store = t.testdir({
    [String(a)]: {},
    [`${a}.json`]: '{}',
    [`${a}.copied`]: '',
    [`${b}.json`]: '{}',
    [String(c)]: {},
    [`${d}.copied`]: '',
    '.tmp': {},
    'short.json': '{}',
    'short.copied': '',
    [`${a}.json.1.2`]: '{}',
  })
  t.strictSame(storeEntryNames(store), [a, b, c, d])
})

t.test('removeStoreEntry, sidecar, dir and marker', async t => {
  const { store, entry } = makeEntry(t)
  markStoreEntryCopied(entry)
  removeStoreEntry(entry)
  t.strictSame(readdirSync(store), ['.tmp'])
  removeStoreEntry(entry)
})

t.test(
  'removeStoreEntry keeps the sidecar if the dir stays',
  async t => {
    const { entry } = makeEntry(t)
    const rimraf = await import('rimraf')
    const { removeStoreEntry } = await t.mockImport<
      typeof import('../src/store-entry.ts')
    >('../src/store-entry.ts', {
      rimraf: t.createMock(rimraf, {
        rimrafSync: (p: string) => {
          if (p === entry) throw new Error('EBUSY')
          return rimraf.rimrafSync(p)
        },
      }),
    })
    t.throws(() => removeStoreEntry(entry), { message: 'EBUSY' })
    t.equal(existsSync(storeIndexPath(entry)), true)
  },
)

t.test('storeEntryTime', async t => {
  const { entry } = makeEntry(t)
  utimesSync(storeIndexPath(entry), 1000, 1000)
  utimesSync(entry, 2000, 2000)
  t.equal(storeEntryTime(entry), 1_000_000, 'sidecar')
  rmSync(storeIndexPath(entry))
  t.equal(storeEntryTime(entry), 2_000_000, 'dir without sidecar')
  rmSync(entry, { recursive: true })
  t.equal(storeEntryTime(entry), 0, 'neither')
})

t.test('markStoreEntryCopied', async t => {
  const { store, entry } = makeEntry(t)
  const marker = storeCopiedPath(entry)
  t.equal(marker, entry + '.copied')
  markStoreEntryCopied(entry)
  t.equal(readFileSync(marker, 'utf8'), '')
  utimesSync(marker, 1000, 1000)
  markStoreEntryCopied(entry)
  t.equal(FS.statSync(marker).mtimeMs, 1_000_000, 'EEXIST: untouched')
  // best effort
  markStoreEntryCopied(resolve(store, 'nope/x'))
  t.equal(existsSync(resolve(store, 'nope')), false)
})

t.test('storeEntryCopied', async t => {
  const { entry, index } = makeEntry(t)
  t.equal(storeEntryCopied(entry), false, 'fresh entry')
  t.equal(
    storeEntryCopied(entry, { ...index, scripts: true }),
    true,
    'install scripts',
  )
  markStoreEntryCopied(entry)
  t.equal(storeEntryCopied(entry), true, 'marked')
  rmSync(storeIndexPath(entry))
  t.equal(storeEntryCopied(entry), false, 'no sidecar')
  t.equal(storeEntryCopied(entry, index), true, 'index given')
  rmSync(entry, { recursive: true })
  t.equal(storeEntryCopied(entry, index), false, 'no entry dir')
})

t.test('storeEntryLinked', async t => {
  const { store, entry, index } = makeEntry(t)
  t.equal(storeEntryLinked(entry), false, 'fresh entry')
  linkSync(resolve(entry, 'lib/a.js'), resolve(store, 'a-link'))
  t.equal(storeEntryLinked(entry), true, 'one file linked')
  rmSync(resolve(entry, 'cli'))
  t.equal(storeEntryLinked(entry), true, 'missing file skipped')
  rmSync(resolve(store, 'a-link'))
  t.equal(storeEntryLinked(entry), false, 'link removed')
  linkSync(resolve(entry, 'lib/a.js'), resolve(store, 'a-link'))
  rmSync(storeIndexPath(entry))
  t.equal(storeEntryLinked(entry), false, 'no sidecar')
  t.equal(storeEntryLinked(entry, index), true, 'index given')
})

t.test('verifyStoreEntry', async t => {
  t.test('intact', async t => {
    const { entry } = makeEntry(t)
    t.equal(verifyStoreEntry(entry, tar), undefined)
    t.equal(verifyStoreEntry(entry, gzipSync(tar)), undefined, 'gzip')
  })

  const cases: [string, (entry: string) => void, string][] = [
    [
      'modified file',
      e => writeFileSync(resolve(e, 'lib/a.js'), 'b'),
      'modified lib/a.js',
    ],
    ['missing file', e => rmSync(resolve(e, 'cli')), 'missing cli'],
    [
      'extra file',
      e => writeFileSync(resolve(e, 'lib/x.js'), 'x'),
      'extra lib/x.js',
    ],
    ['no sidecar', e => rmSync(storeIndexPath(e)), 'no index'],
    [
      'sidecar differs',
      e =>
        writeFileSync(
          storeIndexPath(e),
          JSON.stringify({
            v: 1,
            files: [],
            dirs: [],
            scripts: true,
          }),
        ),
      'index differs',
    ],
    ['no entry dir', e => rmSync(e, { recursive: true }), 'missing'],
  ]
  for (const [name, damage, reason] of cases) {
    t.test(name, async t => {
      const { entry } = makeEntry(t)
      damage(entry)
      t.equal(verifyStoreEntry(entry, tar), reason)
    })
  }

  t.test('bad tarball', async t => {
    const { entry } = makeEntry(t)
    t.equal(verifyStoreEntry(entry, Buffer.alloc(0)), 'bad tarball')
  })

  t.test('optional index fields added later: unchecked', async t => {
    const { entry } = makeEntry(t)
    const sidecar = storeIndexPath(entry)
    writeFileSync(
      sidecar,
      JSON.stringify({
        ...JSON.parse(readFileSync(sidecar, 'utf8')),
        manifest: {},
      }),
    )
    t.equal(verifyStoreEntry(entry, tar), undefined)
  })

  t.test('unreadable file', async t => {
    const { entry } = makeEntry(t)
    const { verifyStoreEntry } = await t.mockImport<
      typeof import('../src/store-entry.ts')
    >('../src/store-entry.ts', {
      'node:fs': t.createMock(FS, {
        readFileSync: (p: string, o?: BufferEncoding) => {
          if (p === resolve(entry, 'cli')) {
            throw Object.assign(new Error('EACCES'), {
              code: 'EACCES',
            })
          }
          return readFileSync(p, o)
        },
      }),
    })
    t.equal(verifyStoreEntry(entry, tar), 'unreadable cli')
  })

  t.test(
    'exec bit changed through a link',
    { skip: isWin && 'no posix modes' },
    async t => {
      const { entry } = makeEntry(t)
      chmodSync(resolve(entry, 'cli'), 0o644)
      t.equal(verifyStoreEntry(entry, tar), 'mode cli')
      chmodSync(resolve(entry, 'cli'), 0o755)
      chmodSync(resolve(entry, 'lib/a.js'), 0o755)
      t.equal(verifyStoreEntry(entry, tar), 'mode lib/a.js')
    },
  )

  t.test('exec bits, any platform', async t => {
    const { entry } = makeEntry(t)
    // no exec bits anywhere, as stat reports on Windows
    const { verifyStoreEntry } = await t.mockImport<
      typeof import('../src/store-entry.ts')
    >('../src/store-entry.ts', {
      'node:fs': t.createMock(FS, {
        statSync: (p: string, o?: FS.StatSyncOptions) =>
          Object.assign(FS.statSync(p, o) ?? {}, { mode: 0o100644 }),
      }),
    })
    t.intercept(process, 'platform', { value: 'linux' })
    t.equal(verifyStoreEntry(entry, tar), 'mode cli')
    t.intercept(process, 'platform', { value: 'win32' })
    t.equal(verifyStoreEntry(entry, tar), undefined, 'unchecked')
  })
})
