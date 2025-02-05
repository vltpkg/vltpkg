import t from 'tap'
import { commandView } from '../fixtures/run.js'

const Command = await t.mockImport<
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

t.matchSnapshot(Command.usage().usageMarkdown())

t.test('human', async t => {
  const output = await commandView(t, Command, {
    values: { view: 'human' },
    options: { registry: 'https://registry/' },
  })
  t.strictSame(output, 'username')
})

t.test('human', async t => {
  const output = await commandView(t, Command, {
    values: { view: 'json' },
    options: { registry: 'https://registry/' },
  })
  t.strictSame(JSON.parse(output), { username: 'username' })
})
