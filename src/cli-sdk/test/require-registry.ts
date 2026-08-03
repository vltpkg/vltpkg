import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'

type Opts = {
  registry?: string
  registries?: Record<string, string>
  'default-registry-alias'?: string
}

const mkConf = (options: Opts): LoadedConfig =>
  ({
    options: {
      registries: {},
      'default-registry-alias': 'npm',
      ...options,
    },
  }) as unknown as LoadedConfig

// Load require-registry with a mocked readline so the interactive
// branch of resolveRegistry is deterministic.
const load = async (answers: string[] = []) => {
  const queue = [...answers]
  return t.mockImport<typeof import('../src/require-registry.ts')>(
    '../src/require-registry.ts',
    {
      'node:readline/promises': {
        createInterface: () => ({
          question: async () => queue.shift() ?? '',
          close: () => {},
        }),
      },
    },
  )
}

t.test('missingRegistryError / ambiguousRegistryError', async t => {
  const mod = await load()
  t.match(mod.missingRegistryError(), {
    message: /Missing registry configuration/,
    cause: { code: 'ECONFIG' },
  })
  t.match(
    mod.ambiguousRegistryError([
      { alias: 'npm', url: 'https://n/' },
      { alias: 'main', url: 'https://m/' },
    ]),
    {
      message: /Multiple registries are configured/,
      cause: { code: 'ECONFIG', validOptions: ['npm', 'main'] },
    },
  )
})

t.test('resolveRegistryAlias', async t => {
  const mod = await load()
  const conf = mkConf({ registries: { main: 'https://m/' } })
  t.equal(mod.resolveRegistryAlias(conf, 'main'), 'https://m/')
  t.throws(() => mod.resolveRegistryAlias(conf, 'nope'), {
    cause: { code: 'ECONFIG', found: 'nope', validOptions: ['main'] },
  })
})

t.test('requireRegistry (sync, non-interactive)', async t => {
  const mod = await load()

  t.equal(
    mod.requireRegistry(
      mkConf({ registries: { main: 'https://m/' } }),
      'main',
    ),
    'https://m/',
    'explicit alias wins',
  )

  t.equal(
    mod.requireRegistry(mkConf({ registry: 'https://scalar/' })),
    'https://scalar/',
    'registry scalar',
  )

  t.equal(
    mod.requireRegistry(
      mkConf({ registries: { npm: 'https://n/' } }),
    ),
    'https://n/',
    'single configured alias',
  )

  t.equal(
    mod.requireRegistry(
      mkConf({
        registries: { npm: 'https://n/', main: 'https://m/' },
        'default-registry-alias': 'main',
      }),
    ),
    'https://m/',
    'multiple -> default alias',
  )

  t.throws(
    () =>
      mod.requireRegistry(
        mkConf({
          registries: { a: 'https://a/', b: 'https://b/' },
          'default-registry-alias': 'zz',
        }),
      ),
    { cause: { code: 'ECONFIG', validOptions: ['a', 'b'] } },
    'multiple, no default -> ambiguous',
  )

  t.throws(() => mod.requireRegistry(mkConf({})), {
    message: /Missing registry configuration/,
  })
})

t.test('resolveRegistry (async)', async t => {
  const mod = await load()

  t.equal(
    await mod.resolveRegistry(
      mkConf({ registries: { main: 'https://m/' } }),
      { alias: 'main' },
    ),
    'https://m/',
    'explicit alias',
  )

  t.equal(
    await mod.resolveRegistry(
      mkConf({ registry: 'https://scalar/' }),
    ),
    'https://scalar/',
    'registry scalar',
  )

  t.equal(
    await mod.resolveRegistry(
      mkConf({ registries: { npm: 'https://n/' } }),
      { interactive: false },
    ),
    'https://n/',
    'single alias',
  )

  t.equal(
    await mod.resolveRegistry(
      mkConf({
        registries: { npm: 'https://n/', main: 'https://m/' },
        'default-registry-alias': 'npm',
      }),
      { interactive: false },
    ),
    'https://n/',
    'multiple, non-interactive -> default',
  )

  await t.rejects(
    mod.resolveRegistry(
      mkConf({
        registries: { a: 'https://a/', b: 'https://b/' },
        'default-registry-alias': 'zz',
      }),
      { interactive: false },
    ),
    { cause: { code: 'ECONFIG' } },
    'multiple, non-interactive, no default -> ambiguous',
  )

  await t.rejects(
    mod.resolveRegistry(mkConf({}), { interactive: false }),
    { message: /Missing registry configuration/ },
  )
})

t.test('resolveRegistry (interactive prompt)', async t => {
  const mod = await load(['2'])
  const url = await mod.resolveRegistry(
    mkConf({
      registries: { npm: 'https://n/', main: 'https://m/' },
    }),
    { interactive: true, output: { write: () => true } as never },
  )
  t.equal(url, 'https://m/', 'prompt selection honored')
})
