import t from 'tap'
import { type LoadedConfig } from '../../src/types.js'
let logoutCalled = ''

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/logout.js')
>('../../src/commands/logout.js', {
  '@vltpkg/registry-client': {
    RegistryClient: class {
      async logout(registry: string) {
        logoutCalled = registry
      }
    },
  },
})

t.matchSnapshot(usage())
await command({
  options: { registry: 'registry' },
} as unknown as LoadedConfig)
t.equal(logoutCalled, 'registry')
