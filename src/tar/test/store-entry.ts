import {
  existsSync,
  linkSync,
  readdirSync,
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
  removeStoreEntry,
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

const makeEntry = (t: Test) => {
  const store = t.testdir({ store: {} }) + '/store'
  const entry = resolve(store, hex)
  const { index } = unpackToStoreSync(tar, resolve(store, '.tmp/x'))
  writeFileSync(storeIndexPath(entry), JSON.stringify(index))
  renameSync(resolve(store, '.tmp/x'), entry)
  return { store, entry }
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
  const [a, b, c] = ['a', 'b', 'c'].map(x => x.repeat(128))
  const store = t.testdir({
    [String(a)]: {},
    [`${a}.json`]: '{}',
    [`${b}.json`]: '{}',
    [String(c)]: {},
    '.tmp': {},
    'short.json': '{}',
    [`${a}.json.1.2`]: '{}',
  })
  t.strictSame(storeEntryNames(store), [a, b, c])
})

t.test('removeStoreEntry, sidecar and dir', async t => {
  const { store, entry } = makeEntry(t)
  removeStoreEntry(entry)
  t.strictSame(readdirSync(store), ['.tmp'])
  removeStoreEntry(entry)
})

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

t.test('storeEntryLinked', async t => {
  const { store, entry } = makeEntry(t)
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
})
