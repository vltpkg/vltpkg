import t from 'tap'
import { defaultRegistries } from '@vltpkg/spec'
import type { LoadedConfig } from '../../src/config/index.ts'

type Added = [string, Record<string, unknown>]

// Build a mocked setup module with injectable readline answers and a
// RegistryClient stub that records the registries it logs in against.
const loadSetup = async (answers: string[]) => {
  const loginCalls: (string | string[])[] = []
  const questions: string[] = []
  const logged: string[] = []
  const queue = [...answers]
  const mod = await t.mockImport<
    typeof import('../../src/commands/setup.ts')
  >('../../src/commands/setup.ts', {
    '@vltpkg/registry-client': {
      RegistryClient: class {
        async login(registry: string | string[]) {
          loginCalls.push(registry)
        }
      },
    },
    'node:readline/promises': {
      createInterface: () => ({
        question: async (q: string) => {
          questions.push(q)
          return queue.shift() ?? ''
        },
        close: () => {},
      }),
    },
    '../../src/output.ts': {
      stdout: (...a: unknown[]) => logged.push(a.join(' ')),
    },
  })
  return { mod, loginCalls, questions, logged }
}

const makeConf = (
  opts: {
    yes?: boolean
    config?: string
    positionals?: string[]
    registries?: Record<string, string>
    layers?: {
      user?: Record<string, unknown>
      project?: Record<string, unknown>
    }
  },
  added: Added[],
): LoadedConfig =>
  ({
    positionals: opts.positionals ?? [],
    get: (k: string) =>
      k === 'yes' ? opts.yes
      : k === 'config' ? opts.config
      : undefined,
    options: { registries: opts.registries ?? {} },
    layers: opts.layers ?? {},
    addConfigToFile: async (
      which: string,
      values: Record<string, unknown>,
    ) => {
      added.push([which, values])
    },
  }) as unknown as LoadedConfig

t.test('usage', async t => {
  const { mod } = await loadSetup([])
  t.matchSnapshot(mod.usage().usageMarkdown())
})

t.test('url + view helpers', async t => {
  const { mod } = await loadSetup([])
  t.equal(
    mod.accountRegistryURL('acme', 'npm'),
    'https://registry.vlt.io/acme/npm/',
  )
  t.equal(
    mod.accountRegistryURL('a/b', 'main'),
    'https://registry.vlt.io/a%2Fb/main/',
  )
  t.match(
    mod.views.human({
      account: 'acme',
      which: 'user',
      registries: { npm: 'u' },
    }),
    /1 registry alias/,
  )
  t.match(
    mod.views.human({
      account: 'acme',
      which: 'user',
      registries: { npm: 'u', main: 'm' },
    }),
    /2 registry aliases/,
  )
  t.match(
    mod.views.human({
      account: 'acme',
      which: 'user',
      registries: { npm: 'u' },
      shadowedByProject: true,
    }),
    /project config takes precedence/,
  )
})

t.test('non-interactive with account + extras', async t => {
  const added: Added[] = []
  const { mod, loginCalls } = await loadSetup([])
  const result = await mod.command(
    makeConf(
      {
        yes: true,
        positionals: ['acme'],
        // gh matches the built-in default -> skipped; loc is custom;
        // slashless url gets normalized.
        registries: {
          gh: defaultRegistries.gh,
          loc: 'http://reg.local',
          slashed: 'http://slash.local/',
        },
      },
      added,
    ),
  )
  t.strictSame(
    loginCalls,
    [],
    'no browser auth in non-interactive mode',
  )
  t.equal(added.length, 1)
  t.equal(added[0]?.[0], 'user')
  t.strictSame(added[0]?.[1], {
    registries: {
      npm: 'https://registry.vlt.io/acme/npm/',
      main: 'https://registry.vlt.io/acme/main/',
      loc: 'http://reg.local/',
      slashed: 'http://slash.local/',
    },
  })
  t.equal(result.account, 'acme')
  t.equal(result.which, 'user')
})

t.test(
  'aliases from a config file are left where they are',
  async t => {
    const added: Added[] = []
    const { mod } = await loadSetup([])
    const result = await mod.command(
      makeConf(
        {
          yes: true,
          positionals: ['acme'],
          registries: {
            fromUser: 'https://from-user/',
            fromProject: 'https://from-project/',
            moved: 'https://cli-override/',
            fromCli: 'https://from-cli/',
          },
          layers: {
            user: { registries: { fromUser: 'https://from-user/' } },
            project: {
              registries: {
                fromProject: 'https://from-project/',
                // same alias, different url: the effective value came from
                // the CLI, so it is not a config-file alias
                moved: 'https://project-value/',
              },
            },
          },
        },
        added,
      ),
    )
    t.strictSame(
      result.registries,
      {
        npm: 'https://registry.vlt.io/acme/npm/',
        main: 'https://registry.vlt.io/acme/main/',
        moved: 'https://cli-override/',
        fromCli: 'https://from-cli/',
      },
      'only account, CLI and interactive aliases are written',
    )
    t.equal(
      result.shadowedByProject,
      true,
      'warns that the project vlt.json outranks the user config',
    )
  },
)

t.test('non-interactive requires an account', async t => {
  const added: Added[] = []
  const { mod } = await loadSetup([])
  await t.rejects(mod.command(makeConf({ yes: true }, added)), {
    cause: { code: 'ECONFIG' },
  })
  t.strictSame(added, [])
})

t.test('non-interactive writes to project config', async t => {
  const added: Added[] = []
  const { mod } = await loadSetup([])
  const result = await mod.command(
    makeConf(
      { yes: true, config: 'project', positionals: ['x'] },
      added,
    ),
  )
  t.equal(result.which, 'project')
  t.equal(added[0]?.[0], 'project')
})

t.test('interactive: prompt account, auth, add alias', async t => {
  const added: Added[] = []
  const { mod, loginCalls, logged } = await loadSetup([
    'acme', // account slug
    'y', // authenticate now
    'y', // add another alias?
    'partner', // alias name
    'https://partner.example.com', // url
    'y', // authenticate against partner?
    'n', // add another alias?
  ])
  const result = await mod.command(makeConf({}, added))
  t.strictSame(
    loginCalls,
    [
      [
        'https://registry.vlt.io/acme/npm/',
        'https://registry.vlt.io/acme/main/',
      ],
      'https://partner.example.com/',
    ],
    'account registries authenticated in a single login',
  )
  t.strictSame(result.registries, {
    npm: 'https://registry.vlt.io/acme/npm/',
    main: 'https://registry.vlt.io/acme/main/',
    partner: 'https://partner.example.com/',
  })
  t.equal(added[0]?.[0], 'user')
  // the account registries share a token, so the browser only opens once
  t.match(
    logged.filter(l => /^Authenticat/i.test(l)),
    [/Authenticating your account registries \(npm, main\)/],
  )
})

t.test(
  'interactive: skip auth and handle bad alias input',
  async t => {
    const added: Added[] = []
    const { mod, loginCalls } = await loadSetup([
      'n', // skip account auth
      'y', // add another alias?
      '', // empty name -> skip
      'y', // add another alias?
      'npm', // already staged -> skip
      'y', // add another alias?
      'good', // name
      '', // empty url -> skip
      'y', // add another alias?
      'good', // name
      'http://good.example', // url
      'n', // don't authenticate this one
      'n', // stop adding
    ])
    const result = await mod.command(
      makeConf({ positionals: ['acme'] }, added),
    )
    t.strictSame(loginCalls, [], 'never authenticated')
    t.strictSame(result.registries, {
      npm: 'https://registry.vlt.io/acme/npm/',
      main: 'https://registry.vlt.io/acme/main/',
      good: 'http://good.example/',
    })
  },
)

t.test('interactive: empty account slug rejects', async t => {
  const added: Added[] = []
  const { mod } = await loadSetup([''])
  await t.rejects(mod.command(makeConf({}, added)), {
    cause: { code: 'ECONFIG' },
  })
})
