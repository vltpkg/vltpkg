import t from 'tap'
import { type LoadedConfig } from '../../src/types.js'

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/whoami.js')
>('../../src/commands/whoami.js', {
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

t.matchSnapshot(usage().usageMarkdown())
const logs = t.capture(console, 'log').args
await command({
  options: { registry: 'https://registry/' },
} as unknown as LoadedConfig)

t.strictSame(logs(), [['username']])
