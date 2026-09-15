import {
  defaultGitHostArchives,
  defaultGitHosts,
  defaultJsrRegistries,
  defaultRegistries,
} from '@vltpkg/spec'
import t from 'tap'
import type { LoadedConfig } from '../src/config/index.ts'

const { planSpecConfigPersist, persistedEntries } =
  await t.mockImport<typeof import('../src/persist-spec-config.ts')>(
    '../src/persist-spec-config.ts',
    {
      '@vltpkg/vlt-json': {
        ...(await import('@vltpkg/vlt-json')),
        find: (which: string) => `/${which}/vlt.json`,
      },
    },
  )

const conf = (
  explicit: Record<string, unknown>,
  layers: {
    user?: Record<string, unknown>
    project?: Record<string, unknown>
  } = {},
  config?: string,
  command = 'install',
  saveConfig = true,
) =>
  ({
    explicit,
    layers,
    command,
    get: (k: string) =>
      k === 'config' ? config
      : k === 'save-config' ? saveConfig
      : undefined,
  }) as unknown as LoadedConfig

const loc = ['loc=http://loc']

t.test('nothing without --save-config', async t => {
  t.equal(
    planSpecConfigPersist(
      conf({ registries: loc }, {}, undefined, 'install', false),
    ),
    undefined,
  )
})

t.test('nothing explicit', async t => {
  t.equal(planSpecConfigPersist(conf({})), undefined)
  t.equal(
    planSpecConfigPersist(conf({ workspace: ['a'], color: true })),
    undefined,
    'non-spec fields ignored',
  )
})

t.test('stages cli alias, normalized, to project', async t => {
  t.strictSame(planSpecConfigPersist(conf({ registries: loc })), {
    which: 'project',
    values: { registries: { loc: 'http://loc/' } },
  })
})

t.test('file layers decide', async t => {
  t.equal(
    planSpecConfigPersist(
      conf(
        { registries: loc },
        { project: { registries: { loc: 'http://loc/' } } },
      ),
    ),
    undefined,
    'same in project',
  )
  t.equal(
    planSpecConfigPersist(
      conf(
        { registries: loc },
        { user: { registries: { loc: 'http://loc' } } },
      ),
    ),
    undefined,
    'same in user',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf(
        { registries: loc },
        { user: { registries: { loc: 'http://other/' } } },
      ),
    )?.values,
    { registries: { loc: 'http://loc/' } },
    'different in user',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf(
        { registries: loc },
        { project: { registries: { loc: null } } },
      ),
    )?.values,
    { registries: { loc: 'http://loc/' } },
    'null in project is absent',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf(
        { registries: loc },
        {
          user: { registries: { loc: 'http://loc/' } },
          project: { registries: { loc: null } },
        },
      ),
    )?.values,
    { registries: { loc: 'http://loc/' } },
    'null in project drops the user value',
  )
  t.throws(
    () =>
      planSpecConfigPersist(
        conf(
          { registries: loc },
          { project: { registries: { loc: 'http://other/' } } },
        ),
      ),
    {
      message:
        'registries.loc is already set to http://other/ in /project/vlt.json.',
      cause: {
        code: 'ECONFIG',
        found: 'http://loc/',
        wanted: 'http://other/',
      },
    },
    'different in project',
  )
  t.throws(
    () =>
      planSpecConfigPersist(
        conf(
          { registry: 'http://a/' },
          { project: { registry: 'http://b/' } },
        ),
      ),
    { message: /^registry is already set to http:\/\/b\/ in/ },
    'scalar conflict',
  )
  t.throws(
    () =>
      planSpecConfigPersist(
        conf(
          { 'default-registry-alias': 'npm' },
          { project: { 'default-registry-alias': 'vlt' } },
        ),
      ),
    { message: /^default-registry-alias is already set to vlt in/ },
    'builtin value conflict',
  )
})

t.test('invalid values are ECONFIG', async t => {
  t.throws(
    () =>
      planSpecConfigPersist(conf({ registries: ['a~b=http://x'] })),
    {
      message: 'Reserved character found in registries name',
      cause: { code: 'ECONFIG', found: 'a~b' },
    },
  )
  for (const f of ['registries', 'scoped-registries', 'git-hosts']) {
    t.throws(
      () => planSpecConfigPersist(conf({ [f]: ['=http://x'] })),
      {
        message: `${f} has an entry with no name.`,
        cause: {
          code: 'ECONFIG',
          found: '=http://x',
          wanted: '<name>=http://x',
        },
      },
      f,
    )
  }
  t.throws(
    () => planSpecConfigPersist(conf({ registries: ['loc2'] })),
    {
      message: 'registries.loc2 has no value.',
      cause: { code: 'ECONFIG', found: 'loc2' },
    },
  )
  t.throws(
    () => planSpecConfigPersist(conf({ 'git-hosts': ['gl='] })),
    { message: 'git-hosts.gl has no value.' },
  )
  t.equal(
    planSpecConfigPersist(conf({ registry: '' })),
    undefined,
    'empty scalar skipped',
  )
})

t.test('command block of the target file', async t => {
  const project = {
    command: {
      install: {
        registry: 'http://blk-reg/',
        registries: { loc: 'http://a/' },
      },
    },
  }
  t.throws(
    () =>
      planSpecConfigPersist(
        conf({ registries: ['loc=http://b'] }, { project }),
      ),
    {
      message:
        'command.install.registries.loc is already set to http://a/ in /project/vlt.json.',
      cause: { code: 'ECONFIG' },
    },
  )
  t.match(
    (() => {
      try {
        planSpecConfigPersist(
          conf({ registry: 'http://b' }, { project }),
        )
      } catch (er) {
        return (er as Error).message
      }
    })(),
    '`vlt config edit` to change it first.',
  )
  t.equal(
    planSpecConfigPersist(
      conf({ registries: ['loc=http://a'] }, { project }),
    ),
    undefined,
    'same value in block',
  )
  t.throws(
    () =>
      planSpecConfigPersist(
        conf(
          { registries: ['loc=http://b'] },
          {
            project: {
              command: { add: { registries: { loc: 'http://a/' } } },
            },
          },
        ),
      ),
    { message: /^command\.add\.registries\.loc is already set/ },
    'aliased command block',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf(
        { registries: ['loc=http://b'] },
        { project },
        undefined,
        'update',
      ),
    )?.values,
    { registries: { loc: 'http://b/' } },
    'other command block ignored',
  )
})

t.test('all spec fields, builtins skipped', async t => {
  t.strictSame(
    planSpecConfigPersist(
      conf({
        registry: 'http://reg',
        'default-registry-alias': 'vlt',
        'scoped-registries': ['@a=http://a'],
        'jsr-registries': [
          `jsr=${defaultJsrRegistries.jsr}`,
          'j2=http://j2',
        ],
        'git-hosts': [
          `github=${defaultGitHosts.github}`,
          'gl=git+ssh://gl/$1',
        ],
        'git-host-archives': [
          `github=${defaultGitHostArchives.github}`,
          'gitlab=https://gl/$1',
        ],
        registries: [`gh=${defaultRegistries.gh}`, 'npm=http://npm'],
      }),
    )?.values,
    {
      registry: 'http://reg/',
      registries: { npm: 'http://npm/' },
      'default-registry-alias': 'vlt',
      'scoped-registries': { '@a': 'http://a/' },
      'jsr-registries': { j2: 'http://j2/' },
      'git-hosts': { gl: 'git+ssh://gl/$1' },
      'git-host-archives': { gitlab: 'https://gl/$1' },
    },
  )
  t.equal(
    planSpecConfigPersist(
      conf({ 'default-registry-alias': 'npm', registries: [] }),
    ),
    undefined,
    'default alias at its default',
  )
  t.strictSame(
    planSpecConfigPersist(conf({ registries: ['gh=http://mygh'] }))
      ?.values,
    { registries: { gh: 'http://mygh/' } },
    'overridden builtin',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf(
        {
          'default-registry-alias': 'npm',
          registries: [`gh=${defaultRegistries.gh}`],
        },
        {
          user: {
            'default-registry-alias': 'vlt',
            registries: { gh: 'http://mygh/' },
          },
        },
      ),
    )?.values,
    {
      registries: { gh: defaultRegistries.gh },
      'default-registry-alias': 'npm',
    },
    'builtin value over a user value',
  )
})

t.test('later pairs win', async t => {
  t.strictSame(
    planSpecConfigPersist(
      conf({ registries: ['loc=http://env', 'loc=http://cli'] }),
    )?.values,
    { registries: { loc: 'http://cli/' } },
  )
})

t.test('registry selection guard', async t => {
  const user = {
    registry: 'http://u/',
    'default-registry-alias': 'vlt',
    registries: { vlt: 'http://vlt/' },
  }
  t.strictSame(
    planSpecConfigPersist(conf({ registries: loc }, { user }))
      ?.values,
    {
      registries: { loc: 'http://loc/', vlt: 'http://vlt/' },
      registry: 'http://u/',
      'default-registry-alias': 'vlt',
    },
    'user selection copied, with the alias url',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf(
        { registries: loc },
        { user: { 'default-registry-alias': 'gh' } },
      ),
    )?.values,
    {
      registries: { loc: 'http://loc/' },
      'default-registry-alias': 'gh',
    },
    'builtin alias has no url to copy',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf(
        { registries: loc },
        { user, project: { registries: { npm: 'http://npm/' } } },
      ),
    )?.values,
    { registries: { loc: 'http://loc/' } },
    'project already owns selection',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf({ registries: loc }, { user }, 'user'),
    ),
    { which: 'user', values: { registries: { loc: 'http://loc/' } } },
    '--config=user',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf({ 'git-hosts': ['gl=git+ssh://gl/$1'] }, { user }),
    )?.values,
    { 'git-hosts': { gl: 'git+ssh://gl/$1' } },
    'no selection field staged',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf({ registries: loc, registry: 'http://cli/' }, { user }),
    )?.values,
    {
      registry: 'http://cli/',
      registries: { loc: 'http://loc/', vlt: 'http://vlt/' },
      'default-registry-alias': 'vlt',
    },
    'staged selector not overwritten',
  )
  t.strictSame(
    planSpecConfigPersist(
      conf(
        { registries: loc, 'default-registry-alias': 'npm' },
        {
          user: {
            ...user,
            registries: { vlt: 'http://vlt/', npm: 'http://npm/' },
          },
        },
      ),
    )?.values,
    {
      registries: { loc: 'http://loc/', npm: 'http://npm/' },
      registry: 'http://u/',
      'default-registry-alias': 'npm',
    },
    'explicit builtin alias kept',
  )
})

t.test(
  'user selectors dropped by a project owning selection',
  async t => {
    const user = {
      registry: 'http://u/',
      'default-registry-alias': 'vlt',
      registries: { vlt: 'http://vlt/' },
    }
    const project = { registries: { loc: 'http://loc/' } }
    t.strictSame(
      planSpecConfigPersist(
        conf({ registry: 'http://u' }, { user, project }),
      )?.values,
      { registry: 'http://u/' },
    )
    t.strictSame(
      planSpecConfigPersist(
        conf({ 'default-registry-alias': 'vlt' }, { user, project }),
      )?.values,
      { 'default-registry-alias': 'vlt' },
    )
    t.equal(
      planSpecConfigPersist(conf({ registry: 'http://u' }, { user })),
      undefined,
      'user selector in effect',
    )
    t.equal(
      planSpecConfigPersist(
        conf(
          { registry: 'http://p' },
          { project: { registry: 'http://p/' } },
          'user',
        ),
      ),
      undefined,
      '--config=user, same in project',
    )
  },
)

t.test('guard keeps a staged alias url', async t => {
  t.strictSame(
    planSpecConfigPersist(
      conf(
        { registries: ['vlt=http://cli-vlt'] },
        {
          user: {
            'default-registry-alias': 'vlt',
            registries: { vlt: 'http://vlt/' },
          },
        },
      ),
    )?.values,
    {
      registries: { vlt: 'http://cli-vlt/' },
      'default-registry-alias': 'vlt',
    },
  )
})

t.test(
  'guard adds the alias url with no staged registries',
  async t => {
    t.strictSame(
      planSpecConfigPersist(
        conf(
          { registry: 'http://cli' },
          {
            user: {
              'default-registry-alias': 'vlt',
              registries: { vlt: 'http://vlt/' },
            },
          },
        ),
      )?.values,
      {
        registry: 'http://cli/',
        'default-registry-alias': 'vlt',
        registries: { vlt: 'http://vlt/' },
      },
    )
  },
)

t.test('through a real Config.load', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({
      config: {
        registries: { loc: 'http://loc/' },
        command: {
          install: { 'git-hosts': { gl: 'git+ssh://a/$1' } },
        },
      },
    }),
    xdg: {
      'vlt.json': JSON.stringify({
        config: {
          registry: 'http://u/',
          registries: { npm: 'http://u/' },
        },
      }),
    },
    '.git': {},
  })
  const xdg = {
    '@vltpkg/xdg': {
      XDG: class XDG {
        config() {
          return dir + '/xdg/vlt.json'
        }
        cache() {
          return dir + '/cache'
        }
      },
    },
  }
  const load = async (argv: string[]) => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('VLT_') || k === '__VLT_INTERNAL_EXPLICIT') {
        delete process.env[k]
      }
    }
    const { Config } = await t.mockImport<
      typeof import('../src/config/index.ts')
    >('../src/config/index.ts', xdg)
    const { planSpecConfigPersist } = await t.mockImport<
      typeof import('../src/persist-spec-config.ts')
    >('../src/persist-spec-config.ts', xdg)
    return planSpecConfigPersist(await Config.load(dir, argv, true))
  }
  t.strictSame(
    await load(['install', '--registry', 'http://u/']),
    undefined,
    'no --save-config',
  )
  const save = ['install', '--save-config']
  t.strictSame(
    await load([...save, '--registry', 'http://u/']),
    { which: 'project', values: { registry: 'http://u/' } },
    'user registry dropped by project selection',
  )
  await t.rejects(
    load([...save, '--git-hosts', 'gl=git+ssh://b/$1']),
    { message: /^command\.install\.git-hosts\.gl is already set/ },
  )
  t.equal(
    await load([...save, '--registries', 'npm=http://u']),
    undefined,
    'alias catalogs merge, same in user',
  )
})

t.test('persistedEntries', async t => {
  t.strictSame(
    persistedEntries({
      registry: 'http://r/',
      registries: { loc: 'http://loc/' },
    }),
    ['registry=http://r/', 'registries.loc=http://loc/'],
  )
})
