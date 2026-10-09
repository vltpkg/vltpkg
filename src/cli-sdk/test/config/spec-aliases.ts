import t from 'tap'
import { assertSpecAliases } from '../../src/config/spec-aliases.ts'

const u = 'https://x/'

t.test('ok', async t => {
  t.doesNotThrow(() => assertSpecAliases({}))
  t.doesNotThrow(() =>
    assertSpecAliases({
      registries: undefined,
      'jsr-registries': undefined,
      'git-hosts': undefined,
    }),
  )
  t.doesNotThrow(
    () =>
      assertSpecAliases({
        registries: { gh: u, npm: u },
        'jsr-registries': { jsr: u },
        'git-hosts': { github: u },
      }),
    'same-field overrides',
  )
  t.doesNotThrow(
    () =>
      assertSpecAliases({
        registries: { a: u },
        'jsr-registries': { b: u },
        'git-hosts': { c: u },
      }),
    'distinct names',
  )
})

t.test('configured vs built-in', async t => {
  for (const [field, key, owner] of [
    ['registries', 'github', 'git-hosts'],
    ['registries', 'jsr', 'jsr-registries'],
    ['git-hosts', 'gh', 'registries'],
    ['jsr-registries', 'gitlab', 'git-hosts'],
  ] as const) {
    t.throws(() => assertSpecAliases({ [field]: { [key]: u } }), {
      message: `\`${key}:\` spec prefix defined in both ${owner}.${key} (built-in) and ${field}.${key}`,
      cause: {
        code: 'ECONFIG',
        name: `${field}.${key}`,
        found: key,
        wanted: `a ${field} name not used by ${owner}`,
      },
    })
  }
})

t.test('configured vs configured', async t => {
  t.throws(
    () =>
      assertSpecAliases({
        registries: { acme: u },
        'jsr-registries': { acme: u },
      }),
    {
      message:
        '`acme:` spec prefix defined in both registries.acme and jsr-registries.acme',
      cause: {
        code: 'ECONFIG',
        name: 'jsr-registries.acme',
        found: 'acme',
        wanted: 'a jsr-registries name not used by registries',
      },
    },
  )
  t.throws(
    () =>
      assertSpecAliases({
        registries: { gh: u },
        'git-hosts': { gh: u },
      }),
    {
      message:
        '`gh:` spec prefix defined in both registries.gh and git-hosts.gh',
      cause: { name: 'git-hosts.gh' },
    },
    'overridden built-in is not labeled built-in',
  )
  t.throws(
    () =>
      assertSpecAliases({
        registries: { github: u },
        'git-hosts': { github: u },
      }),
    {
      message:
        '`github:` spec prefix defined in both registries.github and git-hosts.github',
      cause: {
        name: 'git-hosts.github',
        wanted: 'a git-hosts name not used by registries',
      },
    },
  )
  t.throws(
    () => assertSpecAliases({ registries: { github: '' } }),
    { cause: { name: 'registries.github' } },
    'empty value counts',
  )
})

t.test('built-in protocol', async t => {
  for (const [field, key] of [
    ['registries', 'file'],
    ['git-hosts', 'https'],
    ['jsr-registries', 'workspace'],
    ['registries', 'git+ssh'],
  ] as const) {
    t.throws(() => assertSpecAliases({ [field]: { [key]: u } }), {
      message: `${field}.${key} shadows the built-in \`${key}:\` protocol`,
      cause: {
        code: 'ECONFIG',
        name: `${field}.${key}`,
        found: key,
        wanted: 'a name that is not a built-in protocol',
      },
    })
  }
})
