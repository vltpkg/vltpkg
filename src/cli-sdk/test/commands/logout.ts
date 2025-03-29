import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
let logoutCalled = ''

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/logout.ts')
>('../../src/commands/logout.ts', {
  '@vltpkg/registry-client': {
    RegistryClient: class {
      async logout(registry: string) {
        logoutCalled = registry
      }
    },
  },
})

t.matchSnapshot(usage().usageMarkdown())
await command({
  options: { registry: 'registry' },
} as LoadedConfig)
t.equal(logoutCalled, 'registry')
