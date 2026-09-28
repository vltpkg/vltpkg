import fs, {
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import t from 'tap'
import {
  readStoreIndex,
  StoreIndexCache,
  storeIndexManifest,
  storeIndexPath,
} from '../src/store-index.ts'
import type { StoreIndex } from '../src/store-index.ts'

const valid: StoreIndex = {
  v: 1,
  files: [
    ['bin/cli.js', 10, 1],
    ['package.json', 20, 0],
  ],
  dirs: ['bin'],
  scripts: false,
  bins: { cli: 'bin/cli.js' },
  name: 'x',
  version: '1.0.0',
  manifest: '{"name":"x","version":"1.0.0","bin":"bin/cli.js"}',
}

t.test(
  'cached indexes observe replacement, deletion and malformed writes',
  async t => {
    const d = t.testdir()
    const entry = resolve(d, 'entry')
    const file = storeIndexPath(entry)
    const cache = new StoreIndexCache()
    t.equal(cache.read(entry), undefined)
    writeFileSync(file, JSON.stringify(valid))
    t.strictSame(cache.read(entry), valid)
    const replacement = { ...valid, scripts: true, name: 'y' }
    writeFileSync(file + '.new', JSON.stringify(replacement))
    renameSync(file + '.new', file)
    t.strictSame(cache.read(entry), replacement)
    rmSync(file)
    t.equal(cache.read(entry), undefined)
    writeFileSync(file, JSON.stringify(valid))
    t.strictSame(cache.read(entry), valid)
    writeFileSync(file, '{invalid')
    t.equal(cache.read(entry), undefined)
    writeFileSync(file, JSON.stringify(replacement))
    t.strictSame(cache.read(entry), replacement)
  },
)

t.test(
  'cache avoids reads and retains no caller mutations',
  async t => {
    let reads = 0
    const { StoreIndexCache } = await t.mockImport<
      typeof import('../src/store-index.ts')
    >('../src/store-index.ts', {
      'node:fs': {
        ...fs,
        readFileSync: (file: string | number, enc?: string) => {
          reads++
          return readFileSync(file, enc as 'utf8')
        },
      },
    })
    const d = t.testdir({ 'entry.json': JSON.stringify(valid) })
    const entry = resolve(d, 'entry')
    const cache = new StoreIndexCache()
    const first = cache.read(entry)!
    first.files[0]![0] = '../escape'
    first.dirs.push('../escape')
    first.bins!.cli = '../escape'
    first.scripts = true
    const second = cache.read(entry)!
    t.strictSame(second, valid)
    second.files.length = 0
    t.strictSame(cache.read(entry), valid)
    // The identity check still opens and fstats the sidecar, but a
    // hit never re-reads or re-parses its bytes.
    t.equal(reads, 1)
  },
)

t.test(
  'cache evicts to its byte limit and skips oversized indexes',
  async t => {
    let reads = 0
    const { StoreIndexCache } = await t.mockImport<
      typeof import('../src/store-index.ts')
    >('../src/store-index.ts', {
      'node:fs': {
        ...fs,
        readFileSync: (file: string | number, enc?: string) => {
          reads++
          return readFileSync(file, enc as 'utf8')
        },
      },
    })
    const text = JSON.stringify(valid)
    const d = t.testdir({
      'a.json': text,
      'b.json': text,
      'c.json': text,
    })
    const cache = new StoreIndexCache(
      BigInt(Buffer.byteLength(text)) * 2n,
    )
    for (const name of ['a', 'b', 'c', 'c', 'b', 'a']) {
      t.strictSame(cache.read(resolve(d, name)), valid)
    }
    t.equal(reads, 4)
    const tiny = new StoreIndexCache(0)
    tiny.read(resolve(d, 'a'))
    tiny.read(resolve(d, 'a'))
    t.equal(reads, 6)
  },
)

t.test(
  'cache handles open failures and concurrent publication',
  async t => {
    for (const mode of ['first-error', 'changed']) {
      await t.test(mode, async t => {
        let calls = 0
        const { StoreIndexCache } = await t.mockImport<
          typeof import('../src/store-index.ts')
        >('../src/store-index.ts', {
          'node:fs': {
            ...fs,
            openSync: (file: string, flags: string) => {
              calls++
              if (mode === 'first-error' && calls === 1) {
                throw Object.assign(new Error('open failed'), {
                  code: 'EACCES',
                })
              }
              return openSync(file, flags)
            },
            fstatSync: (fd: number) => {
              const stat = fstatSync(fd, { bigint: true })
              // A different identity every other read means the
              // cache can never serve the second read from the
              // first read's retained bytes.
              return mode === 'changed' ?
                  { ...stat, ino: stat.ino + BigInt(calls) }
                : stat
            },
          },
        })
        const d = t.testdir({ 'entry.json': JSON.stringify(valid) })
        const cache = new StoreIndexCache()
        t.strictSame(cache.read(resolve(d, 'entry')), valid)
        t.strictSame(cache.read(resolve(d, 'entry')), valid)
        t.equal(calls, 2)
      })
    }
  },
)

t.test('storeIndexPath', async t => {
  t.equal(storeIndexPath('/s/v1/abc'), '/s/v1/abc.json')
})

t.test('cache treats malformed sidecars as misses', async t => {
  const d = t.testdir({
    'bad.json': '{not json',
    'wrong.json': JSON.stringify({ ...valid, v: 2 }),
  })
  const cache = new StoreIndexCache()
  t.equal(cache.read(resolve(d, 'bad')), undefined)
  t.equal(cache.read(resolve(d, 'bad')), undefined)
  t.equal(cache.read(resolve(d, 'wrong')), undefined)
  t.equal(cache.read(resolve(d, 'wrong')), undefined)
})

t.test('a close failure still returns the index', async t => {
  const { StoreIndexCache } = await t.mockImport<
    typeof import('../src/store-index.ts')
  >('../src/store-index.ts', {
    'node:fs': {
      ...fs,
      closeSync: () => {
        throw new Error('close failed')
      },
    },
  })
  const d = t.testdir({ 'entry.json': JSON.stringify(valid) })
  const cache = new StoreIndexCache()
  t.strictSame(cache.read(resolve(d, 'entry')), valid)
})

t.test('a read failure is a store miss', async t => {
  const { StoreIndexCache } = await t.mockImport<
    typeof import('../src/store-index.ts')
  >('../src/store-index.ts', {
    'node:fs': {
      ...fs,
      readFileSync: (file: string | number, enc?: string) => {
        // Only the cache reads through a descriptor; the miss
        // fallback re-reads by path and must stay real.
        if (typeof file === 'number') {
          throw Object.assign(new Error('read failed'), {
            code: 'EIO',
          })
        }
        return readFileSync(file, enc as 'utf8')
      },
    },
  })
  const d = t.testdir({ 'entry.json': JSON.stringify(valid) })
  const cache = new StoreIndexCache()
  t.equal(cache.read(resolve(d, 'entry')), undefined)
})

t.test('cache supports indexes without optional fields', async t => {
  const index = { v: 1, files: [], dirs: [], scripts: false }
  const d = t.testdir({ 'entry.json': JSON.stringify(index) })
  const cache = new StoreIndexCache()
  t.strictSame(cache.read(resolve(d, 'entry')), index)
  t.strictSame(cache.read(resolve(d, 'entry')), index)
})

t.test('readStoreIndex', async t => {
  const d = t.testdir({
    'ok.json': JSON.stringify(valid),
    'min.json': JSON.stringify({
      v: 1,
      files: [],
      dirs: [],
      scripts: true,
    }),
    'bad.json': '{not json',
  })
  t.strictSame(readStoreIndex(resolve(d, 'ok')), valid)
  t.strictSame(readStoreIndex(resolve(d, 'min')), {
    v: 1,
    files: [],
    dirs: [],
    scripts: true,
  })
  t.equal(readStoreIndex(resolve(d, 'missing')), undefined)
  t.equal(readStoreIndex(resolve(d, 'bad')), undefined)
  // A sidecar that cannot be read at all is also a miss.
  const dir = t.testdir()
  mkdirSync(resolve(dir, 'entry.json'))
  t.equal(readStoreIndex(resolve(dir, 'entry')), undefined)
})

t.test('malformed index is a miss', async t => {
  const d = t.testdir()
  const cases: [string, unknown][] = [
    ['null', null],
    ['array', []],
    ['string', 'x'],
    ['v2', { ...valid, v: 2 }],
    ['scripts', { ...valid, scripts: 'yes' }],
    ['name', { ...valid, name: 1 }],
    ['version', { ...valid, version: 1 }],
    ['bins array', { ...valid, bins: ['x'] }],
    ['bins value', { ...valid, bins: { x: 1 } }],
    ['dirs', { ...valid, dirs: 'bin' }],
    ['files', { ...valid, files: {} }],
    ['manifest object', { ...valid, manifest: {} }],
    ['file not array', { ...valid, files: ['a'] }],
    ['file length', { ...valid, files: [['a', 1]] }],
    ['file size', { ...valid, files: [['a', '1', 0]] }],
    ['file exec', { ...valid, files: [['a', 1, 2]] }],
    ['file path type', { ...valid, files: [[1, 1, 0]] }],
  ]
  for (const p of [
    '',
    '.',
    '..',
    '/abs',
    'a/../b',
    'a/./b',
    'a//b',
    'a/',
    '../x',
    'a\\b',
    '..\\x',
  ]) {
    cases.push([`file path ${p}`, { ...valid, files: [[p, 1, 0]] }])
    cases.push([`dir path ${p}`, { ...valid, dirs: [p] }])
  }
  for (const [name, index] of cases) {
    writeFileSync(resolve(d, 'x.json'), JSON.stringify(index))
    t.equal(readStoreIndex(resolve(d, 'x')), undefined, name)
  }
  // odd but safe names are fine
  writeFileSync(
    resolve(d, 'x.json'),
    JSON.stringify({
      ...valid,
      files: [
        ['...', 1, 0],
        ['.a/..b/c.', 1, 0],
      ],
    }),
  )
  t.ok(readStoreIndex(resolve(d, 'x')))
})

t.test('storeIndexManifest', async t => {
  const pj = (o: unknown) => Buffer.from(JSON.stringify(o))

  t.strictSame(storeIndexManifest(pj({}), false), {
    scripts: false,
    manifest: '{}',
  })
  const full = {
    name: 'a',
    version: '1.2.3',
    scripts: { test: 'x' },
    author: 'someone',
  }
  t.strictSame(storeIndexManifest(pj(full), false), {
    scripts: false,
    name: 'a',
    version: '1.2.3',
    manifest: JSON.stringify(full),
  })
  t.strictSame(
    storeIndexManifest(
      pj({ name: 'a', dependencies: { b: 1 } }),
      false,
    ),
    { scripts: false, name: 'a' },
    'no manifest if not a valid one',
  )
  for (const s of ['install', 'preinstall', 'postinstall']) {
    t.equal(
      storeIndexManifest(pj({ scripts: { [s]: 'x' } }), false)
        .scripts,
      true,
      s,
    )
  }
  t.equal(
    storeIndexManifest(
      pj({ scripts: { prepare: 'x', test: 'y' } }),
      false,
    ).scripts,
    false,
    'other scripts do not count',
  )
  t.equal(
    storeIndexManifest(pj({ scripts: 'install' }), false).scripts,
    false,
    'non-object scripts',
  )
  t.equal(
    storeIndexManifest(pj({}), true).scripts,
    true,
    'binding.gyp',
  )

  t.strictSame(
    storeIndexManifest(pj({ name: '@s/p', bin: './cli.js' }), false)
      .bins,
    { p: 'cli.js' },
    'string bin, scoped name',
  )
  t.strictSame(
    storeIndexManifest(
      pj({
        name: 'p',
        bin: { a: 'bin/a.js', b: '../../b.js', c: 1 },
      }),
      false,
    ).bins,
    { a: 'bin/a.js', b: 'b.js' },
    'bins normalized like reify does',
  )
  t.equal(
    storeIndexManifest(pj({ bin: 'cli.js' }), false).bins,
    undefined,
    'string bin needs a name',
  )
  t.equal(
    storeIndexManifest(pj({ name: 1, version: 2, bin: 'x' }), false)
      .bins,
    undefined,
    'non-string name',
  )
  t.equal(
    storeIndexManifest(pj({ name: 'p', bin: {} }), false).bins,
    undefined,
    'empty bin',
  )

  t.strictSame(
    storeIndexManifest(
      Buffer.from('\uFEFF' + JSON.stringify({ name: 'bom' })),
      false,
    ),
    { scripts: false, name: 'bom', manifest: '{"name":"bom"}' },
    'leading BOM',
  )
  t.throws(() => storeIndexManifest(Buffer.from('{nope'), false), {
    message: 'invalid package.json in tarball',
    cause: { cause: { name: 'SyntaxError' } },
  })
  t.throws(() => storeIndexManifest(pj([]), false), {
    message: 'invalid package.json in tarball',
    cause: { found: [] },
  })
})
