/* eslint-disable @typescript-eslint/no-extraneous-class */
import { PackageInfoClient } from '@vltpkg/package-info'
import type { RegistryClientRequestOptions } from '@vltpkg/registry-client'
import { CacheEntry } from '@vltpkg/registry-client'
import { Spec } from '@vltpkg/spec'
import type { Integrity } from '@vltpkg/types'
import { createHash } from 'crypto'
import { statSync } from 'fs'
import { resolve } from 'path'
import type { Test } from 'tap'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { ViewOptions } from '../../src/view.ts'

const logged: unknown[][] = []
const stdout = (...a: unknown[]) => logged.push(a)
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
      '../../src/output.ts': { stdout },
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
        registryClient: {
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
          },
        },
      },
    },
  } as unknown as LoadedConfig

  const { command, CacheView } = await mockCommand(t)

  new CacheView(
    {} as unknown as ViewOptions,
    {} as unknown as LoadedConfig,
  )
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
  })

  class MockRegistryClient {
    cache = {
      path: () => resolve(dir, 'cache'),
    }
  }

  const { command, CacheView } = await mockCommand(t)
  new CacheView(
    {} as unknown as ViewOptions,
    {} as unknown as LoadedConfig,
  )
  await command({
    positionals: ['delete-all'],
    options: {
      packageInfo: {
        registryClient: new MockRegistryClient(),
      },
    },
  } as unknown as LoadedConfig)
  t.equal(statSync(resolve(dir, 'cache')).isDirectory(), true)
  t.throws(() => statSync(resolve(dir, 'cache', 'some')))
  t.throws(() => statSync(resolve(dir, 'cache', 'inhere')))
})

const hashBuf = createHash('sha512').update('xyz').digest()
const hash64 = hashBuf.toString('base64')
const hashHex = hashBuf.toString('hex')
const integrity: Integrity = `sha512-${hash64}`

const pakukey = 'https://registry.npmjs.org/xyz'
const pakukeyHash = createHash('sha512').update(pakukey).digest('hex')
const headPakukey = 'HEAD https://registry.npmjs.org/xyz'
const headPakukeyHash = createHash('sha512')
  .update(headPakukey)
  .digest('hex')
const tgzkey = 'https://registry.npmjs.org/xyz/-/xyz-1.2.3.tgz'
const tgzkeyHash = createHash('sha512').update(tgzkey).digest('hex')
const createCache = (t: Test) => {
  const headPakuEntry = new CacheEntry(200, [
    Buffer.from('content-type'),
    Buffer.from('application/json'),
    Buffer.from('cache-control'),
    Buffer.from('public, max-age=300'),
    Buffer.from('date'),
    Buffer.from(new Date(Date.now() - 1000 * 1000).toUTCString()),
  ])
  const pakuEntry = new CacheEntry(200, [
    Buffer.from('content-type'),
    Buffer.from('application/json'),
    Buffer.from('cache-control'),
    Buffer.from('public, max-age=300'),
    Buffer.from('date'),
    Buffer.from(new Date(Date.now() - 1000 * 1000).toUTCString()),
  ])
  pakuEntry.addBody(
    Buffer.from(
      JSON.stringify({
        name: 'xyz',
        'dist-tags': {
          latest: '1.2.3',
        },
        versions: {
          '1.2.3': {
            name: 'xyz',
            version: '1.2.3',
            dist: {
              tarball:
                'https://registry.npmjs.org/xyz/-/xyz-1.2.3.tgz',
              integrity,
            },
          },
        },
      }),
    ),
  )

  const tgzEntry = new CacheEntry(
    200,
    [
      Buffer.from('content-type'),
      Buffer.from('application/octet-stream'),
      Buffer.from('cache-control'),
      Buffer.from('public, immutable, max-age=315557600'),
    ],
    { integrity, trustIntegrity: true },
  )

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
  new CacheView(
    {} as unknown as ViewOptions,
    {} as unknown as LoadedConfig,
  )

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

t.test('delete-before', async t => {
  const dir = createCache(t)
  const { command } = await mockCommand(t)

  const options = { cache: dir }
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

  new CacheView({} as unknown as ViewOptions, conf)

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

  const view = new CacheView(
    {} as unknown as ViewOptions,
    {} as unknown as LoadedConfig,
  )

  view.stdout('hello', 'world')
  t.throws(() => view.error(new Error('hello')), new Error('hello'))
})
