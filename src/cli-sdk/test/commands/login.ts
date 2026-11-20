import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
let loginCalled = ''

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/login.ts')
>('../../src/commands/login.ts', {
  '@vltpkg/registry-client': {
    RegistryClient: class {
      async login(registry: string) {
        loginCalled = registry
      }
    },
  },
})

t.matchSnapshot(usage().usageMarkdown())

const makeConf = (
  config: string,
  added: [string, Record<string, unknown>][],
  userSet = true,
) =>
  ({
    options: { registry: 'registry' },
    get: (k: string) =>
      k === 'config' ? config
      : k === 'registry' && userSet ? 'registry'
      : undefined,
    addConfigToFile: async (
      which: string,
      values: Record<string, unknown>,
    ) => {
      added.push([which, values])
    },
  }) as unknown as LoadedConfig

t.test('logs in and persists the registry', async t => {
  const added: [string, Record<string, unknown>][] = []
  await command(makeConf('all', added))
  t.equal(loginCalled, 'registry')
  t.strictSame(
    added,
    [['project', { registry: 'registry' }]],
    'writes the registry to the project vlt.json',
  )
})

t.test('--config=user writes the user config', async t => {
  const added: [string, Record<string, unknown>][] = []
  await command(makeConf('user', added))
  t.strictSame(
    added,
    [['user', { registry: 'registry' }]],
    'writes the registry to the user vlt.json',
  )
})

t.test('throws when no registry is configured', async t => {
  loginCalled = ''
  const added: [string, Record<string, unknown>][] = []
  // options.registry is only the default npm alias URL
  await t.rejects(command(makeConf('all', added, false)), {
    cause: { code: 'ECONFIG' },
  })
  t.equal(loginCalled, '', 'did not log in')
  t.strictSame(added, [], 'wrote nothing')
})
