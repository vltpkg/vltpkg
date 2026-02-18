import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'

const requests: {
  url: string
  method?: string
  body?: string
}[] = []

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/dist-tag.ts')
>('../../src/commands/dist-tag.ts', {
  '@vltpkg/registry-client': {
    RegistryClient: class MockRegistryClient {
      async request(
        url: URL | string,
        options: {
          method?: string
          body?: string
          useCache?: boolean
          headers?: Record<string, string>
        } = {},
      ) {
        const urlStr = url.toString()
        requests.push({
          url: urlStr,
          method: options.method,
          body: options.body,
        })

        // Mock responses based on the request
        if (options.method === 'DELETE') {
          return {
            statusCode: 200,
            json: () => ({}),
          }
        }

        if (options.method === 'PUT') {
          return {
            statusCode: 200,
            json: () => ({}),
          }
        }

        // GET request - return mock dist-tags
        return {
          statusCode: 200,
          json: () => ({
            latest: '1.0.0',
            beta: '1.1.0-beta.1',
          }),
        }
      }
    },
  },
})

t.matchSnapshot(usage().usageMarkdown())

t.test('list dist-tags', async t => {
  requests.length = 0
  const result = await command({
    options: { registry: 'https://registry.vlt.sh/' },
    positionals: ['ls', 'test-package'],
  } as LoadedConfig)

  t.equal(result.action, 'ls')
  t.equal(result.package, 'test-package')
  t.same(result.tags, {
    latest: '1.0.0',
    beta: '1.1.0-beta.1',
  })
  t.match(requests[0], {
    url: 'https://registry.vlt.sh/-/package/test-package/dist-tags',
    method: undefined,
  })
})

t.test('list dist-tags for scoped package', async t => {
  requests.length = 0
  const result = await command({
    options: { registry: 'https://registry.vlt.sh/' },
    positionals: ['ls', '@scope/package'],
  } as LoadedConfig)

  t.equal(result.action, 'ls')
  t.equal(result.package, '@scope/package')
  t.match(requests[0], {
    url: 'https://registry.vlt.sh/-/package/%40scope%2Fpackage/dist-tags',
  })
})

t.test('add dist-tag', async t => {
  requests.length = 0
  const result = await command({
    options: { registry: 'https://registry.vlt.sh/' },
    positionals: ['add', 'test-package@1.2.0', 'next'],
  } as LoadedConfig)

  t.equal(result.action, 'add')
  t.equal(result.package, 'test-package')
  t.equal(result.tag, 'next')
  t.equal(result.version, '1.2.0')
  t.match(requests[0], {
    url: 'https://registry.vlt.sh/-/package/test-package/dist-tags/next',
    method: 'PUT',
    body: '"1.2.0"',
  })
})

t.test('add dist-tag for scoped package', async t => {
  requests.length = 0
  const result = await command({
    options: { registry: 'https://registry.vlt.sh/' },
    positionals: ['add', '@scope/package@2.0.0-rc.1', 'rc'],
  } as LoadedConfig)

  t.equal(result.action, 'add')
  t.equal(result.package, '@scope/package')
  t.equal(result.tag, 'rc')
  t.equal(result.version, '2.0.0-rc.1')
  t.match(requests[0], {
    url: 'https://registry.vlt.sh/-/package/%40scope%2Fpackage/dist-tags/rc',
    method: 'PUT',
    body: '"2.0.0-rc.1"',
  })
})

t.test('remove dist-tag', async t => {
  requests.length = 0
  const result = await command({
    options: { registry: 'https://registry.vlt.sh/' },
    positionals: ['rm', 'test-package', 'beta'],
  } as LoadedConfig)

  t.equal(result.action, 'rm')
  t.equal(result.package, 'test-package')
  t.equal(result.tag, 'beta')
  t.match(requests[0], {
    url: 'https://registry.vlt.sh/-/package/test-package/dist-tags/beta',
    method: 'DELETE',
  })
})

t.test('remove dist-tag from scoped package', async t => {
  requests.length = 0
  const result = await command({
    options: { registry: 'https://registry.vlt.sh/' },
    positionals: ['rm', '@scope/package', 'deprecated'],
  } as LoadedConfig)

  t.equal(result.action, 'rm')
  t.equal(result.package, '@scope/package')
  t.equal(result.tag, 'deprecated')
  t.match(requests[0], {
    url: 'https://registry.vlt.sh/-/package/%40scope%2Fpackage/dist-tags/deprecated',
    method: 'DELETE',
  })
})

t.test('error on invalid subcommand', async t => {
  await t.rejects(
    command({
      options: { registry: 'https://registry.vlt.sh/' },
      positionals: ['invalid'],
    } as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test('error on missing package for ls', async t => {
  await t.rejects(
    command({
      options: { registry: 'https://registry.vlt.sh/' },
      positionals: ['ls'],
    } as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test('error on invalid add syntax - missing tag', async t => {
  await t.rejects(
    command({
      options: { registry: 'https://registry.vlt.sh/' },
      positionals: ['add', 'package@1.0.0'],
    } as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test('error on invalid add syntax - no @', async t => {
  await t.rejects(
    command({
      options: { registry: 'https://registry.vlt.sh/' },
      positionals: ['add', 'package', 'tag'],
    } as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test('error on missing package for rm', async t => {
  await t.rejects(
    command({
      options: { registry: 'https://registry.vlt.sh/' },
      positionals: ['rm'],
    } as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )
})

t.test('error on missing tag for rm', async t => {
  await t.rejects(
    command({
      options: { registry: 'https://registry.vlt.sh/' },
      positionals: ['rm', 'package'],
    } as LoadedConfig),
    { cause: { code: 'EUSAGE' } },
  )
})
