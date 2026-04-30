import type { Token } from '@vltpkg/registry-client'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const log: string[][] = []
const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/token.ts')
>('../../src/commands/token.ts', {
  '@vltpkg/registry-client': {
    normalizeRegistryKey(url: string) {
      const u = new URL(url)
      return (u.origin + u.pathname).replace(/\/+$/, '')
    },
    async setToken(reg: string, tok: Token) {
      log.push(['add', reg, tok])
    },
    async deleteToken(reg: string) {
      log.push(['delete', reg])
    },
  },
  '../../src/read-password.ts': {
    async readPassword(prompt: string) {
      log.push(['readPassword', prompt])
      return 'result'
    },
  },
})

t.matchSnapshot(usage().usageMarkdown())

await command({
  options: { registry: 'https://registry.vlt.javascript/' },
  positionals: ['add'],
} as LoadedConfig)

await command({
  options: { registry: 'https://registry.vlt.javascript/' },
  positionals: ['rm'],
} as LoadedConfig)

t.strictSame(log, [
  ['readPassword', 'Paste bearer token: '],
  ['add', 'https://registry.vlt.javascript', 'Bearer result'],
  ['delete', 'https://registry.vlt.javascript'],
])

t.test('preserves path for path-scoped registry', async t => {
  const pathLog: string[][] = []
  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      normalizeRegistryKey(url: string) {
        const u = new URL(url)
        return (u.origin + u.pathname).replace(/\/+$/, '')
      },
      async setToken(reg: string, tok: Token) {
        pathLog.push(['add', reg, tok])
      },
      async deleteToken(reg: string) {
        pathLog.push(['delete', reg])
      },
    },
    '../../src/read-password.ts': {
      async readPassword(_prompt: string) {
        return 'tok123'
      },
    },
  })
  await cmd({
    options: { registry: 'https://registry.vlt.io/luke/' },
    positionals: ['add'],
  } as LoadedConfig)
  await cmd({
    options: { registry: 'https://registry.vlt.io/luke/' },
    positionals: ['rm'],
  } as LoadedConfig)
  t.strictSame(pathLog, [
    ['add', 'https://registry.vlt.io/luke', 'Bearer tok123'],
    ['delete', 'https://registry.vlt.io/luke'],
  ])
})

t.test('invalid token sub command', async t => {
  await t.rejects(
    command({
      options: { registry: 'https://registry.vlt.javascript/' },
      positionals: ['wat'],
    } as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )
})
