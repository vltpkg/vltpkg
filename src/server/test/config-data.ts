import t from 'tap'
import type { LoadedConfig } from '@vltpkg/cli-sdk/config'

// Mock implementations
const mockGetCalls: LoadedConfig[] = []
const mockSetCalls: LoadedConfig[] = []
const mockDelCalls: LoadedConfig[] = []
const mockListCalls: LoadedConfig[] = []

let mockGetReturn: unknown = 'default-value'
let mockListReturn: unknown = {
  registry: 'https://registry.npmjs.org/',
}
let shouldThrowError = false
let errorMessage = 'Mock error'

const { ConfigManager } = await t.mockImport<
  typeof import('../src/config-data.ts')
>('../src/config-data.ts', {
  '@vltpkg/config': {
    get: async (conf: LoadedConfig) => {
      mockGetCalls.push(conf)
      if (shouldThrowError) throw new Error(errorMessage)
      return mockGetReturn
    },
    set: async (conf: LoadedConfig) => {
      mockSetCalls.push(conf)
      if (shouldThrowError) throw new Error(errorMessage)
    },
    del: async (conf: LoadedConfig) => {
      mockDelCalls.push(conf)
      if (shouldThrowError) throw new Error(errorMessage)
    },
    list: (conf: LoadedConfig) => {
      mockListCalls.push(conf)
      return mockListReturn
    },
  },
})

// Mock LoadedConfig
const createMockConfig = (positionals: string[] = []): LoadedConfig =>
  ({
    positionals: [...positionals], // Clone array to avoid mutation issues
  }) as LoadedConfig

t.beforeEach(() => {
  // Reset all mock state before each test
  mockGetCalls.length = 0
  mockSetCalls.length = 0
  mockDelCalls.length = 0
  mockListCalls.length = 0

  mockGetReturn = 'default-value'
  mockListReturn = { registry: 'https://registry.npmjs.org/' }
  shouldThrowError = false
  errorMessage = 'Mock error'
})

t.test('ConfigManager constructor', t => {
  const config = createMockConfig()
  const manager = new ConfigManager({ config })

  t.equal(manager.config, config, 'stores config reference')
  t.end()
})

t.test('list method', t => {
  const config = createMockConfig()
  const manager = new ConfigManager({ config })
  const expectedResult = { registry: 'https://registry.npmjs.org/' }

  mockListReturn = expectedResult

  const result = manager.list()

  t.equal(result, expectedResult, 'returns list result')
  t.equal(mockListCalls.length, 1, 'calls list once')
  t.equal(mockListCalls[0], config, 'passes config to list')
  t.end()
})

t.test('get method without key', async t => {
  const config = createMockConfig()
  const manager = new ConfigManager({ config })
  const expectedResult = { registry: 'https://registry.npmjs.org/' }

  mockListReturn = expectedResult

  const result = await manager.get()

  t.equal(
    result,
    expectedResult,
    'returns list result when no key provided',
  )
  t.equal(mockListCalls.length, 1, 'calls list once')
  t.equal(mockGetCalls.length, 0, 'does not call get')
  t.end()
})

t.test('get method with key', async t => {
  const config = createMockConfig(['config'])
  const manager = new ConfigManager({ config })
  const expectedResult = 'https://registry.npmjs.org/'

  mockGetReturn = expectedResult

  const result = await manager.get('registry')

  t.equal(result, expectedResult, 'returns get result')
  t.equal(mockGetCalls.length, 1, 'calls get once')
  t.equal(mockListCalls.length, 0, 'does not call list')

  // Check that positionals were temporarily modified
  t.equal(
    config.positionals.length,
    1,
    'positionals restored to original',
  )
  t.equal(
    config.positionals[0],
    'config',
    'original positionals restored',
  )
  t.end()
})

t.test(
  'get method preserves original positionals on error',
  async t => {
    const config = createMockConfig(['original', 'values'])
    const manager = new ConfigManager({ config })

    shouldThrowError = true
    errorMessage = 'Config error'

    await t.rejects(manager.get('registry'), {
      message: 'Config error',
    })

    // Check that original positionals were restored
    t.strictSame(
      config.positionals,
      ['original', 'values'],
      'original positionals restored after error',
    )
    t.end()
  },
)

t.test('set method', async t => {
  const config = createMockConfig(['config'])
  const manager = new ConfigManager({ config })

  await manager.set('registry', 'https://custom.registry.com/')

  t.equal(mockSetCalls.length, 1, 'calls set once')

  // Check that positionals were temporarily modified correctly
  t.equal(
    config.positionals.length,
    1,
    'positionals restored to original',
  )
  t.equal(
    config.positionals[0],
    'config',
    'original positionals restored',
  )
  t.end()
})

t.test(
  'set method preserves original positionals on error',
  async t => {
    const config = createMockConfig(['original', 'values'])
    const manager = new ConfigManager({ config })

    shouldThrowError = true
    errorMessage = 'Set error'

    await t.rejects(
      manager.set('registry', 'https://custom.registry.com/'),
      { message: 'Set error' },
    )

    // Check that original positionals were restored
    t.strictSame(
      config.positionals,
      ['original', 'values'],
      'original positionals restored after error',
    )
    t.end()
  },
)

t.test('update method', async t => {
  const config = createMockConfig(['config'])
  const manager = new ConfigManager({ config })

  await manager.update('registry', 'https://updated.registry.com/')

  t.equal(mockSetCalls.length, 1, 'calls set once for update')

  // Check that positionals were restored
  t.equal(
    config.positionals.length,
    1,
    'positionals restored to original',
  )
  t.equal(
    config.positionals[0],
    'config',
    'original positionals restored',
  )
  t.end()
})

t.test('delete method', async t => {
  const config = createMockConfig(['config'])
  const manager = new ConfigManager({ config })

  await manager.delete('registry')

  t.equal(mockDelCalls.length, 1, 'calls del once')

  // Check that positionals were restored
  t.equal(
    config.positionals.length,
    1,
    'positionals restored to original',
  )
  t.equal(
    config.positionals[0],
    'config',
    'original positionals restored',
  )
  t.end()
})

t.test(
  'delete method preserves original positionals on error',
  async t => {
    const config = createMockConfig(['original', 'values'])
    const manager = new ConfigManager({ config })

    shouldThrowError = true
    errorMessage = 'Delete error'

    await t.rejects(manager.delete('registry'), {
      message: 'Delete error',
    })

    // Check that original positionals were restored
    t.strictSame(
      config.positionals,
      ['original', 'values'],
      'original positionals restored after error',
    )
    t.end()
  },
)
