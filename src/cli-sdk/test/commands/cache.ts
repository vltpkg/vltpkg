import { PackageInfoClient } from '@vltpkg/package-info'
import type { RegistryClientRequestOptions } from '@vltpkg/registry-client'
import { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import { storeIndexPath, unpackToStoreSync } from '@vltpkg/tar'
import type { Integrity } from '@vltpkg/types'
import { createHash } from 'node:crypto'
import {
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
import type { Test } from 'tap'
import t from 'tap'
import { Header } from 'tar'
import type { LoadedConfig } from '../../src/config/index.ts'

const logged: unknown[][] = []
const stdout = (...a: unknown[]) => logged.push(a)
const erred: unknown[][] = []
const stderr = (...a: unknown[]) => erred.push(a)
t.beforeEach(() => {
  logged.length = 0
})
t.afterEach(test => {
  t.matchSnapshot(
    logged.sort((a, b) => String(a).localeCompare(String(b))),
    `logged by ${test.name}`,
  )
})

const mockCommand = (t: Test, mocks: Record<string, any> = {}) =>
  t.mockImport<typeof import('../../src/commands/cache.ts')>(
    '../../src/commands/cache.ts',
    {
      '../../src/output.ts': { stdout, stderr },
      ...mocks,
    },
  )

t.test('cache basics', async t => {
  const { command, usage, views, CacheView } = await mockCommand(t)

  t.strictSame(views, { human: CacheView })
  t.matchSnapshot(usage().usageMarkdown())

  await t.rejects(
    command({
      positionals: ['unknown'],
    } as unknown as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test('add', async t => {
  let resolved = false
  let requested = false

  const conf = {
    positionals: ['add', 'pkg'],
    options: {
      packageInfo: {
        resolve: async (s: Spec) => {
          resolved = true
          t.match(s, Spec.parse('pkg@'))
          return {
            resolved:
              'https://registry.npmjs.org/pkg/-/pkg-1.2.3.tgz',
            integrity:
              'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==',
          }
        },
        getRegistryClient: async () => ({
          request: async (
            url: string,
            options: RegistryClientRequestOptions,
          ) => {
            requested = true
            t.equal(
              url,
              'https://registry.npmjs.org/pkg/-/pkg-1.2.3.tgz',
            )
            t.matchStrict(options, {
              integrity:
                'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==',
              staleWhileRevalidate: false,
            })
            return { statusCode: 200 }
          },
        }),
      },
    },
  } as unknown as LoadedConfig

  const { command, CacheView } = await mockCommand(t)

  new CacheView({}, {} as unknown as LoadedConfig)
  const result = await command(conf)
  t.equal(result, undefined)
  t.equal(requested, true)
  t.equal(resolved, true)
  await t.rejects(
    command({
      positionals: ['add'],
    } as unknown as LoadedConfig),
    {
      message: 'Must provide specs to add to the cache',
      cause: { code: 'EUSAGE' },
    },
  )
})

t.test('delete-all', async t => {
  const dir = t.testdir({
    cache: {
      some: 'stuff',
      inhere: {
        more: 'stuff',
      },
    },
    store: { v1: { x: { 'package.json': '{}' } }, v0: {} },
    custom: { root: { x: {} }, keep: {} },
  })

  const deleteAll = (store?: string) =>
    command({
      positionals: ['delete-all'],
      options: {
        cache: dir,
        packageInfo: {
          getRegistryClient: async () => ({
            cache: { path: () => resolve(dir, 'cache'), store },
          }),
        },
      },
    } as unknown as LoadedConfig)

  const { command, CacheView } = await mockCommand(t)
  new CacheView({}, {} as unknown as LoadedConfig)
  await deleteAll(resolve(dir, 'store/v1'))
  t.equal(statSync(resolve(dir, 'cache')).isDirectory(), true)
  t.throws(() => statSync(resolve(dir, 'cache', 'some')))
  t.throws(() => statSync(resolve(dir, 'cache', 'inhere')))
  t.throws(() => statSync(resolve(dir, 'store')))

  // a store root outside the cache: only the root goes
  await deleteAll(resolve(dir, 'custom/root'))
  t.throws(() => statSync(resolve(dir, 'custom/root')))
  t.equal(statSync(resolve(dir, 'custom/keep')).isDirectory(), true)

  // a cache without a global store
  await deleteAll()
  t.equal(statSync(resolve(dir, 'cache')).isDirectory(), true)
})

const hashBuf = createHash('sha512').update('xyz').digest()
const hash64 = hashBuf.toString('base64')
const hashHex = hashBuf.toString('hex')
const integrity: Integrity = `sha512-${hash64}`

const pakument = {
  name: 'xyz',
  'dist-tags': {
    latest: '1.2.3',
  },
  versions: {
    '1.2.3': {
      name: 'xyz',
      version: '1.2.3',
      dist: {
        tarball: 'https://registry.npmjs.org/xyz/-/xyz-1.2.3.tgz',
        integrity,
      },
    },
  },
}
const pakukey = 'https://registry.npmjs.org/xyz'
const pakukeyHash = createHash('sha512').update(pakukey).digest('hex')
const headPakukey = 'HEAD https://registry.npmjs.org/xyz'
const headPakukeyHash = createHash('sha512')
  .update(headPakukey)
  .digest('hex')
const tgzkey = 'https://registry.npmjs.org/xyz/-/xyz-1.2.3.tgz'
const tgzkeyHash = createHash('sha512').update(tgzkey).digest('hex')
let tgzEntry: CacheEntry | undefined = undefined
let pakuEntry: CacheEntry | undefined = undefined
const createCache = (t: Test) => {
  const headPakuEntry = new CacheEntry(200, [
    Buffer.from('content-type'),
    Buffer.from('application/json'),
    Buffer.from('cache-control'),
    Buffer.from('public, max-age=300'),
    Buffer.from('date'),
    Buffer.from(new Date(Date.now() - 1000 * 1000).toUTCString()),
  ])
  pakuEntry = new CacheEntry(200, [
    Buffer.from('content-type'),
    Buffer.from('application/json'),
    Buffer.from('cache-control'),
    Buffer.from('public, max-age=300'),
    Buffer.from('date'),
    Buffer.from(new Date(Date.now() - 1000 * 1000).toUTCString()),
  ])
  pakuEntry.addBody(Buffer.from(JSON.stringify(pakument)))

  tgzEntry = new CacheEntry(
    200,
    [
      Buffer.from('content-type'),
      Buffer.from('application/octet-stream'),
      Buffer.from('cache-control'),
      Buffer.from('public, immutable, max-age=315557600'),
    ],
    { integrity, trustIntegrity: true },
  )
  tgzEntry.addBody(Buffer.from('xyz'))

  return t.testdir({
    'registry-client': {
      [headPakukeyHash]: headPakuEntry.encode(),
      [`${headPakukeyHash}.key`]: headPakukey,
      [pakukeyHash]: pakuEntry.encode(),
      [`${pakukeyHash}.key`]: pakukey,
      [tgzkeyHash]: tgzEntry.encode(),
      [`${tgzkeyHash}.key`]: tgzkey,
      [hashHex]: t.fixture('link', tgzkeyHash),
    },
  })
}

t.test('delete', async t => {
  const dir = createCache(t)
  const { command, CacheView } = await mockCommand(t)
  new CacheView({}, {} as unknown as LoadedConfig)

  const options = {
    cache: dir,
  }
  Object.assign(options, {
    packageInfo: new PackageInfoClient(options),
  })

  await t.rejects(
    command({
      positionals: ['delete'],
      options,
    } as unknown as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )

  await command({
    positionals: ['delete', pakukey, 'some-random-key-not-found'],
    options,
  } as unknown as LoadedConfig)

  t.equal(
    statSync(resolve(dir, 'registry-client')).isDirectory(),
    true,
  )
  t.throws(() =>
    statSync(resolve(dir, 'registry-client', pakukeyHash)),
  )
  t.throws(() =>
    statSync(resolve(dir, 'registry-client', pakukeyHash) + '.key'),
  )
})

t.test('delete removes the global store entry', async t => {
  const dir = createCache(t)
  const store = resolve(dir, 'store/v1')
  mkdirSync(resolve(store, hashHex), { recursive: true })
  writeFileSync(resolve(store, hashHex, 'package.json'), '{}')
  writeFileSync(resolve(store, `${hashHex}.json`), '{}')
  const { command } = await mockCommand(t)
  const options = { cache: dir }
  Object.assign(options, {
    packageInfo: new PackageInfoClient(options),
  })
  await command({
    positionals: ['delete', tgzkey],
    options,
  } as unknown as LoadedConfig)
  t.throws(() =>
    statSync(resolve(dir, 'registry-client', tgzkeyHash)),
  )
  t.throws(() => statSync(resolve(dir, 'registry-client', hashHex)))
  t.strictSame(readdirSync(store), [])
})

t.test('delete-before', async t => {
  const dir = createCache(t)
  const { command, CacheView } = await mockCommand(t)
  new CacheView({}, {} as unknown as LoadedConfig)

  const storeRoot = resolve(dir, 'store/v1')
  const [oldHex, newHex] = ['a', 'b'].map(c => c.repeat(128))
  for (const hex of [oldHex, newHex]) {
    mkdirSync(resolve(storeRoot, String(hex)), { recursive: true })
    writeFileSync(resolve(storeRoot, `${hex}.json`), '{}')
  }
  // sidecar mtime is when the entry was written
  utimesSync(resolve(storeRoot, `${oldHex}.json`), 1000, 1000)
  const options = { cache: dir, storeRoot }
  Object.assign(options, {
    packageInfo: new PackageInfoClient(options),
  })

  await t.rejects(
    command({
      positionals: ['delete-before'],
      options,
    } as unknown as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )

  await t.rejects(
    command({
      positionals: [
        'delete-before',
        new Date(Date.now() + 1000 * 60 * 60 * 24),
      ],
      options,
    } as unknown as LoadedConfig),
    { cause: { code: 'EUSAGE', found: Date } },
  )

  await command({
    positionals: [
      'delete-before',
      new Date(Date.now() - 500 * 1000).toUTCString(),
    ],
    options,
  } as unknown as LoadedConfig)

  t.equal(
    statSync(resolve(dir, 'registry-client')).isDirectory(),
    true,
  )
  t.throws(() =>
    statSync(resolve(dir, 'registry-client', pakukeyHash)),
  )
  t.throws(() =>
    statSync(resolve(dir, 'registry-client', pakukeyHash) + '.key'),
  )
  t.strictSame(readdirSync(storeRoot), [
    String(newHex),
    `${newHex}.json`,
  ])
  t.strictSame(logged.at(-1), ['Removed 1 global store entry'])
})

t.test('clean', async t => {
  const dir = createCache(t)
  const { command } = await mockCommand(t)

  const options = { cache: dir }
  Object.assign(options, {
    packageInfo: new PackageInfoClient(options),
  })

  await command({
    positionals: ['clean'],
    options,
  } as unknown as LoadedConfig)

  await command({
    positionals: ['clean', tgzkey],
    options,
  } as unknown as LoadedConfig)

  t.equal(
    statSync(resolve(dir, 'registry-client')).isDirectory(),
    true,
  )
  t.equal(
    statSync(resolve(dir, 'registry-client', tgzkeyHash)).isFile(),
    true,
    'tgz not expired, so not deleted',
  )
  t.throws(() =>
    statSync(resolve(dir, 'registry-client', pakukeyHash)),
  )
  t.throws(() =>
    statSync(resolve(dir, 'registry-client', pakukeyHash) + '.key'),
  )
})

t.test('ls', async t => {
  const dir = createCache(t)
  const { command, CacheView } = await mockCommand(t)
  const options = { cache: dir }
  Object.assign(options, {
    packageInfo: new PackageInfoClient(options),
  })

  const conf = {
    positionals: ['ls'],
    options,
  } as unknown as LoadedConfig

  new CacheView({}, conf)

  const result = await command(conf)
  if (!result) throw new Error('no result??')
  t.matchSnapshot(
    Object.keys(result).sort((a, b) => a.localeCompare(b, 'en')),
    'all results',
  )

  const resultSingle = await command({
    positionals: ['ls', pakukey, headPakukey, 'asdfasdfasdf'],
    options,
  } as unknown as LoadedConfig)
  if (!resultSingle) throw new Error('no result??')
  t.matchSnapshot(Object.keys(resultSingle), 'one result')

  t.equal(
    statSync(resolve(dir, 'registry-client')).isDirectory(),
    true,
  )
  t.equal(
    statSync(resolve(dir, 'registry-client', pakukeyHash)).isFile(),
    true,
  )
  t.equal(
    statSync(
      resolve(dir, 'registry-client', pakukeyHash) + '.key',
    ).isFile(),
    true,
  )
})

t.test('human view coverage bits', async t => {
  const { CacheView } = await mockCommand(t)

  const view = new CacheView({}, {} as unknown as LoadedConfig)

  view.stdout('hello', 'world')
})

t.test('info', async t => {
  const { command } = await mockCommand(t)
  const dir = createCache(t)
  const options = {
    cache: dir,
  }
  Object.assign(options, {
    packageInfo: new PackageInfoClient(options),
  })

  await t.rejects(
    command({
      positionals: ['info', 'a', 'b'],
    } as unknown as LoadedConfig),
    {
      message: 'Must provide exactly one cache key',
      cause: { code: 'EUSAGE' },
    },
  )
  await t.rejects(
    command({
      positionals: ['info'],
    } as unknown as LoadedConfig),
    {
      message: 'Must provide exactly one cache key',
      cause: { code: 'EUSAGE' },
    },
  )

  const result = await command({
    positionals: ['info', pakukey],
    options,
  } as unknown as LoadedConfig)
  t.equal(result, undefined)
  t.strictSame(logged, [[JSON.stringify(pakument, null, 2)]])
  t.matchStrict(erred, [[pakukey, pakuEntry]])
})

// a tarball holding `files` under package/
const makeTar = (files: Record<string, string>) => {
  const chunks: Buffer[] = []
  for (const [path, body] of Object.entries(files)) {
    const h = Buffer.alloc(512)
    new Header({
      path: `package/${path}`,
      type: 'File',
      size: body.length,
      mode: 0o644,
    }).encode(h, 0)
    const b = Buffer.alloc(512 * Math.ceil(body.length / 512))
    b.write(body)
    chunks.push(h, b)
  }
  return Buffer.concat([...chunks, Buffer.alloc(1024)])
}

// cache a tarball under its integrity, and explode it into the store
const storeFixture = (t: Test, names: string[]) => {
  const dir = t.testdir({ 'registry-client': {}, store: {} })
  const cachePath = resolve(dir, 'registry-client')
  const storeRoot = resolve(dir, 'store')
  const pkgs = Object.fromEntries(
    names.map(name => {
      const tgz = makeTar({
        'package.json': JSON.stringify({ name, version: '1.0.0' }),
        'index.js': name,
      })
      const hash = createHash('sha512').update(tgz).digest()
      const integrity: Integrity = `sha512-${hash.toString('base64')}`
      const hex = hash.toString('hex')
      const entry = new CacheEntry(200, [], { integrity })
      entry.addBody(tgz)
      writeFileSync(resolve(cachePath, hex), entry.encode())
      const tmp = resolve(storeRoot, `.tmp/${hex}`)
      const { index } = unpackToStoreSync(tgz, tmp)
      writeFileSync(
        storeIndexPath(resolve(storeRoot, hex)),
        JSON.stringify(index),
      )
      renameSync(tmp, resolve(storeRoot, hex))
      return [
        name,
        { integrity, hex, entry: resolve(storeRoot, hex) },
      ]
    }),
  )
  const packageInfo = {
    resolve: async (s: Spec) => ({
      integrity:
        s.name === 'git' ? undefined : pkgs[s.name]?.integrity,
    }),
    getRegistryClient: async () => ({
      cache: { path: () => cachePath },
    }),
  }
  return { cachePath, storeRoot, pkgs, packageInfo }
}

const pkg = (
  pkgs: Record<
    string,
    { integrity: Integrity; hex: string; entry: string }
  >,
  name: string,
) => {
  const p = pkgs[name]
  if (!p) throw new Error('no fixture ' + name)
  return p
}

const verifyCommand = async (t: Test) => {
  const { command, CacheView } = await mockCommand(t)
  new CacheView({}, {} as unknown as LoadedConfig)
  return command
}

t.test('verify without specs', async t => {
  const command = await verifyCommand(t)
  await t.rejects(
    command({
      positionals: ['verify'],
      values: {},
    } as unknown as LoadedConfig),
    {
      message: 'Must provide specs to verify, or --all',
      cause: { code: 'EUSAGE' },
    },
  )
})

t.test('verify --all', async t => {
  const command = await verifyCommand(t)
  const { cachePath, storeRoot, pkgs, packageInfo } = storeFixture(
    t,
    ['ok', 'edited', 'orphan', 'noindex'],
  )
  const ok = pkg(pkgs, 'ok')
  const edited = pkg(pkgs, 'edited')
  const orphan = pkg(pkgs, 'orphan')
  const noindex = pkg(pkgs, 'noindex')
  // written through a hardlink in some node_modules
  writeFileSync(resolve(edited.entry, 'index.js'), 'x')
  rmSync(resolve(cachePath, orphan.hex))
  writeFileSync(storeIndexPath(noindex.entry), '{}')
  const result = await command({
    positionals: ['verify'],
    values: { all: true },
    options: { packageInfo, storeRoot },
  } as unknown as LoadedConfig)
  t.strictSame(result, {
    checked: 4,
    removed: {
      [edited.hex]: 'modified index.js',
      [orphan.hex]: 'no cached tarball',
      [noindex.hex]: 'no index',
    },
  })
  t.equal(existsSync(ok.entry), true, 'intact entry kept')
  for (const p of [edited, orphan, noindex]) {
    t.equal(existsSync(p.entry), false)
    t.equal(existsSync(storeIndexPath(p.entry)), false)
  }
  const byStr = (a: unknown, b: unknown) =>
    String(a).localeCompare(String(b))
  // named from the sidecar, hex without one
  t.strictSame(
    [...logged].sort(byStr),
    [
      ['-', 'edited@1.0.0', 'modified index.js'],
      ['-', 'orphan@1.0.0', 'no cached tarball'],
      ['-', noindex.hex, 'no index'],
      ['Checked 4 global store entries, removed 3'],
    ].sort(byStr),
  )
})

t.test('verify specs', async t => {
  const command = await verifyCommand(t)
  const { storeRoot, pkgs, packageInfo } = storeFixture(t, ['a', 'b'])
  const b = pkg(pkgs, 'b')
  writeFileSync(storeIndexPath(b.entry), '{}')
  const result = await command({
    positionals: ['verify', 'a', 'b', 'missing', 'git'],
    values: {},
    options: { packageInfo, storeRoot },
  } as unknown as LoadedConfig)
  t.strictSame(result, {
    checked: 2,
    removed: { b: 'no index' },
    missing: ['missing', 'git'],
  })
  t.equal(existsSync(pkg(pkgs, 'a').entry), true)
  t.equal(existsSync(b.entry), false)
  t.strictSame(logged, [
    ['Not in the global store:', 'missing'],
    ['Not in the global store:', 'git'],
    ['-', 'b', 'no index'],
    ['Checked 2 global store entries, removed 1'],
  ])
})

t.test('prune-store', async t => {
  const { command, CacheView } = await mockCommand(t)
  new CacheView({}, {} as unknown as LoadedConfig)
  const { storeRoot, pkgs } = storeFixture(t, [
    'used',
    'unused',
    'build',
  ])
  const used = pkg(pkgs, 'used')
  const build = pkg(pkgs, 'build')
  // install scripts: always copied, so kept
  const buildIndex = storeIndexPath(build.entry)
  writeFileSync(
    buildIndex,
    JSON.stringify({
      ...JSON.parse(readFileSync(buildIndex, 'utf8')),
      scripts: true,
    }),
  )
  linkSync(
    resolve(used.entry, 'index.js'),
    resolve(storeRoot, '../linked.js'),
  )
  const orphan = 'c'.repeat(128)
  writeFileSync(resolve(storeRoot, `${orphan}.json`), '{}')
  const result = await command({
    positionals: ['prune-store'],
    options: { storeRoot },
  } as unknown as LoadedConfig)
  t.strictSame(result, {
    checked: 4,
    removed: {
      [pkg(pkgs, 'unused').hex]: 'unused',
      [orphan]: 'unused',
    },
  })
  t.strictSame(
    readdirSync(storeRoot).sort(),
    [
      '.tmp',
      used.hex,
      `${used.hex}.json`,
      build.hex,
      `${build.hex}.json`,
    ].sort(),
  )
  t.strictSame(logged, [['Removed 2 of 4 global store entries']])

  await command({
    positionals: ['prune-store'],
    options: { storeRoot: resolve(storeRoot, 'nope') },
  } as unknown as LoadedConfig)
  t.strictSame(logged[1], ['Removed 0 of 0 global store entries'])
})
