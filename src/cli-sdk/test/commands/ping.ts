import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

let requestUrl: string | URL = ''
let requestOptions: { useCache: false } | undefined
let mockResponse: {
  statusCode: number
  json: () => object
} | null = null
let mockError: Error | null = null

const Command = await t.mockImport<
  typeof import('../../src/commands/ping.ts')
>('../../src/commands/ping.ts', {
  '@vltpkg/registry-client': {
    RegistryClient: class {
      async request(url: string | URL, options: { useCache: false }) {
        requestUrl = url
        requestOptions = options
        if (mockError) {
          throw mockError
        }
        return mockResponse
      }
    },
  },
})

t.matchSnapshot(Command.usage().usageMarkdown())

const config = {
  options: {
    registry: 'https://registry.npmjs.org/',
    registries: {
      npm: 'https://registry.npmjs.org/',
      custom: 'https://custom-registry.example.com/',
      acme: 'https://registry.acme.internal/',
    },
  },
  positionals: [],
} as unknown as LoadedConfig

const makeConfig = (positionals: string[]): LoadedConfig =>
  ({
    options: config.options,
    positionals,
  }) as unknown as LoadedConfig

t.test('ping all registries when no alias provided', async t => {
  mockResponse = {
    statusCode: 200,
    json: () => ({}),
  }
  mockError = null

  const result = await Command.command(makeConfig([]))
  t.ok(Array.isArray(result), 'result should be an array')
  if (!Array.isArray(result)) return

  t.equal(result.length, 3) // default + custom + acme (npm same as default, so skipped)

  // Check default registry
  const defaultResult = result.find(
    (r: { alias?: string }) => r.alias === 'default',
  )
  t.ok(defaultResult)
  t.equal(defaultResult?.registry, 'https://registry.npmjs.org/')
  t.equal(defaultResult?.status, 'ok')

  // npm has the same URL as default, so it is skipped
  // results include: default, custom, and acme
  const customResult = result.find(
    (r: { alias?: string }) => r.alias === 'custom',
  )
  t.ok(customResult)
  t.equal(
    customResult?.registry,
    'https://custom-registry.example.com/',
  )
  t.equal(customResult?.status, 'ok')

  const acmeResult = result.find(
    (r: { alias?: string }) => r.alias === 'acme',
  )
  t.ok(acmeResult)
  t.equal(acmeResult?.registry, 'https://registry.acme.internal/')
  t.equal(acmeResult?.status, 'ok')
})

t.test('ping specific registry with alias', async t => {
  mockResponse = {
    statusCode: 200,
    json: () => ({}),
  }
  mockError = null

  const result = await Command.command(makeConfig(['custom']))
  t.notOk(Array.isArray(result), 'result should not be an array')
  if (Array.isArray(result)) return

  t.equal(result.status, 'ok')
  t.equal(result.registry, 'https://custom-registry.example.com/')
  t.equal(result.alias, 'custom')
  t.ok(result.time >= 0)
  t.equal(result.statusCode, 200)
  t.equal(
    String(requestUrl),
    'https://custom-registry.example.com/-/ping?write=true',
  )
  t.strictSame(requestOptions, { useCache: false })
})

t.test('ping npm registry specifically', async t => {
  mockResponse = {
    statusCode: 200,
    json: () => ({}),
  }
  mockError = null

  const result = await Command.command(makeConfig(['npm']))
  t.notOk(Array.isArray(result), 'result should not be an array')
  if (Array.isArray(result)) return

  t.equal(result.status, 'ok')
  t.equal(result.registry, 'https://registry.npmjs.org/')
  t.equal(result.alias, 'npm')
  t.ok(result.time >= 0)
  t.equal(result.statusCode, 200)
})

t.test(
  'failed ping with non-200 status on specific registry',
  async t => {
    mockResponse = {
      statusCode: 404,
      json: () => ({}),
    }
    mockError = null

    const result = await Command.command(makeConfig(['custom']))
    t.notOk(Array.isArray(result), 'result should not be an array')
    if (Array.isArray(result)) return

    t.equal(result.status, 'error')
    t.equal(result.registry, 'https://custom-registry.example.com/')
    t.ok(result.time >= 0)
    t.equal(result.statusCode, 404)
    t.match(result.error, /status 404/)
  },
)

t.test('failed ping with exception on specific registry', async t => {
  mockError = new Error('Network connection failed')

  const result = await Command.command(makeConfig(['npm']))
  t.notOk(Array.isArray(result), 'result should not be an array')
  if (Array.isArray(result)) return

  t.equal(result.status, 'error')
  t.equal(result.registry, 'https://registry.npmjs.org/')
  t.ok(result.time >= 0)
  t.equal(result.error, 'Network connection failed')
})

t.test('ping all with mixed success and failure', async t => {
  // Override the request mock
  let requestCallCount = 0
  const Command2 = await t.mockImport<
    typeof import('../../src/commands/ping.ts')
  >('../../src/commands/ping.ts', {
    '@vltpkg/registry-client': {
      RegistryClient: class {
        async request() {
          requestCallCount++
          if (requestCallCount === 1) {
            return { statusCode: 200, json: () => ({}) }
          } else if (requestCallCount === 2) {
            throw new Error('Connection timeout')
          } else {
            return { statusCode: 404, json: () => ({}) }
          }
        }
      },
    },
  })

  const result = await Command2.command(makeConfig([]))
  t.ok(Array.isArray(result), 'result should be an array')
  if (!Array.isArray(result)) return

  t.equal(result.length, 3)

  // First should succeed
  t.equal(result[0]?.status, 'ok')
  t.equal(result[0]?.alias, 'default')

  // Second should fail with exception
  t.equal(result[1]?.status, 'error')
  t.match(result[1]?.error, /Connection timeout/)

  // Third should fail with 404
  t.equal(result[2]?.status, 'error')
  t.equal(result[2]?.statusCode, 404)
})

t.test('error on unknown registry alias', async t => {
  try {
    await Command.command(makeConfig(['unknown']))
    t.fail('should have thrown')
  } catch (err: unknown) {
    t.match((err as Error).message, /Unknown registry alias/)
    t.equal(
      (err as { cause: { found: string } }).cause.found,
      'unknown',
    )
    t.ok(
      Array.isArray(
        (err as { cause: { wanted: string[] } }).cause.wanted,
      ),
    )
    t.ok(
      (err as { cause: { wanted: string[] } }).cause.wanted.includes(
        'npm',
      ),
    )
    t.ok(
      (err as { cause: { wanted: string[] } }).cause.wanted.includes(
        'custom',
      ),
    )
  }
})

t.test(
  'error on unknown alias with no configured registries',
  async t => {
    try {
      await Command.command({
        options: {
          registry: 'https://registry.npmjs.org/',
          registries: {},
        },
        positionals: ['unknown'],
      } as unknown as LoadedConfig)
      t.fail('should have thrown')
    } catch (err: unknown) {
      t.match((err as Error).message, /Unknown registry alias/)
      t.equal(
        (err as { cause: { found: string } }).cause.found,
        'unknown',
      )
      t.equal(
        (err as { cause: { wanted: undefined } }).cause.wanted,
        undefined,
      )
    }
  },
)

t.test(
  'failed ping with non-Error thrown on specific registry',
  async t => {
    mockError = 'string error' as unknown as Error

    const result = await Command.command(makeConfig(['npm']))
    t.notOk(Array.isArray(result), 'result should not be an array')
    if (Array.isArray(result)) return

    t.equal(result.status, 'error')
    t.equal(result.registry, 'https://registry.npmjs.org/')
    t.equal(result.error, 'string error')
    mockError = null
  },
)

t.test('views', async t => {
  const successResult = {
    registry: 'https://registry.npmjs.org/',
    alias: 'npm',
    status: 'ok' as const,
    time: 100,
    statusCode: 200,
  }

  const errorResult = {
    registry: 'https://registry.npmjs.org/',
    alias: 'custom',
    status: 'error' as const,
    time: 500,
    error: 'Connection failed',
  }

  // Result without alias (covers the r.registry fallback branch)
  const noAliasResult = {
    registry: 'https://registry.npmjs.org/',
    status: 'ok' as const,
    time: 50,
    statusCode: 200,
  }

  const multipleResults = [successResult, errorResult]

  t.strictSame(Command.views.json(successResult), successResult)
  t.equal(
    Command.views.human(successResult),
    'Ping successful: npm (https://registry.npmjs.org/) (100ms)',
  )

  t.strictSame(Command.views.json(errorResult), errorResult)
  t.equal(
    Command.views.human(errorResult),
    'Ping failed: custom (https://registry.npmjs.org/) - Connection failed',
  )

  // Test formatting without alias
  t.equal(
    Command.views.human(noAliasResult),
    'Ping successful: https://registry.npmjs.org/ (50ms)',
  )

  t.strictSame(Command.views.json(multipleResults), multipleResults)
  t.equal(
    Command.views.human(multipleResults),
    'Ping successful: npm (https://registry.npmjs.org/) (100ms)\n' +
      'Ping failed: custom (https://registry.npmjs.org/) - Connection failed',
  )
})
