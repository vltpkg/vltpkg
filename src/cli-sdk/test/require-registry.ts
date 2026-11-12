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
  t.match(mod.missingNpmRegistryError(), {
    message: /Missing npm registry configuration/,
    cause: { code: 'ECONFIG' },
  })
  t.match(String(mod.missingNpmRegistryError()), /registries\.npm/)
  t.match(mod.missingNpmRegistryError('custom'), {
    message: /Missing custom registry configuration/,
    cause: { code: 'ECONFIG' },
  })
  t.match(
    String(mod.missingNpmRegistryError('custom')),
    /registries\.custom/,
  )
  const missing = String(mod.missingRegistryError())
  t.match(missing, /read-only public mirror/)
  t.match(missing, /`vlt setup`/)
  t.match(missing, /`--registry=<url>`/)
  t.match(missing, /`publishConfig\.registry`/)
  t.match(missing, /https:\/\/docs\.vlt\.sh\/cli/)
  t.notMatch(missing, /no default registry/)
  const npmMissing = String(mod.missingNpmRegistryError('custom'))
  t.match(npmMissing, /`default-registry-alias`/)
  t.match(npmMissing, /`vlt config set registries\.custom=<url>`/)
  t.notMatch(npmMissing, /vlt setup/)
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

const ghDefaultURL = 'https://npm.pkg.github.com/'
const mirrorURL = 'https://registry.vlt.io/upstream/npm/'
// written out, not from getOptions(), so these fail without the
// built-in `npm` mirror
const builtins = { gh: ghDefaultURL, npm: mirrorURL }

t.test('built-in defaults are not candidates', async t => {
  const mod = await load()

  // gh left at its default URL is a built-in default, not something
  // the user configured, so it does not satisfy resolution
  await t.rejects(
    mod.resolveRegistry(
      mkConf({ registries: { gh: ghDefaultURL } }),
      {
        interactive: false,
      },
    ),
    { message: /Missing registry configuration/ },
    'only built-in gh -> missing',
  )

  // nor does the read-only built-in npm mirror
  await t.rejects(
    mod.resolveRegistry(mkConf({ registries: builtins }), {
      interactive: false,
    }),
    { message: /Missing registry configuration/ },
    'only built-ins -> missing',
  )
  t.throws(
    () => mod.requireRegistry(mkConf({ registries: builtins })),
    { message: /Missing registry configuration/ },
    'only built-ins -> missing (sync)',
  )

  // a single user-configured alias resolves even when the built-in gh
  // default is also present
  t.equal(
    await mod.resolveRegistry(
      mkConf({
        registries: { gh: ghDefaultURL, main: 'https://m/' },
      }),
      { interactive: false },
    ),
    'https://m/',
    'gh default ignored, single user alias resolves',
  )

  // overriding a built-in alias to a non-default URL counts as
  // user-configured
  t.equal(
    await mod.resolveRegistry(
      mkConf({ registries: { gh: 'https://custom/' } }),
      { interactive: false },
    ),
    'https://custom/',
    'overridden gh counts as configured',
  )
})

t.test('built-in npm mirror is read-only', async t => {
  const mod = await load()

  t.ok(mod.isBuiltinMirror('npm', mirrorURL), 'built-in npm')
  t.notOk(mod.isBuiltinMirror('npm', 'https://n/'), 'overridden npm')
  t.notOk(mod.isBuiltinMirror('gh', mirrorURL), 'other alias')

  // explicit alias: the mirror is never a write/auth target
  t.throws(
    () =>
      mod.requireRegistry(mkConf({ registries: builtins }), 'npm'),
    {
      message: /Missing registry configuration/,
      cause: { code: 'ECONFIG' },
    },
    'requireRegistry: explicit built-in npm alias',
  )
  await t.rejects(
    mod.resolveRegistry(mkConf({ registries: builtins }), {
      alias: 'npm',
    }),
    { message: /Missing registry configuration/ },
    'resolveRegistry: explicit built-in npm alias',
  )
  t.equal(
    await mod.resolveRegistry(
      mkConf({ registries: { ...builtins, npm: 'https://n/' } }),
      { alias: 'npm' },
    ),
    'https://n/',
    'explicit overridden npm alias',
  )
  t.equal(
    mod.requireRegistry(mkConf({ registries: builtins }), 'gh'),
    ghDefaultURL,
    'explicit built-in gh alias still resolves',
  )

  // non-interactive fallback to default-registry-alias skips the mirror
  const two = { ...builtins, main: 'https://m/', corp: 'https://c/' }
  t.throws(
    () => mod.requireRegistry(mkConf({ registries: two })),
    {
      message: /Multiple registries are configured/,
      cause: { validOptions: ['main', 'corp'] },
    },
    'requireRegistry: fallback never picks the mirror',
  )
  await t.rejects(
    mod.resolveRegistry(mkConf({ registries: two }), {
      interactive: false,
    }),
    {
      message: /Multiple registries are configured/,
      cause: { validOptions: ['main', 'corp'] },
    },
    'resolveRegistry: fallback never picks the mirror',
  )
  const toGh = { registries: two, 'default-registry-alias': 'gh' }
  t.equal(
    mod.requireRegistry(mkConf(toGh)),
    ghDefaultURL,
    'requireRegistry: fallback to built-in gh unchanged',
  )
  t.equal(
    await mod.resolveRegistry(mkConf(toGh), { interactive: false }),
    ghDefaultURL,
    'resolveRegistry: fallback to built-in gh unchanged',
  )
  const ownNpm = { registries: { ...two, npm: 'https://n/' } }
  t.equal(
    mod.requireRegistry(mkConf(ownNpm)),
    'https://n/',
    'requireRegistry: fallback to an overridden npm',
  )
  t.equal(
    await mod.resolveRegistry(mkConf(ownNpm), { interactive: false }),
    'https://n/',
    'resolveRegistry: fallback to an overridden npm',
  )
})

t.test('hasReadableRegistry', async t => {
  const mod = await load()

  t.ok(
    mod.hasReadableRegistry(mkConf({ registries: builtins })),
    'built-in npm mirror -> true',
  )
  t.notOk(
    mod.hasConfiguredRegistry(mkConf({ registries: builtins })),
    'but not a configured registry',
  )
  t.ok(
    mod.hasNpmRegistry(mkConf({ registries: builtins })),
    'and it satisfies the npm gate',
  )
  t.notOk(mod.hasReadableRegistry(mkConf({})), 'nothing -> false')
  t.notOk(
    mod.hasReadableRegistry(
      mkConf({
        registries: builtins,
        'default-registry-alias': 'nope',
      }),
    ),
    'default-registry-alias at a missing alias -> false',
  )
  t.ok(
    mod.hasReadableRegistry(mkConf({ registry: 'https://scalar/' })),
    'registry scalar -> true',
  )
  t.ok(
    mod.hasReadableRegistry(
      mkConf({ registries: { main: 'https://m/' } }),
    ),
    'a configured alias -> true',
  )
})

t.test('hasConfiguredRegistry', async t => {
  const mod = await load()

  t.notOk(
    mod.hasConfiguredRegistry(mkConf({})),
    'no registries -> false',
  )
  t.notOk(
    mod.hasConfiguredRegistry(
      mkConf({ registries: { gh: ghDefaultURL } }),
    ),
    'only built-in gh default -> false',
  )
  t.ok(
    mod.hasConfiguredRegistry(
      mkConf({ registry: 'https://scalar/' }),
    ),
    'registry scalar -> true',
  )
  t.ok(
    mod.hasConfiguredRegistry(
      mkConf({ registries: { main: 'https://m/' } }),
    ),
    'non-default alias -> true',
  )
  t.ok(
    mod.hasConfiguredRegistry(
      mkConf({ registries: { gh: 'https://custom/' } }),
    ),
    'overridden built-in alias -> true',
  )
})

t.test('hasNpmRegistry', async t => {
  const mod = await load()

  t.notOk(mod.hasNpmRegistry(mkConf({})), 'no registries -> false')
  t.notOk(
    mod.hasNpmRegistry(mkConf({ registry: 'https://scalar/' })),
    'registry scalar alone -> false',
  )
  t.notOk(
    mod.hasNpmRegistry(
      mkConf({ registries: { main: 'https://m/' } }),
    ),
    'other alias -> false',
  )
  t.notOk(
    mod.hasNpmRegistry(mkConf({ registries: { npm: '' } })),
    'empty npm url -> false',
  )
  t.ok(
    mod.hasNpmRegistry(mkConf({ registries: { npm: 'https://n/' } })),
    'npm alias -> true',
  )
  t.ok(
    mod.hasNpmRegistry(
      mkConf({
        registries: { main: 'https://m/' },
        'default-registry-alias': 'main',
      }),
    ),
    'default-registry-alias at a configured alias -> true',
  )
  t.notOk(
    mod.hasNpmRegistry(
      mkConf({
        registries: { npm: 'https://n/' },
        'default-registry-alias': 'main',
      }),
    ),
    'default-registry-alias at a missing alias -> false',
  )
})

t.test('normalizeRegistryURL / unknownSpecPrefixError', async t => {
  const { normalizeRegistryURL, unknownSpecPrefixError } =
    await load()
  t.equal(normalizeRegistryURL('http://a'), 'http://a/')
  t.equal(normalizeRegistryURL('http://a/'), 'http://a/')
  t.equal(normalizeRegistryURL('http://a//'), 'http://a/')
  const er = unknownSpecPrefixError('loc', 'foo@loc:foo@1', ['npm:'])
  t.match(er, {
    message: /^Unknown spec prefix "loc:" in "foo@loc:foo@1"\./,
    cause: {
      code: 'ECONFIG',
      found: 'loc:',
      validOptions: ['npm:'],
    },
  })
  t.match(er.message, '`vlt config set registries.loc=<url>`')
})

t.test('asUnknownSpecPrefix', async t => {
  const { asUnknownSpecPrefix } = await load()
  const { error } = await import('@vltpkg/error-cause')
  t.match(
    asUnknownSpecPrefix(
      error('Protocol nope: is not defined', {
        spec: 'bar@nope:bar@^2.x',
        found: 'nope:',
        validOptions: ['npm:'],
      }),
    ),
    {
      message:
        /^Unknown spec prefix "nope:" in "bar@nope:bar@\^2\.x"\./,
      cause: {
        code: 'ECONFIG',
        found: 'nope:',
        validOptions: ['npm:'],
      },
    },
  )
  for (const er of [
    new Error('x'),
    'str',
    error('Protocol x: is not defined', { found: 'x:' }),
    error('Catalog "x" not found for a@catalog:x', {
      spec: 'a@catalog:x',
      found: 'x:',
    }),
  ]) {
    t.equal(asUnknownSpecPrefix(er), er, 'passes through')
  }
})

t.test('parseSpecArg', async t => {
  const { parseSpecArg } = await load()
  t.equal(String(parseSpecArg('foo@1', {})), 'foo@1')
  t.throws(() => parseSpecArg('nope:bar@1', {}), {
    message: /^Unknown spec prefix "nope:"/,
    cause: { code: 'ECONFIG' },
  })
})
