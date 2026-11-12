import t from 'tap'
import type { Test } from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type {
  AddImportersDependenciesMap,
  LinkSkillsResult,
} from '@vltpkg/graph'
import { normalizeRegistryKey } from '@vltpkg/registry-client'
import type { Token } from '@vltpkg/registry-client'
import { defaultRegistries } from '@vltpkg/spec'
import { definition } from '../../src/config/definition.ts'
import type { LoadedConfig } from '../../src/config/index.ts'
import type {
  SetupResult,
  SetupSkillsResult,
} from '../../src/commands/setup.ts'
import type {
  PathSetupOptions,
  PathSetupPlan,
} from '../../src/shell-setup/index.ts'
import { shellPathCommand } from '../../src/shell.ts'

type Added = [string, Record<string, unknown>]

// what the skills step gets from `install()` and `reloadConfig()`
type SkillsMock = {
  /** returned by reloadConfig */
  reloaded?: LoadedConfig
  reloadError?: Error
  installError?: Error
  links?: LinkSkillsResult
}

type InstallCall = {
  opts: {
    allowSkills?: string
    lockfileOnly?: boolean
    allowScripts?: string
    skillsDirs?: string[]
    registries?: Record<string, string>
  }
  add?: AddImportersDependenciesMap
}

// a `-Rtap` run from a terminal inherits a TTY stdin
t.intercept(process.stdin, 'isTTY', { value: false })
// `--skills` is read from the command line
const argv = (...args: string[]) => [
  process.execPath,
  'vlt',
  'setup',
  ...args,
]
t.intercept(process, 'argv', { value: argv() })

type PathMock = {
  inPath?: boolean
  resolveError?: Error
  changed?: false
  planError?: Error
  applyError?: Error
}

// Build a mocked setup module with injectable readline answers and a
// RegistryClient stub that records the registries it logs in against.
const loadSetup = async (
  answers: (string | Error)[],
  loginError?: Error,
  initialTokens?: Record<string, Token>,
  saveError?: Error,
  path?: PathMock,
  skills: SkillsMock & { events?: string[] } = {},
) => {
  // close, reload, install and config writes, in order
  const events = skills.events ?? []
  const installs: InstallCall[] = []
  const reloads: { folder: string; env?: string }[] = []
  const loginCalls: (string | string[])[] = []
  const questions: string[] = []
  const logged: string[] = []
  const kcWrites: [string, Token, string][] = []
  const stored = new Map<string, Token>(
    Object.entries(initialTokens ?? {}),
  )
  const queue = [...answers]
  const real = await import('../../src/shell-setup/index.ts')
  const calls = {
    resolved: [] as unknown[],
    plan: 0,
    apply: 0,
    asked: [] as string[],
  }
  const pathMocks = path && {
    '../../src/global-bin-dir.ts': {
      resolveGlobalBinDir: async (c: unknown) => {
        calls.resolved.push(c)
        if (path.resolveError) throw path.resolveError
        return {
          dir: '/b',
          source: 'global-dir',
          inPath: !!path.inPath,
        }
      },
    },
    '../../src/shell-setup/index.ts': {
      ...real,
      planPathSetup: async (
        o: PathSetupOptions,
      ): Promise<PathSetupPlan> => {
        calls.plan++
        if (path.planError) throw path.planError
        return {
          globalDir: o.globalDir,
          dir: o.dir,
          shell: o.shell,
          changes: [
            {
              file: '/h/.zshrc',
              kind: 'rc',
              action: path.changed === false ? 'unchanged' : 'append',
              content: Buffer.from('x'),
            },
          ],
        }
      },
      applyPathSetup: async (p: PathSetupPlan) => {
        calls.apply++
        if (path.applyError) throw path.applyError
        return {
          dir: p.dir,
          shell: p.shell,
          files: real.pathSetupFiles(p),
          backups: ['/g/backups/.zshrc.1.bak'],
        }
      },
      // the wizard asks on its own readline
      ask: async (q: string) => {
        calls.asked.push(q)
        return ''
      },
    },
  }
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
      createInterface: () => {
        // Ctrl-C closes it, like node's
        let closed = false
        return {
          question: async (q: string) => {
            if (closed) throw new Error('readline was closed')
            questions.push(q)
            const a = queue.shift() ?? ''
            if (a instanceof Error) {
              closed = a.name === 'AbortError'
              throw a
            }
            return a
          },
          close: () => events.push('close'),
        }
      },
    },
    '../../src/output.ts': {
      stdout: (...a: unknown[]) => logged.push(a.join(' ')),
    },
    '@vltpkg/graph': {
      ...(await import('@vltpkg/graph')),
      install: async (
        opts: InstallCall['opts'],
        add?: AddImportersDependenciesMap,
      ) => {
        events.push('install')
        installs.push({ opts, add })
        if (skills.installError) throw skills.installError
        return {
          graph: {},
          ...(skills.links ? { skills: skills.links } : null),
        }
      },
    },
    '../../src/reload-config.ts': {
      reloadConfig: async (folder: string) => {
        events.push('reload')
        reloads.push({ folder, env: process.env.VLT_REGISTRIES })
        if (skills.reloadError) throw skills.reloadError
        return skills.reloaded
      },
    },
    ...pathMocks,
  })
  return {
    mod: {
      ...mod,
      // registry wizard: no globalRoot
      command: (conf: LoadedConfig) =>
        mod.command(conf) as Promise<SetupResult>,
      skillsCommand: (conf: LoadedConfig) =>
        mod.command(conf) as Promise<SetupSkillsResult>,
    },
    loginCalls,
    questions,
    logged,
    kcWrites,
    stored,
    calls,
    events,
    installs,
    reloads,
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
    noModifyPath?: boolean
    globalProject?: () =>
      { root: string; binDir?: string } | undefined
    /** the root package.json; unset: none */
    manifest?: Record<string, unknown>
    /** the root package.json once installed */
    installed?: Record<string, unknown>
    explicit?: Record<string, unknown>
    globalRoot?: string
    registry?: string
    skillsDir?: string[]
    /** records config writes and aborts */
    events?: string[]
    projectRoot?: string
  },
  added: Added[],
): LoadedConfig =>
  ({
    projectRoot: opts.projectRoot ?? '/p',
    globalRoot: opts.globalRoot,
    positionals: opts.positionals ?? [],
    explicit: opts.explicit ?? {},
    jack: definition,
    values: {},
    get: (k: string) =>
      k === 'yes' ? opts.yes
      : k === 'config' ? opts.config
      : k === 'no-modify-path' ? opts.noModifyPath
      : k === 'skills-dir' ? opts.skillsDir
      : undefined,
    globalProject:
      opts.globalProject ??
      (() => ({ root: '/g', binDir: undefined })),
    options: {
      registries: opts.registries ?? {},
      registry: opts.registry,
      'default-registry-alias': 'npm',
      identity: opts.identity ?? '',
      packageJson: {
        maybeRead: (dir: string) =>
          dir === '/p' ? opts.manifest : undefined,
        read: (dir: string, o?: { reload?: boolean }) => {
          const m =
            o?.reload ?
              (opts.installed ?? opts.manifest)
            : opts.manifest
          if (dir !== '/p' || !m) {
            throw new Error('Could not read package.json file')
          }
          return m
        },
      },
    },
    layers: opts.layers ?? {},
    addConfigToFile: async (
      which: string,
      values: Record<string, unknown>,
    ) => {
      opts.events?.push('write')
      added.push([which, values])
    },
    abort: () => opts.events?.push('abort'),
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
        // gh and npm match the built-in defaults -> skipped (the account
        // npm mirror wins); loc is custom; slashless url gets normalized.
        registries: {
          gh: defaultRegistries.gh,
          npm: 'https://registry.vlt.io/upstream/npm/',
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

t.test('wizard PATH step', async t => {
  const Q = 'Setup PATH for global installs? (Y/n) '
  const asked = [
    'Authenticate with your vlt.io account now? (Y/n) ',
    'Add another registry alias? (y/N) ',
  ]
  const registries = {
    npm: 'https://registry.vlt.io/acme/npm/',
    main: 'https://registry.vlt.io/acme/main/',
  }
  const zshrc = [{ file: '/h/.zshrc', kind: 'rc', action: 'append' }]
  const tty = (t: Test) => {
    t.intercept(process.stdin, 'isTTY', { value: true })
    t.intercept(process, 'env', { value: { SHELL: '/bin/zsh' } })
  }
  // skip auth, no more aliases, then the PATH answers
  const run = async (
    t: Test,
    {
      answers = [],
      path = {},
      conf = {},
    }: {
      answers?: (string | Error)[]
      path?: PathMock
      conf?: Parameters<typeof makeConf>[0]
    } = {},
  ) => {
    const added: Added[] = []
    const r = await loadSetup(
      ['n', 'n', ...answers],
      undefined,
      // proves the keychain step ran first
      { 'https://registry.vlt.io/acme/main': 'Bearer main' },
      undefined,
      path,
    )
    // tap writes to stdout too: restore before asserting
    const written = t.capture(process.stdout, 'write', () => true)
    const result = await r.mod
      .command(makeConf({ positionals: ['acme'], ...conf }, added))
      .finally(() => written.restore())
    t.strictSame(added, [['user', { registries }]], 'config written')
    t.strictSame(r.kcWrites, [
      ['https://registry.vlt.io/acme/npm', 'Bearer main', ''],
    ])
    t.strictSame(result.registries, registries)
    t.strictSame(r.calls.asked, [], 'no 2nd readline')
    return {
      ...r,
      result,
      written: written.args().map(a => String(a[0])),
    }
  }

  t.test('not a terminal', async t => {
    const { result, questions, calls, written } = await run(t)
    t.strictSame(written, [])
    t.notOk('path' in result)
    t.strictSame(questions, asked)
    t.strictSame(calls.resolved, [])
  })

  t.test('--yes', async t => {
    tty(t)
    const added: Added[] = []
    const { mod, questions, calls } = await loadSetup(
      [],
      undefined,
      undefined,
      undefined,
      {},
    )
    const result = await mod.command(
      makeConf({ yes: true, positionals: ['acme'] }, added),
    )
    t.notOk('path' in result)
    t.strictSame(questions, [])
    t.strictSame(calls.resolved, [])
  })

  t.test('no-modify-path', async t => {
    tty(t)
    const { result, questions, calls } = await run(t, {
      conf: { noModifyPath: true },
    })
    t.notOk('path' in result)
    t.strictSame(questions, asked)
    t.strictSame(calls.resolved, [])
  })

  t.test('no global project', async t => {
    tty(t)
    const { result, calls } = await run(t, {
      conf: { globalProject: () => undefined },
    })
    t.notOk('path' in result)
    t.strictSame(calls.resolved, [])
  })

  t.test('in path', async t => {
    tty(t)
    const { result, questions, calls } = await run(t, {
      path: { inPath: true },
    })
    const { sourceCommand } =
      await import('../../src/shell-setup/index.ts')
    t.strictSame(result.path, {
      status: 'in-path',
      dir: '/b',
      shell: 'zsh',
      files: [],
      backups: [],
      command: shellPathCommand('zsh', '/b'),
      source: sourceCommand('zsh', '/g', '/b'),
    })
    t.strictSame(questions, asked)
    t.equal(calls.plan, 0)
  })

  t.test('unchanged', async t => {
    tty(t)
    const { result, questions, calls } = await run(t, {
      path: { changed: false },
    })
    t.match(result.path, { status: 'unchanged' })
    t.strictSame(questions, asked)
    t.equal(calls.apply, 0)
  })

  t.test('answer default', async t => {
    tty(t)
    const { result, questions, calls } = await run(t, {
      answers: [''],
      conf: { globalProject: () => ({ root: '/g', binDir: '/b' }) },
    })
    t.strictSame(questions, [...asked, Q])
    t.strictSame(calls.resolved, [
      { projectRoot: '/g', globalBinDir: '/b' },
    ])
    t.equal(calls.plan, 2, 'planned again after asking')
    t.equal(calls.apply, 1)
    t.match(result.path, {
      status: 'added',
      dir: '/b',
      shell: 'zsh',
      files: zshrc,
      backups: ['/g/backups/.zshrc.1.bak'],
    })
  })

  t.test('answer no', async t => {
    tty(t)
    const { result, questions, calls } = await run(t, {
      answers: ['n'],
    })
    t.strictSame(questions, [...asked, Q])
    t.match(result.path, { status: 'cancelled', files: zshrc })
    t.equal(calls.apply, 0)
  })

  t.test('Ctrl-C skips', async t => {
    tty(t)
    const abort = Object.assign(new Error('Aborted with Ctrl+C'), {
      name: 'AbortError',
    })
    const { result, calls, written } = await run(t, {
      answers: [abort],
    })
    t.strictSame(written, ['\n'])
    t.match(result.path, { status: 'cancelled' })
    t.equal(calls.apply, 0)
  })

  t.test('prompt error', async t => {
    tty(t)
    const { result } = await run(t, { answers: [new Error('boom')] })
    t.strictSame(result.path, { status: 'failed', message: 'boom' })
  })

  t.test('plan error', async t => {
    tty(t)
    const { result, calls } = await run(t, {
      path: {
        planError: error("doesn't support nu yet", { found: 'nu' }),
      },
    })
    t.strictSame(result.path, {
      status: 'failed',
      message: "doesn't support nu yet",
    })
    t.equal(calls.apply, 0)
  })

  t.test('bin dir error names it', async t => {
    tty(t)
    const { result, calls } = await run(t, {
      path: {
        resolveError: error('Could not create global-bin-dir', {
          found: '/p',
        }),
      },
    })
    t.strictSame(result.path, {
      status: 'failed',
      message: 'Could not create global-bin-dir: /p',
    })
    t.equal(calls.plan, 0)
  })

  t.test('apply error', async t => {
    tty(t)
    const { result, calls } = await run(t, {
      answers: ['y'],
      path: { applyError: new Error('EACCES') },
    })
    t.strictSame(result.path, { status: 'failed', message: 'EACCES' })
    t.equal(calls.apply, 1)
  })
})

t.test('wizard views', async t => {
  const { mod } = await loadSetup([])
  const result = {
    account: 'acme',
    which: 'user',
    registries: { npm: 'u', main: 'm' },
  } as const
  const head =
    'Configured 2 registry aliases for "acme" in user config:\n  npm -> u\n  main -> m'
  const tail =
    "\n\nInstalls now use your account's npm mirror (no usage limits), e.g.:\n  vlt install <pkg>"
  const r = {
    dir: '/b',
    shell: 'zsh' as const,
    files: [
      {
        file: '/h/.zshrc',
        kind: 'rc' as const,
        action: 'append' as const,
      },
    ],
    backups: [],
    command: 'export PATH="/b:$PATH"',
    source: 'source "/g/env"',
  }
  const view = (path?: SetupResult['path']) =>
    mod.views.human({ ...result, ...(path ? { path } : {}) })
  t.equal(view(), head + tail)
  t.equal(
    view({ ...r, status: 'added' }),
    head +
      '\n\n✅ Added /b to your PATH in /h/.zshrc\n   Open a new terminal, or run: source "/g/env"' +
      tail,
  )
  t.equal(
    view({ ...r, status: 'unchanged' }),
    head +
      '\n\n✅ /b is already added to your PATH in /h/.zshrc\n   Open a new terminal, or run: source "/g/env"' +
      tail,
  )
  t.equal(view({ ...r, status: 'in-path' }), head + tail)
  t.equal(
    mod.views.human({
      ...result,
      shadowedByProject: true,
      path: { ...r, status: 'added' },
    }),
    head +
      "\n\nNote: this project's vlt.json configures its own registries, and\nproject config takes precedence. Re-run with `--config=project`\nto configure this project instead." +
      '\n\n✅ Added /b to your PATH in /h/.zshrc\n   Open a new terminal, or run: source "/g/env"' +
      tail,
    'note, then PATH lines',
  )
  t.equal(
    view({ ...r, status: 'cancelled' }),
    head +
      '\n\nℹ️  Skipped. Run `vlt setup --path` later to add /b to your PATH.' +
      tail,
  )
  t.intercept(process, 'platform', { value: 'win32' })
  t.equal(
    view({ ...r, status: 'cancelled' }),
    head +
      '\n\nℹ️  Skipped. Run `vlt setup --path` later to add /b to your PATH.' +
      tail,
    'no session hint',
  )
  t.equal(
    view({ status: 'failed', message: 'nope' }),
    head +
      '\n\n⚠️  Could not add the global bin folder to your PATH: nope' +
      tail,
  )
})

const loadPath = async (
  t: Test,
  o: {
    inPath?: boolean
    changed?: boolean
    planError?: Error
    answer?: string | Error
    env?: NodeJS.ProcessEnv
    plan?: PathSetupPlan
  } = {},
) => {
  t.intercept(process, 'env', {
    value: o.env ?? { SHELL: '/bin/zsh' },
  })
  const real = await import('../../src/shell-setup/index.ts')
  const calls = {
    resolved: [] as unknown[],
    plan: [] as PathSetupOptions[],
    apply: 0,
    asked: [] as string[],
  }
  const action = o.changed === false ? 'unchanged' : 'append'
  const plan: PathSetupPlan = o.plan ?? {
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
      resolveGlobalBinDir: async (c: unknown) => {
        calls.resolved.push(c)
        return {
          dir: '/b',
          source: 'global-dir',
          inPath: !!o.inPath,
        }
      },
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
          backups: [
            p.registry ?
              '/g/backups/Path.1.bak'
            : '/g/backups/.zshrc.1.bak',
          ],
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
    source: real.sourceCommand('zsh', '/g', '/b'),
    command: shellPathCommand('zsh', '/b'),
  }
}

const pathConf = (
  o: {
    positionals?: string[]
    yes?: boolean
    noModifyPath?: boolean
    globalBinDir?: string
  } = {},
) =>
  ({
    globalRoot: '/g',
    projectRoot: '/g',
    globalBinDir: o.globalBinDir,
    explicit: {},
    jack: definition,
    positionals: o.positionals ?? [],
    get: (k: string) =>
      k === 'yes' ? o.yes
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
    const conf = pathConf({ globalBinDir: '/b' })
    t.strictSame(await mod.command(conf), {
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
    t.strictSame(calls.resolved, [
      { projectRoot: '/g', globalBinDir: '/b' },
    ])
    t.strictSame(calls.plan, [])
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
      message: 'Not a terminal: pass --yes to add it to your PATH',
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

  t.test('win32: user Path', async t => {
    const registry = {
      key: 'HKCU\\Environment',
      dir: '/b',
      action: 'prepend',
      previous: 'C:\\a',
      data: '/b;C:\\a',
    } as const
    const loadWin = async (t: Test) => {
      const r = await loadPath(t, {
        env: {},
        plan: {
          globalDir: '/g',
          dir: '/b',
          shell: 'cmd',
          changes: [],
          registry,
        },
      })
      t.intercept(process, 'platform', { value: 'win32' })
      return r
    }

    t.test('asks', async t => {
      const { mod, calls } = await loadWin(t)
      t.intercept(process.stdin, 'isTTY', { value: true })
      t.match(await mod.command(pathConf()), {
        path: { status: 'added', backups: ['/g/backups/Path.1.bak'] },
      })
      t.strictSame(calls.asked, [
        'Add /b to your PATH in your Windows user environment? (Y/n) ',
      ])
      t.equal(calls.plan.length, 2, 'planned again after asking')
      t.equal(calls.apply, 1)
    })

    t.test('--yes', async t => {
      const { mod, calls } = await loadWin(t)
      t.strictSame(await mod.command(pathConf({ yes: true })), {
        path: {
          dir: '/b',
          shell: 'cmd',
          files: [
            {
              file: 'HKCU\\Environment',
              kind: 'registry',
              action: 'prepend',
            },
          ],
          backups: ['/g/backups/Path.1.bak'],
          command: 'set "PATH=%PATH%;/b"',
          source: 'set "PATH=%PATH%;/b"',
          status: 'added',
        },
      })
      t.match(calls.plan, [{ shell: 'cmd' }])
    })
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
    t.intercept(process, 'platform', { value: 'linux' })
    t.equal(
      view('disabled'),
      'ℹ️  no-modify-path is set, so nothing was changed. To add /b to your PATH, run:\n  export PATH="/b:$PATH"',
    )
    t.equal(
      view('cancelled'),
      'Nothing changed. To add /b to your PATH, run:\n  export PATH="/b:$PATH"',
    )
    t.intercept(process, 'platform', { value: 'win32' })
    const keep =
      '\n  To keep it: Start > "Edit environment variables for your account" > Path'
    t.equal(
      view('disabled'),
      'ℹ️  no-modify-path is set, so nothing was changed. To add /b to your PATH, run:\n  export PATH="/b:$PATH"' +
        keep,
    )
    t.equal(
      view('cancelled'),
      'Nothing changed. To add /b to your PATH, run:\n  export PATH="/b:$PATH"' +
        keep,
    )
    const reg = (status: 'added' | 'unchanged') =>
      mod.views.human({
        path: {
          ...r,
          files: [
            {
              file: 'HKCU\\Environment',
              kind: 'registry',
              action: 'prepend',
            },
          ],
          backups: [],
          source: 'set "PATH=%PATH%;/b"',
          status,
        },
      })
    t.equal(
      reg('added'),
      '✅ Added /b to your PATH in your Windows user environment\n   Open a new terminal (restart editors like VS Code), or run: set "PATH=%PATH%;/b"',
    )
    t.equal(
      reg('unchanged'),
      '✅ /b is already added to your PATH in your Windows user environment\n   Open a new terminal, or run: set "PATH=%PATH%;/b"',
    )
  })
})

const SKILLS = '@vltpkg/skills'
const npm = { npm: 'https://registry.npmjs.org/' }
const acme = {
  npm: 'https://registry.vlt.io/acme/npm/',
  main: 'https://registry.vlt.io/acme/main/',
}
const pkg = { name: 'p', version: '1.0.0' }
const installedPkg = {
  ...pkg,
  devDependencies: { [SKILLS]: '^1.6.4' },
}
const fresh = `:not(:malware), #${SKILLS}`
const skillRow = (skill: string, dir = '.agents/skills') => ({
  name: SKILLS,
  version: '1.6.4',
  id: joinDepIDTuple(['registry', '', `${SKILLS}@1.6.4`]),
  skill,
  path: `/p/node_modules/${SKILLS}/dist/skills/${skill}`,
  linked: [],
  dir,
  mount: `${dir}/${skill}`,
})
const links: LinkSkillsResult = {
  linked: [
    skillRow('dss-query'),
    skillRow('vlt-cli'),
    skillRow('vlt-cli', '.claude/skills'),
  ],
  unchanged: [],
  removed: [],
  conflicts: [],
  dirs: ['.agents/skills', '.claude/skills'],
}
const skillsQ = 'Do you want to install vlt skills? (Y/n) '
const wizardQs = [
  'Authenticate with your vlt.io account now? (Y/n) ',
  'Add another registry alias? (y/N) ',
]

// the `add` map of `vlt install -D @vltpkg/skills` on the root
const assertAdd = (t: Test, add?: AddImportersDependenciesMap) => {
  t.equal(add?.modifiedDependencies, true)
  t.strictSame(
    [...(add?.keys() ?? [])],
    [joinDepIDTuple(['file', '.'])],
  )
  const deps = add?.get(joinDepIDTuple(['file', '.']))
  t.strictSame([...(deps?.keys() ?? [])], [SKILLS])
  t.equal(deps?.get(SKILLS)?.type, 'dev')
  t.equal(deps?.get(SKILLS)?.spec.name, SKILLS)
}

type ConfOpts = Parameters<typeof makeConf>[0]

t.test('wizard skills step', async t => {
  const run = async (
    t: Test,
    {
      answers = [],
      conf = {},
      reloaded = {},
      skills = {},
    }: {
      answers?: (string | Error)[]
      conf?: ConfOpts
      reloaded?: ConfOpts
      skills?: SkillsMock
    } = {},
  ) => {
    const added: Added[] = []
    const events: string[] = []
    const r = await loadSetup(
      conf.yes ? [] : ['n', 'n', ...answers],
      undefined,
      undefined,
      undefined,
      undefined,
      {
        events,
        links,
        reloaded: makeConf(
          {
            registries: acme,
            manifest: pkg,
            installed: installedPkg,
            events,
            ...reloaded,
          },
          added,
        ),
        ...skills,
      },
    )
    // tap writes to stdout too: restore before asserting
    const written = t.capture(process.stdout, 'write', () => true)
    const result = await r.mod
      .command(
        makeConf(
          {
            positionals: ['acme'],
            config: 'project',
            globalProject: () => undefined,
            manifest: pkg,
            events,
            ...conf,
          },
          added,
        ),
      )
      .finally(() => written.restore())
    return {
      ...r,
      result,
      added,
      events,
      written: written.args().map(a => String(a[0])),
    }
  }
  const tty = (t: Test) =>
    t.intercept(process.stdin, 'isTTY', { value: true })
  const saved = [
    ['project', { registries: acme }],
    ['project', { 'allow-skills': fresh }],
  ]

  t.test('answer default', async t => {
    tty(t)
    t.intercept(process, 'env', {
      value: { VLT_REGISTRIES: 'npm=https://registry.npmjs.org/' },
    })
    const { result, questions, events, added, installs, reloads } =
      await run(t, { answers: [''] })
    t.strictSame(questions, [...wizardQs, skillsQ])
    t.strictSame(
      events,
      ['write', 'close', 'reload', 'install', 'write'],
      'readline closed, saved after the install',
    )
    t.strictSame(added, saved)
    t.strictSame(reloads, [{ folder: '/p', env: undefined }])
    t.strictSame(result.skills, {
      status: 'installed',
      query: fresh,
      saved: true,
      added: '^1.6.4',
      links,
    })
    t.equal(installs.length, 1)
    t.match(installs[0]?.opts, {
      allowSkills: fresh,
      lockfileOnly: false,
      allowScripts: ':not(*)',
      registries: acme,
    })
    assertAdd(t, installs[0]?.add)
    t.notOk('skillsHint' in result)
  })

  t.test(
    'answer yes, keeps registries given for this run',
    async t => {
      tty(t)
      t.intercept(process, 'env', {
        value: { VLT_REGISTRIES: 'npm=https://x/\nteam=https://t/' },
      })
      const { result, reloads } = await run(t, {
        answers: ['y'],
        conf: { explicit: { registries: ['team=https://t/'] } },
      })
      t.strictSame(reloads, [
        { folder: '/p', env: 'team=https://t/' },
      ])
      t.match(result.skills, { status: 'installed' })
    },
  )

  t.test('--yes', async t => {
    const { result, questions, added, installs } = await run(t, {
      conf: { yes: true },
    })
    t.strictSame(questions, [])
    t.strictSame(added, saved)
    t.equal(installs.length, 1)
    t.match(result.skills, { status: 'installed', query: fresh })
  })

  t.test('after the PATH step', async t => {
    tty(t)
    t.intercept(process, 'env', { value: { SHELL: '/bin/zsh' } })
    const abort = Object.assign(new Error('Aborted with Ctrl+C'), {
      name: 'AbortError',
    })
    // Ctrl-C closes the readline: the skills prompt opens a new one
    for (const pathAnswer of ['n', abort]) {
      const added: Added[] = []
      const events: string[] = []
      const r = await loadSetup(
        ['n', 'n', pathAnswer, 'n'],
        undefined,
        undefined,
        undefined,
        {},
        { events },
      )
      const written = t.capture(process.stdout, 'write', () => true)
      const result = await r.mod
        .command(
          makeConf(
            {
              positionals: ['acme'],
              config: 'project',
              manifest: pkg,
              events,
            },
            added,
          ),
        )
        .finally(() => written.restore())
      t.strictSame(r.questions, [
        ...wizardQs,
        'Setup PATH for global installs? (Y/n) ',
        skillsQ,
      ])
      t.match(result, {
        path: { status: 'cancelled' },
        skills: { status: 'cancelled' },
      })
    }
  })

  t.test('--skills only from the command line', async t => {
    tty(t)
    const { result, questions, installs } = await run(t, {
      answers: ['n'],
      conf: { explicit: { skills: true } },
    })
    t.strictSame(questions, [...wizardQs, skillsQ], 'the wizard')
    t.match(result, {
      account: 'acme',
      skills: { status: 'cancelled' },
    })
    t.strictSame(installs, [])
  })

  t.test('not a terminal', async t => {
    const { result, questions, events } = await run(t)
    t.strictSame(questions, wizardQs)
    t.notOk('skills' in result)
    t.strictSame(events, ['write', 'close'])
  })

  t.test('no package.json', async t => {
    tty(t)
    const { result, questions, events } = await run(t, {
      conf: { manifest: undefined },
    })
    t.strictSame(questions, wizardQs)
    t.notOk('skills' in result)
    t.notOk('skillsHint' in result)
    t.strictSame(events, ['write', 'close'])
  })

  t.test('nothing to do', async t => {
    tty(t)
    const query = `#${SKILLS}:skill(vlt-cli)`
    const { result, questions, events } = await run(t, {
      conf: {
        manifest: installedPkg,
        layers: { project: { 'allow-skills': query } },
      },
    })
    t.strictSame(questions, wizardQs)
    t.strictSame(result.skills, { status: 'unchanged', query })
    t.strictSame(events, ['write', 'close'], 'no install')
  })

  t.test('answer no', async t => {
    tty(t)
    const { result, events } = await run(t, { answers: ['n'] })
    t.strictSame(result.skills, { status: 'cancelled' })
    t.strictSame(events, ['write', 'close'])
  })

  t.test('Ctrl-C skips', async t => {
    tty(t)
    const abort = Object.assign(new Error('Aborted with Ctrl+C'), {
      name: 'AbortError',
    })
    const { result, written, events } = await run(t, {
      answers: [abort],
    })
    t.strictSame(written, ['\n'])
    t.strictSame(result.skills, { status: 'cancelled' })
    t.strictSame(events, ['write', 'close'])
  })

  t.test('prompt error', async t => {
    tty(t)
    const { result } = await run(t, { answers: [new Error('boom')] })
    t.strictSame(result.skills, { status: 'failed', message: 'boom' })
  })

  t.test('install fails, --yes too', async t => {
    for (const [conf, readline] of [
      [{}, ['close']],
      [{ yes: true }, []],
    ] as const) {
      tty(t)
      const { result, added, events } = await run(t, {
        answers: ['y'],
        conf,
        skills: {
          installError: new Error('Missing or invalid token'),
        },
      })
      t.strictSame(result.skills, {
        status: 'failed',
        message: 'Missing or invalid token',
      })
      t.strictSame(
        added,
        [['project', { registries: acme }]],
        'no allow-skills saved',
      )
      t.strictSame(events, [
        'write',
        ...readline,
        'reload',
        'install',
        'abort',
      ])
    }
  })

  t.test('invalid stored allow-skills, --yes', async t => {
    const { result, added, installs } = await run(t, {
      conf: { yes: true },
      reloaded: {
        layers: { project: { 'allow-skills': ':malwre' } },
      },
    })
    t.match(result.skills, {
      status: 'failed',
      message: /^Invalid --allow-skills query: /,
    })
    t.strictSame(installs, [])
    t.strictSame(added, [['project', { registries: acme }]])
  })

  t.test('reload fails', async t => {
    const { result, installs } = await run(t, {
      conf: { yes: true },
      skills: { reloadError: new Error('bad vlt.json') },
    })
    t.strictSame(result.skills, {
      status: 'failed',
      message: 'bad vlt.json',
    })
    t.strictSame(installs, [])
  })

  t.test('user config never asks, hints', async t => {
    tty(t)
    for (const config of [undefined, 'user']) {
      const { result, questions, installs, reloads } = await run(t, {
        conf: { config },
      })
      t.strictSame(questions, wizardQs)
      t.notOk('skills' in result)
      t.equal(result.skillsHint, true)
      t.strictSame(installs, [])
      t.strictSame(reloads, [])
    }
    for (const conf of [
      { manifest: undefined },
      {
        manifest: { ...pkg, optionalDependencies: { [SKILLS]: '1' } },
        layers: { user: { 'allow-skills': `#${SKILLS}` } },
      },
    ]) {
      const { result } = await run(t, {
        conf: { config: 'user', ...conf },
      })
      t.notOk('skillsHint' in result)
    }
    const { result } = await run(t, {
      conf: {
        config: 'user',
        manifest: installedPkg,
        layers: { project: { 'allow-skills': `#${SKILLS},(` } },
      },
    })
    t.equal(result.skillsHint, true, 'invalid query selects nothing')
  })
})

t.test('--skills', async t => {
  t.intercept(process, 'argv', { value: argv('--skills') })
  const run = async ({
    conf = {},
    reloaded = {},
    skills = {},
  }: {
    conf?: ConfOpts
    reloaded?: ConfOpts
    skills?: SkillsMock
  } = {}) => {
    const added: Added[] = []
    const events: string[] = []
    const r = await loadSetup(
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      {
        events,
        links,
        reloaded: makeConf(
          {
            registries: npm,
            manifest: pkg,
            installed: installedPkg,
            events,
            ...reloaded,
          },
          added,
        ),
        ...skills,
      },
    )
    const res = r.mod.skillsCommand(
      makeConf(
        {
          registries: npm,
          manifest: pkg,
          events,
          ...conf,
        },
        added,
      ),
    )
    return { ...r, res, added, events }
  }

  t.test('installs', async t => {
    for (const yes of [undefined, true]) {
      const { res, added, installs, reloads, questions, loginCalls } =
        await run({ conf: { yes } })
      t.strictSame(await res, {
        skills: {
          status: 'installed',
          query: fresh,
          saved: true,
          added: '^1.6.4',
          links,
        },
      })
      t.strictSame(added, [['project', { 'allow-skills': fresh }]])
      t.strictSame(reloads, [{ folder: '/p', env: undefined }])
      t.strictSame(questions, [], 'no prompt, --yes or not')
      t.strictSame(loginCalls, [])
      assertAdd(t, installs[0]?.add)
      t.match(installs[0]?.opts, {
        allowSkills: fresh,
        lockfileOnly: false,
      })
    }
  })

  t.test('skills-dir and nothing linked', async t => {
    const { res, installs } = await run({
      reloaded: { skillsDir: ['.agents/skills'] },
      skills: { links: undefined },
    })
    t.notOk('links' in (await res).skills)
    t.strictSame(installs[0]?.opts.skillsDirs, ['.agents/skills'])
  })

  t.test('saved allow-skills', async t => {
    for (const [layers, query] of [
      [{}, fresh],
      [
        { project: { 'allow-skills': '#other' } },
        `#other, #${SKILLS}`,
      ],
      [{ project: { 'allow-skills': ':not(*)' } }, `#${SKILLS}`],
      [
        { project: { 'allow-skills': '#other,' } },
        `#other, #${SKILLS}`,
      ],
      [{ user: { 'allow-skills': '#other' } }, `#other, #${SKILLS}`],
      [
        {
          project: { 'allow-skills': '' },
          user: { 'allow-skills': '#other' },
        },
        fresh,
      ],
    ] as const) {
      const { res, added, installs } = await run({
        reloaded: { layers },
      })
      t.match(await res, { skills: { query, saved: true } })
      t.strictSame(added, [['project', { 'allow-skills': query }]])
      t.equal(installs[0]?.opts.allowSkills, query)
    }
    // selected, not a dependency yet
    const query = `#other, #${SKILLS}:skill(vlt-cli, dss-query)`
    const { res, added, installs } = await run({
      reloaded: { layers: { project: { 'allow-skills': query } } },
    })
    t.strictSame(await res, {
      skills: { status: 'installed', query, added: '^1.6.4', links },
    })
    t.strictSame(added, [], 'nothing saved')
    assertAdd(t, installs[0]?.add)
  })

  t.test('a root dependency keeps its type and spec', async t => {
    const manifest = { ...pkg, dependencies: { [SKILLS]: '1.6.4' } }
    const { res, added, installs } = await run({
      reloaded: { manifest, installed: manifest },
    })
    t.strictSame(await res, {
      skills: {
        status: 'installed',
        query: fresh,
        saved: true,
        links,
      },
    })
    t.equal(installs[0]?.add, undefined, 'nothing added')
    t.strictSame(added, [['project', { 'allow-skills': fresh }]])
  })

  t.test('not saved to devDependencies', async t => {
    const { res } = await run({ reloaded: { installed: pkg } })
    t.notOk('added' in (await res).skills)
  })

  t.test('again', async t => {
    for (const query of [`#${SKILLS}`, `#other, #${SKILLS},`]) {
      const { res, added, installs } = await run({
        reloaded: {
          manifest: installedPkg,
          layers: { project: { 'allow-skills': query } },
        },
      })
      t.strictSame(await res, {
        skills: { status: 'unchanged', query },
      })
      t.strictSame(installs, [])
      t.strictSame(added, [])
    }
  })

  t.test('an invalid stored allow-skills fails', async t => {
    for (const manifest of [pkg, installedPkg]) {
      const { res, added, installs } = await run({
        reloaded: {
          manifest,
          layers: { project: { 'allow-skills': ':malwre' } },
        },
      })
      await t.rejects(res, {
        message: /^Invalid --allow-skills query: /,
        cause: { code: 'EUSAGE', found: ':malwre' },
      })
      t.strictSame(installs, [])
      t.strictSame(added, [])
    }
  })

  t.test('install fails', async t => {
    const { res, added, events } = await run({
      skills: { installError: new Error('nope') },
    })
    await t.rejects(res, { message: 'nope' })
    t.strictSame(added, [])
    t.strictSame(events, ['reload', 'install', 'abort'])
  })

  t.test('usage errors', async t => {
    const cases: [ConfOpts, string, string][] = [
      [{ positionals: ['acme'] }, 'takes no arguments', 'acme'],
      [
        { config: 'user' },
        "doesn't support --config=user yet",
        '--config=user',
      ],
      [
        { globalRoot: '/g' },
        "can't be combined with --path",
        '--path',
      ],
    ]
    for (const [conf, message, found] of cases) {
      const { res, installs, reloads } = await run({ conf })
      await t.rejects(res, {
        message: `\`vlt setup --skills\` ${message}`,
        cause: { code: 'EUSAGE', found },
      })
      t.strictSame(installs, [])
      t.strictSame(reloads, [])
    }
  })

  t.test('no package.json', async t => {
    const { res, installs } = await run({
      conf: { manifest: undefined },
    })
    await t.rejects(res, {
      message: /^No package\.json found .* Run `vlt init`/,
      cause: { code: 'ECONFIG', found: '/p' },
    })
    t.strictSame(installs, [])
  })

  t.test('broken package.json', async t => {
    const projectRoot = t.testdir({ 'package.json': '{' })
    const { res, installs } = await run({
      conf: { manifest: undefined, projectRoot },
    })
    await t.rejects(res, {
      message: 'Could not read package.json file',
    })
    t.strictSame(installs, [])
  })

  t.test('no registry', async t => {
    const none = await run({ conf: { registries: {} } })
    await t.rejects(none.res, {
      message: /^Missing npm registry configuration/,
      cause: { code: 'ECONFIG' },
    })
    const main = await run({
      conf: { registries: {}, registry: 'https://r/' },
    })
    await t.rejects(main.res, {
      message: /^Missing npm registry configuration/,
    })
    t.strictSame([...none.installs, ...main.installs], [])
  })

  t.test('the built-in npm mirror is enough', async t => {
    const { res, installs } = await run({
      conf: {
        registries: {
          gh: 'https://npm.pkg.github.com/',
          npm: 'https://registry.vlt.io/upstream/npm/',
        },
      },
    })
    t.match(await res, { skills: { status: 'installed' } })
    t.equal(installs.length, 1, 'installed')
  })
})

t.test('skills views', async t => {
  const { mod } = await loadSetup([])
  const installed = {
    status: 'installed',
    query: fresh,
    saved: true,
    added: '^1.6.4',
    links,
  } as const
  const lines = [
    'Added @vltpkg/skills to devDependencies',
    '🔗 Linked 2 agent skills into .agents/skills, .claude/skills',
    `Saved allow-skills="${fresh}" to vlt.json`,
  ].join('\n')
  t.equal(mod.views.human({ skills: installed }), lines)
  t.equal(
    mod.views.human({
      skills: { status: 'installed', query: '#x', saved: true },
    }),
    'Saved allow-skills="#x" to vlt.json',
  )
  t.equal(
    mod.views.human({
      skills: { status: 'installed', query: '#x', added: '^1.6.4' },
    }),
    'Added @vltpkg/skills to devDependencies',
    'already selected: nothing saved',
  )
  t.equal(
    mod.views.human({ skills: { status: 'unchanged', query: '#x' } }),
    '✅ The vlt skills are already set up: @vltpkg/skills is a dependency and allow-skills selects it.',
  )

  const head =
    'Configured 1 registry alias for "acme" in project config:\n  npm -> u'
  const tail =
    "\n\nInstalls now use your account's npm mirror (no usage limits), e.g.:\n  vlt install <pkg>"
  const wizard = {
    account: 'acme',
    which: 'project',
    registries: { npm: 'u' },
  } as const
  const view = (skills?: SetupResult['skills']) =>
    mod.views.human({ ...wizard, ...(skills ? { skills } : {}) })
  t.equal(view(installed), `${head}\n\n${lines}${tail}`)
  t.equal(view({ status: 'unchanged', query: '#x' }), head + tail)
  t.equal(
    view({ status: 'cancelled' }),
    head +
      '\n\nℹ️  Skipped. Run `vlt setup --skills` later to install the vlt skills.' +
      tail,
  )
  t.equal(
    view({ status: 'failed', message: 'nope' }),
    head +
      '\n\n⚠️  Could not install the vlt skills: nope\n   Run `vlt setup --skills` to try again.' +
      tail,
  )
  t.equal(
    mod.views.human({ ...wizard, which: 'user', skillsHint: true }),
    head.replace('project', 'user') +
      tail +
      "\n\nRun `vlt setup --skills` to install vlt's agent skills in this project.",
  )

  const json = {
    ...installed,
    links: {
      linked: [
        '.agents/skills/dss-query',
        '.agents/skills/vlt-cli',
        '.claude/skills/vlt-cli',
      ],
      removed: [],
      conflicts: [],
      dirs: ['.agents/skills', '.claude/skills'],
    },
  }
  t.strictSame(mod.views.json({ skills: installed }), {
    skills: json,
  })
  t.strictSame(mod.views.json({ ...wizard, skills: installed }), {
    ...wizard,
    skills: json,
  })
  for (const r of [
    { skills: { status: 'unchanged', query: '#x' } },
    { ...wizard, skills: { status: 'installed', query: '#x' } },
    wizard,
  ] as const) {
    t.strictSame(mod.views.json(r), r)
  }
  const path = {
    status: 'in-path' as const,
    dir: '/b',
    shell: 'zsh' as const,
    files: [],
    backups: [],
    command: '',
    source: '',
  }
  t.strictSame(mod.views.json({ path }), { path })
})
