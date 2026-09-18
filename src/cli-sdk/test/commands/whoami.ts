import { assertOk } from '@vltpkg/registry-client'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

// t.mockImport replaces the module wholesale rather than merging, so
// every name the command imports has to be present here.
const mockRC = (response: unknown) => ({
  assertOk,
  RegistryClient: class {
    async request(url: string | URL, config: { useCache: false }) {
      t.equal(String(url), 'https://registry/-/whoami')
      t.strictSame(config, { useCache: false })
      return response
    }
  },
})

const Command = await t.mockImport<
  typeof import('../../src/commands/whoami.ts')
>('../../src/commands/whoami.ts', {
  '@vltpkg/registry-client': mockRC({
    statusCode: 200,
    json: () => ({ username: 'username' }),
  }),
})

t.matchSnapshot(Command.usage().usageMarkdown())

const config = {
  options: {
    registry: 'https://registry',
  },
} as LoadedConfig

t.strictSame(await Command.command(config), { username: 'username' })

t.strictSame(Command.views.json({}), {})
t.strictSame(
  Command.views.human({ username: 'username' }),
  'username',
)

t.test('reports an auth failure with status and advice', async t => {
  const Command = await t.mockImport<
    typeof import('../../src/commands/whoami.ts')
  >('../../src/commands/whoami.ts', {
    '@vltpkg/registry-client': mockRC({
      statusCode: 401,
      text: () => '{"error":"unauthorized"}',
      json: () => ({ error: 'unauthorized' }),
    }),
  })
  await t.rejects(Command.command(config), {
    message:
      'Failed to look up the current user: 401 Unauthorized — unauthorized\n' +
      '⚠️ Not logged in to https://registry. Run `vlt login` and try again.',
    cause: { code: 'ENEEDAUTH', status: 401, method: 'GET' },
  })
})

t.test('rejects a 200 that carries no username', async t => {
  const Command = await t.mockImport<
    typeof import('../../src/commands/whoami.ts')
  >('../../src/commands/whoami.ts', {
    '@vltpkg/registry-client': mockRC({
      statusCode: 200,
      json: () => ({}),
    }),
  })
  await t.rejects(Command.command(config), {
    message: 'Registry did not report a username',
    cause: { code: 'EREQUEST' },
  })
})

t.test('a server error carries no login advice', async t => {
  const Command = await t.mockImport<
    typeof import('../../src/commands/whoami.ts')
  >('../../src/commands/whoami.ts', {
    '@vltpkg/registry-client': mockRC({
      statusCode: 500,
      text: () => 'kaboom',
    }),
  })
  await t.rejects(Command.command(config), {
    message:
      'Failed to look up the current user: 500 Internal Server Error — kaboom',
    cause: { code: 'EREQUEST', status: 500 },
  })
})
