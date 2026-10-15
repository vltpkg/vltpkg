import t from 'tap'
import type { Test } from 'tap'
import { normalizeRegistryKey } from '@vltpkg/registry-client'
import type { Token } from '@vltpkg/registry-client'
import { defaultRegistries } from '@vltpkg/spec'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { SetupResult } from '../../src/commands/setup.ts'
import type {
  PathSetupOptions,
  PathSetupPlan,
} from '../../src/shell-setup/index.ts'
import { shellPathCommand } from '../../src/shell.ts'

type Added = [string, Record<string, unknown>]

// Build a mocked setup module with injectable readline answers and a
// RegistryClient stub that records the registries it logs in against.
const loadSetup = async (
  answers: string[],
  loginError?: Error,
  initialTokens?: Record<string, Token>,
  saveError?: Error,
) => {
  const loginCalls: (string | string[])[] = []
  const questions: string[] = []
  const logged: string[] = []
  const kcWrites: [string, Token, string][] = []
  const stored = new Map<string, Token>(
    Object.entries(initialTokens ?? {}),
  )
  const queue = [...answers]
  const mod = await t.mockImport<
    typeof import('../../src/commands/setup.ts')
  >('../../src/commands/setup.ts', {
    '@vltpkg/registry-client': {
      RegistryClient: class {
        async login(registry: string | string[]) {
          loginCalls.push(registry)
          if (loginError) throw loginError
          const regs = Array.isArray(registry) ? registry : [registry]
          for (const reg of regs) {
            stored.set(normalizeRegistryKey(reg), 'Bearer from-login')
          }
        }
      },
      // stands in for env/runtime tokens, which must not be persisted
      getToken: async () => 'Bearer from-env',
      getKC: (identity: string) => ({
        get: async (key: string) => stored.get(key),
        set: (key: string, token: Token) => {
          kcWrites.push([key, token, identity])
          stored.set(key, token)
        },
        save: async () => {
          if (saveError) throw saveError
        },
      }),
      normalizeRegistryKey,
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
  return {
    mod: {
      ...mod,
      // registry wizard: no globalRoot
      command: (conf: LoadedConfig) =>
        mod.command(conf) as Promise<SetupResult>,
    },
    loginCalls,
    questions,
    logged,
    kcWrites,
    stored,
  }
}

const makeConf = (
  opts: {
    yes?: boolean
    config?: string
    identity?: string
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
    options: {
      registries: opts.registries ?? {},
      identity: opts.identity ?? '',
    },
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
  const { mod, loginCalls, kcWrites } = await loadSetup([])
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
  t.strictSame(kcWrites, [], 'env/runtime tokens are not persisted')
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
  const { mod, loginCalls, logged, kcWrites, stored } =
    await loadSetup([
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
  t.strictSame(
    Object.fromEntries(stored),
    {
      'https://registry.vlt.io/acme/npm': 'Bearer from-login',
      'https://registry.vlt.io/acme/main': 'Bearer from-login',
      'https://partner.example.com': 'Bearer from-login',
    },
    'login token stored for both account registries',
  )
  t.strictSame(kcWrites, [], 'nothing left for setup to copy')
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

t.test('interactive: unknown account slug', async t => {
  const added: Added[] = []
  // the account registries only exist for accounts that exist, so the login
  // endpoint 404s on a slug that was mistyped
  const { mod } = await loadSetup(
    ['nope', 'y'],
    Object.assign(
      new Error('Failed to perform web login: 404 Not Found'),
      { cause: { code: 'EREQUEST', status: 404 } },
    ),
  )
  await t.rejects(
    mod.command(makeConf({}, added)),
    {
      message: /No vlt.io account or organization named "nope"/,
      cause: { code: 'ECONFIG' },
    },
    'names the slug rather than the HTTP failure',
  )
  t.strictSame(added, [], 'nothing written to config')
})

t.test('interactive: other login failures pass through', async t => {
  const added: Added[] = []
  const { mod } = await loadSetup(
    ['acme', 'y'],
    Object.assign(
      new Error(
        'Failed to perform web login: 500 Internal Server Error',
      ),
      { cause: { code: 'EREQUEST', status: 500 } },
    ),
  )
  await t.rejects(
    mod.command(makeConf({}, added)),
    { message: /500 Internal Server Error/ },
    'not reported as a bad account slug',
  )
})

t.test('interactive: empty account slug rejects', async t => {
  const added: Added[] = []
  const { mod } = await loadSetup([''])
  await t.rejects(mod.command(makeConf({}, added)), {
    cause: { code: 'ECONFIG' },
  })
})

t.test(
  'copies an existing main token onto npm during --yes',
  async t => {
    const added: Added[] = []
    const { mod, kcWrites } = await loadSetup([], undefined, {
      'https://registry.vlt.io/acme/main': 'Bearer existing-main',
    })
    await mod.command(
      makeConf({ yes: true, positionals: ['acme'] }, added),
    )
    t.strictSame(kcWrites, [
      [
        'https://registry.vlt.io/acme/npm',
        'Bearer existing-main',
        '',
      ],
    ])
  },
)

t.test(
  'copies an existing npm token onto main during --yes',
  async t => {
    const added: Added[] = []
    const { mod, kcWrites } = await loadSetup([], undefined, {
      'https://registry.vlt.io/acme/npm': 'Bearer existing-npm',
    })
    await mod.command(
      makeConf({ yes: true, positionals: ['acme'] }, added),
    )
    t.strictSame(kcWrites, [
      [
        'https://registry.vlt.io/acme/main',
        'Bearer existing-npm',
        '',
      ],
    ])
  },
)

t.test(
  'skipped auth still copies an existing token onto the other',
  async t => {
    const added: Added[] = []
    const { mod, loginCalls, kcWrites } = await loadSetup(
      ['n', 'n'],
      undefined,
      {
        'https://registry.vlt.io/acme/main': 'Bearer existing-main',
      },
    )
    await mod.command(
      makeConf({ positionals: ['acme'], identity: 'corp' }, added),
    )
    t.strictSame(loginCalls, [], 'auth was skipped')
    t.strictSame(kcWrites, [
      [
        'https://registry.vlt.io/acme/npm',
        'Bearer existing-main',
        'corp',
      ],
    ])
  },
)

t.test('--yes keeps differing npm and main tokens', async t => {
  const added: Added[] = []
  const { mod, kcWrites } = await loadSetup([], undefined, {
    'https://registry.vlt.io/acme/npm': 'Bearer stale-npm',
    'https://registry.vlt.io/acme/main': 'Bearer fresh-main',
  })
  await mod.command(
    makeConf({ yes: true, positionals: ['acme'] }, added),
  )
  t.strictSame(kcWrites, [], 'existing tokens not overwritten')
})

t.test(
  'keychain failure does not block the config write',
  async t => {
    const added: Added[] = []
    const { mod } = await loadSetup(
      [],
      undefined,
      { 'https://registry.vlt.io/acme/main': 'Bearer existing-main' },
      Object.assign(new Error('EACCES'), { code: 'EACCES' }),
    )
    await t.rejects(
      mod.command(
        makeConf({ yes: true, positionals: ['acme'] }, added),
      ),
      { code: 'EACCES' },
    )
    t.equal(added.length, 1, 'config written before the keychain')
  },
)

const loadPath = async (
  t: Test,
  o: {
    inPath?: boolean
    changed?: boolean
    planError?: Error
    answer?: string | Error
  } = {},
) => {
  t.intercept(process, 'env', { value: { SHELL: '/bin/zsh' } })
  const real = await import('../../src/shell-setup/index.ts')
  const calls = {
    plan: [] as PathSetupOptions[],
    apply: 0,
    asked: [] as string[],
  }
  const action = o.changed === false ? 'unchanged' : 'append'
  const plan: PathSetupPlan = {
    globalDir: '/g',
    dir: '/b',
    shell: 'zsh',
    changes: [
      {
        file: '/h/.zshrc',
        kind: 'rc',
        action,
        content: Buffer.from('x'),
      },
    ],
  }
  const mod = await t.mockImport<
    typeof import('../../src/commands/setup.ts')
  >('../../src/commands/setup.ts', {
    '../../src/global-bin-dir.ts': {
      resolveGlobalBinDir: async () => ({
        dir: '/b',
        source: 'global-dir',
        inPath: !!o.inPath,
      }),
    },
    '../../src/shell-setup/index.ts': {
      ...real,
      planPathSetup: async (opts: PathSetupOptions) => {
        calls.plan.push(opts)
        if (o.planError) throw o.planError
        return plan
      },
      applyPathSetup: async (p: PathSetupPlan) => {
        calls.apply++
        return {
          dir: p.dir,
          shell: p.shell,
          files: real.pathSetupFiles(p),
          backups: ['/g/backups/.zshrc.1.bak'],
        }
      },
      ask: async (q: string) => {
        calls.asked.push(q)
        if (o.answer instanceof Error) throw o.answer
        return o.answer ?? ''
      },
    },
  })
  return {
    mod,
    calls,
    source: real.sourceCommand('zsh', '/g'),
    command: shellPathCommand('zsh', '/b'),
  }
}

const pathConf = (
  o: {
    positionals?: string[]
    force?: boolean
    yes?: boolean
    noModifyPath?: boolean
  } = {},
) =>
  ({
    globalRoot: '/g',
    projectRoot: '/g',
    positionals: o.positionals ?? [],
    get: (k: string) =>
      k === 'force' ? o.force
      : k === 'yes' ? o.yes
      : k === 'no-modify-path' ? o.noModifyPath
      : undefined,
  }) as unknown as LoadedConfig

const rc = [{ file: '/h/.zshrc', kind: 'rc', action: 'append' }]

t.test('--path', async t => {
  t.test('no arguments', async t => {
    const { mod } = await loadPath(t)
    await t.rejects(mod.command(pathConf({ positionals: ['x'] })), {
      message: '`vlt setup --path` takes no arguments',
      cause: { code: 'EUSAGE', found: 'x' },
    })
  })

  t.test('in path', async t => {
    const { mod, calls, source, command } = await loadPath(t, {
      inPath: true,
    })
    t.strictSame(await mod.command(pathConf()), {
      path: {
        dir: '/b',
        shell: 'zsh',
        files: [],
        backups: [],
        command,
        source,
        status: 'in-path',
      },
    })
    t.strictSame(calls.plan, [])
  })

  t.test('in path + force edits', async t => {
    const { mod, calls } = await loadPath(t, { inPath: true })
    t.match(await mod.command(pathConf({ force: true, yes: true })), {
      path: { status: 'added' },
    })
    t.match(calls.plan, [
      { globalDir: '/g', dir: '/b', shell: 'zsh', force: true },
    ])
  })

  t.test('no-modify-path', async t => {
    const { mod, calls, command } = await loadPath(t)
    t.match(await mod.command(pathConf({ noModifyPath: true })), {
      path: { status: 'disabled', command },
    })
    t.strictSame(calls.plan, [])
  })

  t.test('plan fails', async t => {
    const { mod } = await loadPath(t, {
      planError: Object.assign(new Error('nope'), {
        cause: { code: 'ECONFIG' },
      }),
    })
    await t.rejects(mod.command(pathConf({ yes: true })), {
      message: 'nope',
    })
  })

  t.test('unchanged', async t => {
    const { mod, calls } = await loadPath(t, { changed: false })
    t.match(await mod.command(pathConf()), {
      path: {
        status: 'unchanged',
        files: [{ ...rc[0], action: 'unchanged' }],
      },
    })
    t.equal(calls.apply, 0)
  })

  t.test('not a terminal', async t => {
    const { mod, calls } = await loadPath(t)
    t.intercept(process.stdin, 'isTTY', { value: false })
    await t.rejects(mod.command(pathConf()), {
      message: 'Not a terminal: pass --yes to edit shell config',
      cause: { code: 'EUSAGE' },
    })
    t.equal(calls.apply, 0)
  })

  t.test('answer no', async t => {
    const { mod, calls } = await loadPath(t, { answer: 'n' })
    t.intercept(process.stdin, 'isTTY', { value: true })
    t.match(await mod.command(pathConf()), {
      path: { status: 'cancelled', files: rc, backups: [] },
    })
    t.strictSame(calls.asked, [
      'Add /b to your PATH in /h/.zshrc? (Y/n) ',
    ])
    t.equal(calls.apply, 0)
  })

  t.test('answer default', async t => {
    const { mod, calls } = await loadPath(t)
    t.intercept(process.stdin, 'isTTY', { value: true })
    t.match(await mod.command(pathConf()), {
      path: {
        status: 'added',
        files: rc,
        backups: ['/g/backups/.zshrc.1.bak'],
      },
    })
    t.equal(calls.asked.length, 1)
    t.equal(calls.plan.length, 2, 'planned again after asking')
    t.equal(calls.apply, 1)
  })

  t.test('Ctrl-C cancels', async t => {
    const abort = Object.assign(new Error('Aborted with Ctrl+C'), {
      name: 'AbortError',
    })
    const { mod, calls } = await loadPath(t, { answer: abort })
    t.intercept(process.stdin, 'isTTY', { value: true })
    t.match(await mod.command(pathConf()), {
      path: { status: 'cancelled' },
    })
    t.equal(calls.apply, 0)
  })

  t.test('prompt error', async t => {
    const { mod } = await loadPath(t, { answer: new Error('boom') })
    t.intercept(process.stdin, 'isTTY', { value: true })
    await t.rejects(mod.command(pathConf()), { message: 'boom' })
  })

  t.test('--yes', async t => {
    const { mod, calls } = await loadPath(t, { answer: 'n' })
    t.match(await mod.command(pathConf({ yes: true })), {
      path: { status: 'added' },
    })
    t.strictSame(calls.asked, [])
    t.equal(calls.plan.length, 1)
  })

  t.test('views', async t => {
    const { mod } = await loadPath(t)
    const r = {
      dir: '/b',
      shell: 'zsh',
      files: rc,
      backups: [],
      command: 'export PATH="/b:$PATH"',
      source: 'source "/g/env"',
    } as const
    const view = (
      status:
        'added' | 'unchanged' | 'in-path' | 'disabled' | 'cancelled',
      backups: string[] = [],
    ) =>
      mod.views.human({
        path: {
          ...r,
          files: [
            { file: '/h/.zshrc', kind: 'rc', action: 'append' },
          ],
          backups,
          status,
        },
      })
    t.equal(
      view('added'),
      '✅ Added /b to your PATH in /h/.zshrc\n   Open a new terminal, or run: source "/g/env"',
    )
    t.equal(
      view('added', ['/g/backups/x.bak']),
      '✅ Added /b to your PATH in /h/.zshrc\n   Open a new terminal, or run: source "/g/env"\n   Backups in /g/backups',
    )
    t.equal(
      view('unchanged'),
      '✅ /b is already added to your PATH in /h/.zshrc\n   Open a new terminal, or run: source "/g/env"',
    )
    t.equal(view('in-path'), '✅ /b is already on your PATH')
    t.equal(
      view('disabled'),
      'ℹ️  no-modify-path is set, so shell config was not changed. To add /b to your PATH, run:\n  export PATH="/b:$PATH"',
    )
    t.equal(
      view('cancelled'),
      'Shell config not changed. To add /b to your PATH, run:\n  export PATH="/b:$PATH"',
    )
  })
})
