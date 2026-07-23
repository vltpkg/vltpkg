import type { Token } from '@vltpkg/registry-client'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { TokenInfo } from '../../src/commands/token.ts'

const mockRegistryClient = {
  normalizeRegistryKey(url: string) {
    const u = new URL(url)
    return (u.origin + u.pathname).replace(/\/+$/, '')
  },
  registryBase(url: string) {
    return url.endsWith('/') ? url : url + '/'
  },
  async setToken(_reg: string, _tok: Token) {},
  async deleteToken(_reg: string) {},
  async getToken(): Promise<Token | undefined> {
    return undefined
  },
  getKC() {
    return {
      async keys() {
        return []
      },
      async get() {
        return undefined
      },
    }
  },
  RegistryClient: class MockRegistryClient {
    async scroll<T>(): Promise<T[]> {
      return [] as T[]
    }
  },
}

const log: string[][] = []
const { usage, command, views } = await t.mockImport<
  typeof import('../../src/commands/token.ts')
>('../../src/commands/token.ts', {
  '@vltpkg/registry-client': {
    ...mockRegistryClient,
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
      ...mockRegistryClient,
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

t.test('alias: ls works like list', async t => {
  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async getToken(): Promise<Token | undefined> {
        return undefined
      },
      RegistryClient: class MockRegistryClient {
        async scroll<T>(): Promise<T[]> {
          return [] as T[]
        }
      },
    },
  })

  const result = await cmd({
    options: {
      registry: 'https://registry.npmjs.org/',
      registries: {},
      identity: '',
    },
    positionals: ['ls'],
  } as unknown as LoadedConfig)

  t.equal(result?.identity, '')
  t.equal(result?.registries.length, 1)
})

t.test('alias: remove works like rm', async t => {
  const removeLog: string[][] = []
  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async deleteToken(reg: string) {
        removeLog.push(['delete', reg])
      },
    },
  })

  await cmd({
    options: { registry: 'https://registry.vlt.javascript/' },
    positionals: ['remove'],
  } as LoadedConfig)

  t.strictSame(removeLog, [
    ['delete', 'https://registry.vlt.javascript'],
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

t.test('list tokens from default registry', async t => {
  const mockTokens: TokenInfo[] = [
    {
      key: 'abc123',
      token: 'npm_1234',
      created: '2025-06-15T10:30:00.000Z',
      readonly: false,
    },
    {
      key: 'def456',
      token: 'npm_5678',
      created: '2025-01-20T08:00:00.000Z',
      readonly: true,
      cidr_whitelist: ['192.168.1.0/24'],
    },
  ]

  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async getToken(): Promise<Token | undefined> {
        return 'Bearer npm_localtoken123'
      },
      RegistryClient: class MockRegistryClient {
        async scroll<T>(): Promise<T[]> {
          return mockTokens as T[]
        }
      },
    },
  })

  const result = await cmd({
    options: {
      registry: 'https://registry.npmjs.org/',
      registries: {},
      identity: '',
    },
    positionals: ['list'],
  } as unknown as LoadedConfig)

  t.equal(result?.identity, '')
  t.equal(result?.registries.length, 1)
  t.equal(
    result?.registries[0]?.registry,
    'https://registry.npmjs.org/',
  )
  t.equal(result?.registries[0]?.alias, 'default')
  t.equal(
    result?.registries[0]?.localToken,
    'Bearer npm_localtoken123',
  )
  t.equal(result?.registries[0]?.tokens.length, 2)
  t.equal(result?.registries[0]?.tokens[0]?.key, 'abc123')
  t.equal(result?.registries[0]?.tokens[0]?.token, 'npm_1234')
  t.equal(result?.registries[0]?.tokens[0]?.readonly, false)
  t.equal(result?.registries[0]?.tokens[1]?.key, 'def456')
  t.equal(result?.registries[0]?.tokens[1]?.readonly, true)
  t.strictSame(result?.registries[0]?.tokens[1]?.cidr_whitelist, [
    '192.168.1.0/24',
  ])
})

t.test('list skips remote query when no local token', async t => {
  const scrollCalled: string[] = []

  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async getToken(): Promise<Token | undefined> {
        return undefined
      },
      RegistryClient: class MockRegistryClient {
        async scroll<T>(url: URL): Promise<T[]> {
          scrollCalled.push(String(url))
          return [] as T[]
        }
      },
    },
  })

  const result = await cmd({
    options: {
      registry: 'https://registry.npmjs.org/',
      registries: {},
      identity: '',
    },
    positionals: ['list'],
  } as unknown as LoadedConfig)

  t.equal(result?.identity, '')
  t.equal(result?.registries.length, 1)
  t.equal(result?.registries[0]?.localToken, undefined)
  t.equal(result?.registries[0]?.tokens.length, 0)
  t.strictSame(scrollCalled, [], 'should not query registry API')
})

t.test('list tokens from multiple registries', async t => {
  const scrollResults: Record<string, TokenInfo[]> = {
    'https://registry.npmjs.org/-/npm/v1/tokens': [
      {
        key: 'npm-key-1',
        token: 'npm_aaaa',
        created: '2025-03-10T12:00:00.000Z',
        readonly: false,
      },
    ],
    'https://custom.registry.io/-/npm/v1/tokens': [
      {
        key: 'custom-key-1',
        token: 'npm_bbbb',
        created: '2025-04-20T15:00:00.000Z',
        readonly: true,
      },
    ],
  }

  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async getToken(): Promise<Token | undefined> {
        return 'Bearer npm_mock'
      },
      RegistryClient: class MockRegistryClient {
        async scroll<T>(url: URL): Promise<T[]> {
          return (scrollResults[String(url)] ?? []) as T[]
        }
      },
    },
  })

  const result = await cmd({
    options: {
      registry: 'https://registry.npmjs.org/',
      registries: {
        npm: 'https://registry.npmjs.org/',
        custom: 'https://custom.registry.io/',
      },
      identity: '',
    },
    positionals: ['list'],
  } as unknown as LoadedConfig)

  t.equal(result?.identity, '')
  // npm is same URL as default, so skipped → default + custom = 2
  t.equal(result?.registries.length, 2)

  t.equal(result?.registries[0]?.alias, 'default')
  t.equal(result?.registries[0]?.tokens.length, 1)
  t.equal(result?.registries[0]?.tokens[0]?.key, 'npm-key-1')

  t.equal(result?.registries[1]?.alias, 'custom')
  t.equal(
    result?.registries[1]?.registry,
    'https://custom.registry.io/',
  )
  t.equal(result?.registries[1]?.tokens.length, 1)
  t.equal(result?.registries[1]?.tokens[0]?.key, 'custom-key-1')
})

t.test('list includes keychain-only registries', async t => {
  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async getToken(key: string): Promise<Token | undefined> {
        if (key === 'https://registry.npmjs.org') return undefined
        if (key === 'https://extra.registry.io')
          return 'Bearer extra_tok'
        return undefined
      },
      getKC() {
        return {
          async keys() {
            return [
              'https://registry.npmjs.org',
              'https://extra.registry.io',
              'https://stale.registry.io',
            ]
          },
          async get(key: string) {
            if (key === 'https://extra.registry.io')
              return 'Bearer extra_tok'
            // stale entry where kc.get returns undefined
            return undefined
          },
        }
      },
      RegistryClient: class MockRegistryClient {
        async scroll<T>(): Promise<T[]> {
          return [] as T[]
        }
      },
    },
  })

  const result = await cmd({
    options: {
      registry: 'https://registry.npmjs.org/',
      registries: {},
      identity: '',
    },
    positionals: ['list'],
  } as unknown as LoadedConfig)

  t.equal(result?.identity, '')
  // default (npmjs, no local token) + extra + stale
  t.equal(result?.registries.length, 3)
  t.equal(
    result?.registries[0]?.registry,
    'https://registry.npmjs.org/',
  )
  t.equal(result?.registries[0]?.localToken, undefined)
  t.equal(
    result?.registries[1]?.registry,
    'https://extra.registry.io',
  )
  t.equal(result?.registries[1]?.localToken, 'Bearer extra_tok')
  t.equal(
    result?.registries[2]?.registry,
    'https://stale.registry.io',
  )
  t.equal(result?.registries[2]?.localToken, undefined)
})

t.test('list with named identity', async t => {
  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async getToken(): Promise<Token | undefined> {
        return 'Bearer corp_token123'
      },
      RegistryClient: class MockRegistryClient {
        async scroll<T>(): Promise<T[]> {
          return [] as T[]
        }
      },
    },
  })

  const result = await cmd({
    options: {
      registry: 'https://registry.npmjs.org/',
      registries: {},
      identity: 'corp',
    },
    positionals: ['list'],
  } as unknown as LoadedConfig)

  t.equal(result?.identity, 'corp')
  t.equal(result?.registries.length, 1)
  t.equal(result?.registries[0]?.localToken, 'Bearer corp_token123')
})

t.test('list handles registry errors gracefully', async t => {
  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async getToken(): Promise<Token | undefined> {
        return 'Bearer npm_mock'
      },
      RegistryClient: class MockRegistryClient {
        async scroll<T>(): Promise<T[]> {
          throw new Error('401 Unauthorized')
        }
      },
    },
  })

  const result = await cmd({
    options: {
      registry: 'https://registry.npmjs.org/',
      registries: {},
      identity: '',
    },
    positionals: ['list'],
  } as unknown as LoadedConfig)

  t.equal(result?.registries.length, 1)
  t.equal(result?.registries[0]?.tokens.length, 0)
  t.equal(result?.registries[0]?.error, '401 Unauthorized')
  t.equal(result?.registries[0]?.localToken, 'Bearer npm_mock')
})

t.test('list handles non-Error thrown gracefully', async t => {
  const { command: cmd } = await t.mockImport<
    typeof import('../../src/commands/token.ts')
  >('../../src/commands/token.ts', {
    '@vltpkg/registry-client': {
      ...mockRegistryClient,
      async getToken(): Promise<Token | undefined> {
        return 'Bearer npm_mock'
      },
      RegistryClient: class MockRegistryClient {
        async scroll<T>(): Promise<T[]> {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'string error'
        }
      },
    },
  })

  const result = await cmd({
    options: {
      registry: 'https://registry.npmjs.org/',
      registries: {},
      identity: '',
    },
    positionals: ['list'],
  } as unknown as LoadedConfig)

  t.equal(result?.registries[0]?.error, 'string error')
})

t.test('views', async t => {
  t.test(
    'human view formats token list with local token',
    async t => {
      const result = {
        identity: '',
        registries: [
          {
            registry: 'https://registry.npmjs.org/',
            alias: 'default',
            localToken: 'Bearer npm_abcdef1234' as Token,
            tokens: [
              {
                key: 'abc123',
                token: 'npm_1234',
                created: '2025-06-15T10:30:00.000Z',
                readonly: false,
              },
              {
                key: 'def456',
                token: 'npm_5678',
                created: '2025-01-20T08:00:00.000Z',
                readonly: true,
                cidr_whitelist: ['192.168.1.0/24', '10.0.0.0/8'],
              },
            ],
          },
          {
            registry: 'https://custom.registry.io/',
            alias: 'custom',
            tokens: [],
          },
        ],
      }
      const output = views.human(result)
      t.type(output, 'string')
      t.match(output, /identity: \(default\)/)
      t.match(output, /default/)
      t.match(output, /registry\.npmjs\.org/)
      t.match(output, /local: npm_abcd…/)
      t.match(output, /abc123/)
      t.match(output, /npm_1234/)
      t.match(output, /readonly: no/)
      t.match(output, /def456/)
      t.match(output, /readonly: yes/)
      t.match(output, /192\.168\.1\.0\/24/)
      t.match(output, /10\.0\.0\.0\/8/)
      t.match(output, /custom/)
      t.match(output, /skipped remote query/)
    },
  )

  t.test('human view with error', async t => {
    const result = {
      identity: '',
      registries: [
        {
          registry: 'https://registry.npmjs.org/',
          alias: 'default',
          localToken: 'Bearer npm_tok' as Token,
          tokens: [],
          error: '401 Unauthorized',
        },
      ],
    }
    const output = views.human(result)
    t.type(output, 'string')
    t.match(output, /error: 401 Unauthorized/)
  })

  t.test('human view with no alias', async t => {
    const result = {
      identity: '',
      registries: [
        {
          registry: 'https://registry.npmjs.org/',
          localToken: 'Bearer npm_abcdefghij' as Token,
          tokens: [
            {
              key: 'abc123',
              token: 'npm_1234',
              created: '2025-06-15T10:30:00.000Z',
              readonly: false,
            },
          ],
        },
      ],
    }
    const output = views.human(result)
    t.type(output, 'string')
    t.match(output, /https:\/\/registry\.npmjs\.org\//)
    t.notMatch(output, /\(https:/)
  })

  t.test(
    'human view with local token but no remote tokens',
    async t => {
      const result = {
        identity: '',
        registries: [
          {
            registry: 'https://registry.npmjs.org/',
            alias: 'default',
            localToken: 'Bearer npm_abcdef1234' as Token,
            tokens: [],
          },
        ],
      }
      const output = views.human(result)
      t.type(output, 'string')
      t.match(output, /local: npm_abcd…/)
      t.match(output, /no remote tokens found/)
    },
  )

  t.test('human view with no local token', async t => {
    const result = {
      identity: '',
      registries: [
        {
          registry: 'https://registry.npmjs.org/',
          alias: 'default',
          tokens: [],
        },
      ],
    }
    const output = views.human(result)
    t.type(output, 'string')
    t.match(output, /local: \(none\)/)
    t.match(output, /skipped remote query/)
  })

  t.test('human view masks short tokens', async t => {
    const result = {
      identity: '',
      registries: [
        {
          registry: 'https://registry.npmjs.org/',
          localToken: 'Bearer ab' as Token,
          tokens: [],
        },
      ],
    }
    const output = views.human(result)
    t.type(output, 'string')
    t.match(output, /local: ab…/)
  })

  t.test('human view shows named identity', async t => {
    const result = {
      identity: 'corp',
      registries: [
        {
          registry: 'https://registry.npmjs.org/',
          tokens: [],
        },
      ],
    }
    const output = views.human(result)
    t.type(output, 'string')
    t.match(output, /identity: corp/)
    t.notMatch(output, /\(default\)/)
  })

  t.test('human view returns undefined for void', async t => {
    const output = views.human(undefined)
    t.equal(output, undefined)
  })

  t.test('json view returns data', async t => {
    const result = {
      identity: '',
      registries: [
        {
          registry: 'https://registry.npmjs.org/',
          alias: 'default',
          tokens: [],
        },
      ],
    }
    t.strictSame(views.json(result), result)
  })

  t.test('json view returns undefined for void', async t => {
    const output = views.json(undefined)
    t.equal(output, undefined)
  })
})
