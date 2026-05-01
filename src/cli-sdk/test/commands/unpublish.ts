import t from 'tap'
import {
  command,
  views,
  usage,
} from '../../src/commands/unpublish.ts'
import type { CommandResult } from '../../src/commands/unpublish.ts'
import { RegistryClient } from '@vltpkg/registry-client'
import type { LoadedConfig } from '../../src/config/index.ts'

interface MockResponse {
  statusCode?: number
  text?: string
  json?: Record<string, unknown>
}

interface MockCacheEntry {
  statusCode: number
  text: () => string
  json: () => Record<string, unknown>
  getHeader: (name: string) => Buffer | string | undefined
}

interface TestConfig {
  projectRoot?: string
  options: {
    registry: string
    otp?: string
    force?: boolean
  }
  positionals: string[]
  values?: Record<string, unknown>
  get?: (key: string) => unknown
}

const makeTestConfig = (config: TestConfig): LoadedConfig =>
  ({
    ...config,
    get: (key: string) => config.values?.[key],
  }) as LoadedConfig

const mockResponses = new Map<string, MockResponse>()
const mockRequests: {
  url: string
  method?: string
  body?: string
  headers?: Record<string, string>
  otp?: string
}[] = []
const originalRequest = RegistryClient.prototype.request

t.beforeEach(() => {
  mockResponses.clear()
  mockRequests.length = 0
  RegistryClient.prototype.request = async function (
    url: URL | string,
    opts?: Record<string, unknown>,
  ) {
    const urlStr = url.toString()
    mockRequests.push({
      url: urlStr,
      method: opts?.method as string | undefined,
      body: opts?.body as string | undefined,
      headers: opts?.headers as Record<string, string> | undefined,
      otp: opts?.otp as string | undefined,
    })
    const mockResponse = mockResponses.get(urlStr)

    if (mockResponse) {
      return {
        statusCode: mockResponse.statusCode ?? 200,
        text: () => mockResponse.text ?? '',
        json: () => mockResponse.json ?? {},
        getHeader: () => undefined,
      } as MockCacheEntry
    }

    return {
      statusCode: 200,
      text: () => '{"ok":true}',
      json: () => ({ ok: true }),
      getHeader: () => undefined,
    } as MockCacheEntry
  } as typeof originalRequest
})

t.afterEach(() => {
  RegistryClient.prototype.request = originalRequest
})

t.test('usage', async t => {
  t.matchSnapshot(usage().usage())
})

t.test('command', async t => {
  t.test('requires a package spec argument', async t => {
    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: [],
    })

    await t.rejects(command(config), {
      message:
        'unpublish requires a package spec argument (e.g. pkg@version)',
    })
  })

  t.test('unpublishes a specific version', async t => {
    // Mock GET packument
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '1-abc123',
        name: 'my-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': { name: 'my-package', version: '1.0.0' },
          '2.0.0': { name: 'my-package', version: '2.0.0' },
        },
        time: {
          '1.0.0': '2024-01-01T00:00:00.000Z',
          '2.0.0': '2024-02-01T00:00:00.000Z',
        },
      },
    })

    // Mock PUT updated packument
    mockResponses.set(
      'https://registry.npmjs.org/my-package/-rev/1-abc123',
      {
        statusCode: 200,
        json: { ok: true },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['my-package@1.0.0'],
    })

    const result = await command(config)
    t.equal(result.name, 'my-package')
    t.equal(result.version, '1.0.0')
    t.equal(result.registry, 'https://registry.npmjs.org')

    // Verify the PUT request was made with the version removed
    const putRequest = mockRequests.find(r => r.method === 'PUT')
    t.ok(putRequest, 'should have made a PUT request')
    const body = JSON.parse(putRequest!.body!)
    t.notOk(body.versions['1.0.0'], 'version 1.0.0 should be removed')
    t.ok(body.versions['2.0.0'], 'version 2.0.0 should remain')
  })

  t.test(
    'removes dist-tags pointing to unpublished version',
    async t => {
      mockResponses.set('https://registry.npmjs.org/my-package', {
        statusCode: 200,
        json: {
          _id: 'my-package',
          _rev: '2-def456',
          name: 'my-package',
          'dist-tags': { latest: '1.0.0', beta: '2.0.0' },
          versions: {
            '1.0.0': { name: 'my-package', version: '1.0.0' },
            '2.0.0': { name: 'my-package', version: '2.0.0' },
          },
        },
      })

      mockResponses.set(
        'https://registry.npmjs.org/my-package/-rev/2-def456',
        {
          statusCode: 200,
          json: { ok: true },
        },
      )

      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
        },
        positionals: ['my-package@1.0.0'],
      })

      const result = await command(config)
      t.equal(result.name, 'my-package')
      t.equal(result.version, '1.0.0')

      const putRequest = mockRequests.find(r => r.method === 'PUT')
      const body = JSON.parse(putRequest!.body!)
      t.notOk(
        body['dist-tags'].latest,
        'latest dist-tag should be removed (pointed to 1.0.0)',
      )
      t.equal(
        body['dist-tags'].beta,
        '2.0.0',
        'beta dist-tag should remain',
      )
    },
  )

  t.test('removes time entry for unpublished version', async t => {
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '3-ghi789',
        name: 'my-package',
        'dist-tags': { latest: '2.0.0' },
        versions: {
          '1.0.0': { name: 'my-package', version: '1.0.0' },
          '2.0.0': { name: 'my-package', version: '2.0.0' },
        },
        time: {
          '1.0.0': '2024-01-01T00:00:00.000Z',
          '2.0.0': '2024-02-01T00:00:00.000Z',
        },
      },
    })

    mockResponses.set(
      'https://registry.npmjs.org/my-package/-rev/3-ghi789',
      {
        statusCode: 200,
        json: { ok: true },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['my-package@1.0.0'],
    })

    await command(config)

    const putRequest = mockRequests.find(r => r.method === 'PUT')
    const body = JSON.parse(putRequest!.body!)
    t.notOk(
      body.time['1.0.0'],
      'time entry for 1.0.0 should be removed',
    )
    t.ok(body.time['2.0.0'], 'time entry for 2.0.0 should remain')
  })

  t.test('handles packument without time field', async t => {
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '1-abc123',
        name: 'my-package',
        'dist-tags': { latest: '2.0.0' },
        versions: {
          '1.0.0': { name: 'my-package', version: '1.0.0' },
          '2.0.0': { name: 'my-package', version: '2.0.0' },
        },
      },
    })

    mockResponses.set(
      'https://registry.npmjs.org/my-package/-rev/1-abc123',
      {
        statusCode: 200,
        json: { ok: true },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['my-package@1.0.0'],
    })

    const result = await command(config)
    t.equal(result.name, 'my-package')
    t.equal(result.version, '1.0.0')
  })

  t.test('handles packument without dist-tags', async t => {
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '1-abc123',
        name: 'my-package',
        versions: {
          '1.0.0': { name: 'my-package', version: '1.0.0' },
          '2.0.0': { name: 'my-package', version: '2.0.0' },
        },
      },
    })

    mockResponses.set(
      'https://registry.npmjs.org/my-package/-rev/1-abc123',
      {
        statusCode: 200,
        json: { ok: true },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['my-package@1.0.0'],
    })

    const result = await command(config)
    t.equal(result.name, 'my-package')
    t.equal(result.version, '1.0.0')
  })

  t.test('throws when version not found in packument', async t => {
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '1-abc',
        name: 'my-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': { name: 'my-package', version: '1.0.0' },
        },
      },
    })

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['my-package@9.9.9'],
    })

    await t.rejects(command(config), {
      message: 'Version 9.9.9 not found in package my-package',
    })
  })

  t.test(
    'refuses to unpublish entire package without --force',
    async t => {
      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
        },
        positionals: ['my-package'],
      })

      await t.rejects(command(config), {
        message:
          /Refusing to unpublish entire package without --force/,
      })
    },
  )

  t.test('unpublishes entire package with --force', async t => {
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '4-jkl012',
        name: 'my-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': { name: 'my-package', version: '1.0.0' },
        },
      },
    })

    mockResponses.set(
      'https://registry.npmjs.org/my-package/-rev/4-jkl012',
      {
        statusCode: 200,
        json: { ok: true },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
        force: true,
      },
      positionals: ['my-package'],
    })

    const result = await command(config)
    t.equal(result.name, 'my-package')
    t.equal(result.version, undefined)
    t.equal(result.registry, 'https://registry.npmjs.org')

    const deleteRequest = mockRequests.find(
      r => r.method === 'DELETE',
    )
    t.ok(deleteRequest, 'should have made a DELETE request')
    t.match(
      deleteRequest!.url,
      /my-package\/-rev\/4-jkl012/,
      'DELETE URL should include _rev',
    )
  })

  t.test('supports scoped packages', async t => {
    mockResponses.set(
      'https://registry.npmjs.org/@scope%2Fmy-package',
      {
        statusCode: 200,
        json: {
          _id: '@scope/my-package',
          _rev: '5-mno345',
          name: '@scope/my-package',
          'dist-tags': { latest: '1.0.0' },
          versions: {
            '1.0.0': {
              name: '@scope/my-package',
              version: '1.0.0',
            },
            '2.0.0': {
              name: '@scope/my-package',
              version: '2.0.0',
            },
          },
        },
      },
    )

    mockResponses.set(
      'https://registry.npmjs.org/@scope%2Fmy-package/-rev/5-mno345',
      {
        statusCode: 200,
        json: { ok: true },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['@scope/my-package@1.0.0'],
    })

    const result = await command(config)
    t.equal(result.name, '@scope/my-package')
    t.equal(result.version, '1.0.0')
  })

  t.test('supports scoped packages with --force', async t => {
    mockResponses.set(
      'https://registry.npmjs.org/@scope%2Fmy-package',
      {
        statusCode: 200,
        json: {
          _id: '@scope/my-package',
          _rev: '6-pqr678',
          name: '@scope/my-package',
          'dist-tags': { latest: '1.0.0' },
          versions: {
            '1.0.0': {
              name: '@scope/my-package',
              version: '1.0.0',
            },
          },
        },
      },
    )

    mockResponses.set(
      'https://registry.npmjs.org/@scope%2Fmy-package/-rev/6-pqr678',
      {
        statusCode: 200,
        json: { ok: true },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
        force: true,
      },
      positionals: ['@scope/my-package'],
    })

    const result = await command(config)
    t.equal(result.name, '@scope/my-package')
    t.equal(result.version, undefined)

    const deleteRequest = mockRequests.find(
      r => r.method === 'DELETE',
    )
    t.ok(deleteRequest, 'should have made a DELETE request')
    t.match(
      deleteRequest!.url,
      /@scope%2Fmy-package\/-rev\/6-pqr678/,
      'DELETE URL should include encoded scope and _rev',
    )
  })

  t.test('passes OTP to registry requests', async t => {
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '7-stu901',
        name: 'my-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': { name: 'my-package', version: '1.0.0' },
          '2.0.0': { name: 'my-package', version: '2.0.0' },
        },
      },
    })

    mockResponses.set(
      'https://registry.npmjs.org/my-package/-rev/7-stu901',
      {
        statusCode: 200,
        json: { ok: true },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
        otp: '123456',
      },
      positionals: ['my-package@1.0.0'],
    })

    const result = await command(config)
    t.equal(result.name, 'my-package')

    const putRequest = mockRequests.find(r => r.method === 'PUT')
    t.ok(putRequest, 'should have made a PUT request')
    t.equal(putRequest!.otp, '123456', 'OTP should be passed')
  })

  t.test(
    'handles fetch packument error (specific version)',
    async t => {
      const tempRequest = RegistryClient.prototype.request
      t.teardown(() => {
        RegistryClient.prototype.request = tempRequest
      })
      RegistryClient.prototype.request = async () => {
        throw new Error('Network error')
      }

      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
        },
        positionals: ['my-package@1.0.0'],
      })

      await t.rejects(command(config), {
        message: 'Failed to fetch package metadata',
      })
    },
  )

  t.test(
    'handles fetch packument error (entire package)',
    async t => {
      const tempRequest = RegistryClient.prototype.request
      t.teardown(() => {
        RegistryClient.prototype.request = tempRequest
      })
      RegistryClient.prototype.request = async () => {
        throw new Error('Network error')
      }

      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
          force: true,
        },
        positionals: ['my-package'],
      })

      await t.rejects(command(config), {
        message: 'Failed to fetch package metadata',
      })
    },
  )

  t.test(
    'handles 404 when fetching packument (specific version)',
    async t => {
      mockResponses.set(
        'https://registry.npmjs.org/nonexistent-package',
        {
          statusCode: 404,
          json: { error: 'not found' },
        },
      )

      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
        },
        positionals: ['nonexistent-package@1.0.0'],
      })

      await t.rejects(command(config), {
        message: 'Package not found on the registry',
      })
    },
  )

  t.test(
    'handles 404 when fetching packument (entire package)',
    async t => {
      mockResponses.set(
        'https://registry.npmjs.org/nonexistent-package',
        {
          statusCode: 404,
          json: { error: 'not found' },
        },
      )

      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
          force: true,
        },
        positionals: ['nonexistent-package'],
      })

      await t.rejects(command(config), {
        message: 'Package not found on the registry',
      })
    },
  )

  t.test('handles PUT failure when unpublishing version', async t => {
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '8-vwx234',
        name: 'my-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': { name: 'my-package', version: '1.0.0' },
        },
      },
    })

    mockResponses.set(
      'https://registry.npmjs.org/my-package/-rev/8-vwx234',
      {
        statusCode: 403,
        json: { error: 'forbidden' },
      },
    )

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['my-package@1.0.0'],
    })

    await t.rejects(command(config), {
      message: 'Failed to unpublish package version',
    })
  })

  t.test(
    'handles DELETE failure when unpublishing entire package',
    async t => {
      mockResponses.set('https://registry.npmjs.org/my-package', {
        statusCode: 200,
        json: {
          _id: 'my-package',
          _rev: '9-yza567',
          name: 'my-package',
          'dist-tags': { latest: '1.0.0' },
          versions: {
            '1.0.0': { name: 'my-package', version: '1.0.0' },
          },
        },
      })

      mockResponses.set(
        'https://registry.npmjs.org/my-package/-rev/9-yza567',
        {
          statusCode: 403,
          json: { error: 'forbidden' },
        },
      )

      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
          force: true,
        },
        positionals: ['my-package'],
      })

      await t.rejects(command(config), {
        message: 'Failed to unpublish package',
      })
    },
  )

  t.test(
    'handles PUT request error when unpublishing version',
    async t => {
      let callCount = 0
      const tempRequest = RegistryClient.prototype.request
      t.teardown(() => {
        RegistryClient.prototype.request = tempRequest
      })
      RegistryClient.prototype.request = async function (
        _url: URL | string,
      ) {
        callCount++
        // First call is GET packument (success), second call is PUT (fail)
        if (callCount === 1) {
          return {
            statusCode: 200,
            text: () => '',
            json: () => ({
              _id: 'my-package',
              _rev: '1-abc',
              name: 'my-package',
              'dist-tags': { latest: '2.0.0' },
              versions: {
                '1.0.0': {
                  name: 'my-package',
                  version: '1.0.0',
                },
                '2.0.0': {
                  name: 'my-package',
                  version: '2.0.0',
                },
              },
            }),
            getHeader: () => undefined,
          } as MockCacheEntry
        }
        throw new Error('PUT failed')
      } as typeof originalRequest

      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
        },
        positionals: ['my-package@1.0.0'],
      })

      await t.rejects(command(config), {
        message: 'Failed to unpublish package version',
      })
    },
  )

  t.test(
    'handles DELETE request error when unpublishing entire package',
    async t => {
      let callCount = 0
      const tempRequest = RegistryClient.prototype.request
      t.teardown(() => {
        RegistryClient.prototype.request = tempRequest
      })
      RegistryClient.prototype.request = async function (
        _url: URL | string,
      ) {
        callCount++
        if (callCount === 1) {
          return {
            statusCode: 200,
            text: () => '',
            json: () => ({
              _id: 'my-package',
              _rev: '1-abc',
              name: 'my-package',
              'dist-tags': { latest: '1.0.0' },
              versions: {
                '1.0.0': {
                  name: 'my-package',
                  version: '1.0.0',
                },
              },
            }),
            getHeader: () => undefined,
          } as MockCacheEntry
        }
        throw new Error('DELETE failed')
      } as typeof originalRequest

      const config = makeTestConfig({
        options: {
          registry: 'https://registry.npmjs.org',
          force: true,
        },
        positionals: ['my-package'],
      })

      await t.rejects(command(config), {
        message: 'Failed to unpublish package',
      })
    },
  )

  t.test('handles packument without versions field', async t => {
    mockResponses.set('https://registry.npmjs.org/my-package', {
      statusCode: 200,
      json: {
        _id: 'my-package',
        _rev: '1-abc',
        name: 'my-package',
        'dist-tags': { latest: '1.0.0' },
      },
    })

    const config = makeTestConfig({
      options: {
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['my-package@1.0.0'],
    })

    await t.rejects(command(config), {
      message: 'Version 1.0.0 not found in package my-package',
    })
  })
})

t.test('views', async t => {
  t.test('human view - specific version', async t => {
    const result: CommandResult = {
      name: 'my-package',
      version: '1.0.0',
      registry: 'https://registry.npmjs.org',
    }
    const output = views.human(result)
    t.match(output, /my-package@1\.0\.0/)
    t.match(output, /unpublished/)
    t.match(output, /registry\.npmjs\.org/)
  })

  t.test('human view - entire package', async t => {
    const result: CommandResult = {
      name: 'my-package',
      registry: 'https://registry.npmjs.org',
    }
    const output = views.human(result)
    t.match(output, /my-package/)
    t.match(output, /all versions/)
    t.match(output, /unpublished/)
    t.match(output, /registry\.npmjs\.org/)
  })

  t.test('json view', async t => {
    const result: CommandResult = {
      name: 'my-package',
      version: '1.0.0',
      registry: 'https://registry.npmjs.org',
    }
    const output = views.json(result)
    t.same(output, result)
  })
})
