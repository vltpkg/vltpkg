import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const Command = await t.mockImport<
  typeof import('../../src/commands/whoami.ts')
>('../../src/commands/whoami.ts', {
  '@vltpkg/registry-client': {
    RegistryClient: class {
      async request(url: string | URL, config: { cache: false }) {
        t.equal(String(url), 'https://registry/-/whoami')
        t.strictSame(config, { cache: false })
        return {
          json: () => ({ username: 'username' }),
        }
      }
    },
  },
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
