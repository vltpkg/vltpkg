import t from 'tap'
import { resolve } from 'node:path'
import { command, views, usage } from '../../src/commands/publish.ts'
import type { CommandResultSingle } from '../../src/commands/publish.ts'
import { PackageJson } from '@vltpkg/package-json'
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
    packageJson: PackageJson
    monorepo?:
      | {
          name: string
          fullpath: string
        }[]
      | null
    registry: string
    tag?: string
    access?: string
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
const originalRequest = RegistryClient.prototype.request

t.beforeEach(() => {
  mockResponses.clear()
  RegistryClient.prototype.request = async function (
    url: URL | string,
  ) {
    const urlStr = url.toString()
    const mockResponse = mockResponses.get(urlStr)

    if (mockResponse) {
      return {
        statusCode: mockResponse.statusCode ?? 201,
        text: () => mockResponse.text ?? '',
        json: () => mockResponse.json ?? {},
        getHeader: () => undefined,
      } as MockCacheEntry
    }

    return {
      statusCode: 201,
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
  t.test('publishes package successfully', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for publish command',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
    })

    const result = (await command(config)) as CommandResultSingle

    t.equal(result.name, '@test/package')
    t.equal(result.version, '1.2.3')
    t.equal(result.tag, 'latest')
    t.equal(result.registry, 'https://registry.npmjs.org')
    t.ok(result.size > 0, 'should have a size')
    t.ok(result.unpackedSize > 0, 'should have unpacked size')
    t.ok(Array.isArray(result.files), 'should have files array')
    t.ok(result.files.length > 0, 'should have some files')
    t.ok(result.shasum, 'should have computed shasum')
    t.ok(result.integrity, 'should have computed integrity')
    t.match(
      result.shasum,
      /^[a-f0-9]{40}$/,
      'shasum should be valid SHA1',
    )
    t.match(
      result.integrity,
      /^sha512-/,
      'integrity should be sha512',
    )
  })

  t.test('throws error if package has no name', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        version: '1.0.0',
      }),
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
    })

    await t.rejects(
      command(config),
      /Package must have a name and version/,
    )
  })

  t.test('throws error if package has no version', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'bad-package',
      }),
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
    })

    await t.rejects(
      command(config),
      /Package must have a name and version/,
    )
  })

  t.test('throws error if package is private', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'private-package',
        version: '1.0.0',
        private: true,
      }),
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
    })

    await t.rejects(
      command(config),
      /Package has been marked as private/,
    )
  })

  t.test('handles registry errors', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for publish command',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
      'vlt.json': '{}',
    })

    t.chdir(dir)

    // Mock a failure response - need to URL encode the scoped package name
    mockResponses.set('https://registry.npmjs.org/@test%2Fpackage', {
      statusCode: 403,
      text: 'Forbidden',
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
    })

    await t.rejects(command(config), /Failed to publish package/)
  })

  t.test('uses custom tag when provided', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for publish command',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        tag: 'beta',
      },
      positionals: ['publish'],
      values: { tag: 'beta' },
    })

    const result = (await command(config)) as CommandResultSingle
    t.equal(result.tag, 'beta')
  })

  t.test('defaults to latest tag when tag is empty', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: '@test/empty-tag',
        version: '1.0.0',
      }),
      'index.js': 'console.log("hello");',
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
    })

    const result = (await command(config)) as CommandResultSingle
    t.equal(
      result.tag,
      'latest',
      'should default to latest tag when tag is empty',
    )
  })

  t.test('computes shasum and integrity from tarball', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'dist-package',
        version: '1.0.0',
      }),
      'index.js': 'console.log("test");',
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
    })

    const result = (await command(config)) as CommandResultSingle
    // The shasum and integrity should be computed from the actual tarball
    t.ok(result.shasum, 'should have computed shasum')
    t.ok(result.integrity, 'should have computed integrity')
    t.match(
      result.shasum,
      /^[a-f0-9]{40}$/,
      'shasum should be valid SHA1',
    )
    t.match(
      result.integrity,
      /^sha512-/,
      'integrity should be sha512',
    )
  })

  t.test('handles request errors', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for publish command',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const tempRequest = RegistryClient.prototype.request
    t.teardown(() => {
      RegistryClient.prototype.request = tempRequest
    })
    RegistryClient.prototype.request = async () => {
      throw new Error('Network error')
    }

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
    })

    await t.rejects(command(config), /Failed to publish package/)
  })

  t.test('dry-run mode', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'dry-run-package',
        version: '1.0.0',
      }),
      'index.js': 'console.log("dry run test");',
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
      },
      positionals: ['publish'],
      values: { 'dry-run': true },
    })

    const result = (await command(config)) as CommandResultSingle

    t.equal(result.name, 'dry-run-package')
    t.equal(result.version, '1.0.0')
    t.equal(result.tag, 'latest')
    t.equal(result.registry, 'https://registry.npmjs.org')
    t.ok(result.size > 0, 'should have computed size')
    t.ok(
      result.unpackedSize > 0,
      'should have computed unpacked size',
    )
    t.ok(result.shasum, 'should have computed shasum')
    t.ok(result.integrity, 'should have computed integrity')
    t.ok(Array.isArray(result.files), 'should have files array')
    t.ok(result.files.length > 0, 'should have some files')
  })

  t.test('uses custom access level', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for publish command',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
      'vlt.json': '{}',
    })

    t.chdir(dir)

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        access: 'public',
      },
      positionals: ['publish'],
      values: { access: 'public' },
    })

    const result = (await command(config)) as CommandResultSingle
    t.equal(result.access, 'public')
  })

  t.test('views format output correctly', async t => {
    const result = {
      id: 'test@1.0.0',
      name: 'test',
      version: '1.0.0',
      tag: 'latest',
      registry: 'https://registry.npmjs.org',
      shasum: 'abc123def456abc123def456abc123def456abc123',
      integrity: 'sha512-xyz789abcdef',
      size: 2048,
      access: 'public',
      unpackedSize: 4096,
      files: ['package.json', 'index.js', 'README.md'],
    } as CommandResultSingle

    t.test('human view', async t => {
      const output = views.human(result)
      t.match(output, /📦 Package: test@1\.0\.0/)
      t.match(output, /🏷️ Tag: latest/)
      t.match(output, /📡 Registry: https:\/\/registry\.npmjs\.org/)
      t.match(output, /📁 3 Files/)
      t.match(output, /package\.json/)
      t.match(output, /index\.js/)
      t.match(output, /README\.md/)
      t.match(output, /📊 Package Size: 2\.05 kB/)
      t.match(output, /📂 Unpacked Size: 4\.1?0? kB/)
      t.match(
        output,
        /🔒 Shasum: abc123def456abc123def456abc123def456abc123/,
      )
      t.match(output, /🔐 Integrity: sha512-xyz789abcdef/)
    })

    t.test('human view without optional fields', async t => {
      const minResult = {
        ...result,
        shasum: undefined,
        integrity: undefined,
      } as CommandResultSingle
      const output = views.human(minResult)
      t.notMatch(output, /🔒 Shasum/)
      t.notMatch(output, /🔐 Integrity/)
    })

    t.test('json view', async t => {
      const output = views.json(result)
      t.same(output, result)
    })
  })
})

t.test('publish command with scope', async t => {
  t.test('publishes packages matching scope query', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '1.0.0',
          }),
          'index.js': 'console.log("a")',
          'vlt.json': '{}',
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '2.0.0',
          }),
          'index.js': 'console.log("b")',
          'vlt.json': '{}',
        },
      },
    })

    // Mock the graph search to return workspace nodes
    const mockNodes = [
      {
        id: 'file:packages/a',
        toJSON: () => ({ location: 'packages/a' }),
      },
      {
        id: 'file:packages/b',
        toJSON: () => ({ location: 'packages/b' }),
      },
    ]

    const mockQuery = {
      search: async () => ({ nodes: mockNodes }),
    }

    const cmd = await t.mockImport<
      typeof import('../../src/commands/publish.ts')
    >('../../src/commands/publish.ts', {
      '@vltpkg/graph': {
        actual: {
          load: () => ({
            nodes: new Map(),
          }),
        },
      },
      '@vltpkg/query': {
        Query: class {
          search = mockQuery.search
        },
      },
      '@vltpkg/registry-client': {
        RegistryClient: class {
          async request() {
            return {
              statusCode: 201,
              text: () => '{"ok":true}',
              json: () => ({ ok: true }),
              getHeader: () => undefined,
            } as MockCacheEntry
          }
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        monorepo: [
          {
            name: '@test/a',
            fullpath: resolve(dir, 'packages/a'),
          },
          {
            name: '@test/b',
            fullpath: resolve(dir, 'packages/b'),
          },
        ],
      },
      positionals: ['publish'],
      values: { scope: ':workspace' },
    })
    config.get = ((key: unknown) => {
      if (key === 'scope') return ':workspace'
      return undefined
    }) as LoadedConfig['get']

    const result = await cmd.command(config)

    t.ok(Array.isArray(result), 'should return array of results')
    const results = result as CommandResultSingle[]
    t.equal(results.length, 2, 'should publish both workspaces')

    t.equal(results[0]!.name, '@test/a')
    t.equal(results[0]!.version, '1.0.0')
    t.equal(results[1]!.name, '@test/b')
    t.equal(results[1]!.version, '2.0.0')
  })

  t.test('handles empty scope query results', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: [] }),
    })

    const cmd = await t.mockImport<
      typeof import('../../src/commands/publish.ts')
    >('../../src/commands/publish.ts', {
      '@vltpkg/graph': {
        actual: {
          load: () => ({
            nodes: new Map(),
          }),
        },
      },
      '@vltpkg/query': {
        Query: class {
          search = async () => ({ nodes: [] })
        },
      },
      '@vltpkg/registry-client': {
        RegistryClient: class {
          async request() {
            return {
              statusCode: 201,
              text: () => '{"ok":true}',
              json: () => ({ ok: true }),
              getHeader: () => undefined,
            } as MockCacheEntry
          }
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        monorepo: [],
      },
      positionals: ['publish'],
      values: { scope: ':workspace#nonexistent' },
    })
    config.get = ((key: unknown) => {
      if (key === 'scope') return ':workspace#nonexistent'
      return undefined
    }) as LoadedConfig['get']

    await t.rejects(cmd.command(config as LoadedConfig), {
      message: 'No workspaces or query results found',
    })
  })
})

t.test('publish command with workspace paths', async t => {
  t.test('publishes specific workspace paths', async t => {
    // Store original request
    const tempRequest = RegistryClient.prototype.request

    // Override registry client request to mock success
    RegistryClient.prototype.request = (async () => {
      return {
        statusCode: 201,
        text: () => '{"ok":true}',
        json: () => ({ ok: true }),
        getHeader: () => undefined,
      } as MockCacheEntry
    }) as unknown as typeof tempRequest

    t.teardown(() => {
      RegistryClient.prototype.request = tempRequest
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '1.0.0',
          }),
          'index.js': 'console.log("a")',
          'vlt.json': '{}',
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '2.0.0',
          }),
          'index.js': 'console.log("b")',
          'vlt.json': '{}',
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        monorepo: [
          {
            name: '@test/a',
            fullpath: resolve(dir, 'packages/a'),
          },
        ],
      },
      positionals: ['publish'],
      values: { workspace: ['packages/a'] },
    })
    config.get = ((key: unknown) => {
      if (key === 'workspace') return ['packages/a']
      return undefined
    }) as LoadedConfig['get']

    const result = await command(config)

    t.ok(Array.isArray(result), 'should return array of results')
    const results = result as CommandResultSingle[]
    t.equal(
      results.length,
      1,
      'should publish only specified workspace',
    )

    t.equal(results[0]!.name, '@test/a')
    t.equal(results[0]!.version, '1.0.0')
  })
})

t.test('publish command with workspace-group', async t => {
  t.test('publishes all workspaces in group', async t => {
    // Store original request
    const tempRequest = RegistryClient.prototype.request

    // Override registry client request to mock success
    RegistryClient.prototype.request = (async () => {
      return {
        statusCode: 201,
        text: () => '{"ok":true}',
        json: () => ({ ok: true }),
        getHeader: () => undefined,
      } as MockCacheEntry
    }) as unknown as typeof tempRequest

    t.teardown(() => {
      RegistryClient.prototype.request = tempRequest
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '1.0.0',
          }),
          'index.js': 'console.log("a")',
          'vlt.json': '{}',
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '2.0.0',
          }),
          'index.js': 'console.log("b")',
          'vlt.json': '{}',
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        monorepo: [
          {
            name: '@test/a',
            fullpath: resolve(dir, 'packages/a'),
          },
          {
            name: '@test/b',
            fullpath: resolve(dir, 'packages/b'),
          },
        ],
      },
      positionals: ['publish'],
      values: { 'workspace-group': ['packages'] },
    })
    config.get = ((key: unknown) => {
      if (key === 'workspace-group') return ['packages']
      return undefined
    }) as LoadedConfig['get']

    const result = await command(config)

    t.ok(Array.isArray(result), 'should return array of results')
    const results = result as CommandResultSingle[]
    t.equal(
      results.length,
      2,
      'should publish all workspaces in group',
    )

    t.equal(results[0]!.name, '@test/a')
    t.equal(results[0]!.version, '1.0.0')
    t.equal(results[1]!.name, '@test/b')
    t.equal(results[1]!.version, '2.0.0')
  })
})

t.test('publish command with recursive', async t => {
  t.test('publishes all workspaces recursively', async t => {
    // Store original request
    const tempRequest = RegistryClient.prototype.request

    // Override registry client request to mock success
    RegistryClient.prototype.request = (async () => {
      return {
        statusCode: 201,
        text: () => '{"ok":true}',
        json: () => ({ ok: true }),
        getHeader: () => undefined,
      } as MockCacheEntry
    }) as unknown as typeof tempRequest

    t.teardown(() => {
      RegistryClient.prototype.request = tempRequest
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: ['packages/*'] }),
      packages: {
        a: {
          'package.json': JSON.stringify({
            name: '@test/a',
            version: '1.0.0',
          }),
          'index.js': 'console.log("a")',
          'vlt.json': '{}',
        },
        b: {
          'package.json': JSON.stringify({
            name: '@test/b',
            version: '2.0.0',
          }),
          'index.js': 'console.log("b")',
          'vlt.json': '{}',
        },
      },
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        monorepo: [
          {
            name: '@test/a',
            fullpath: resolve(dir, 'packages/a'),
          },
          {
            name: '@test/b',
            fullpath: resolve(dir, 'packages/b'),
          },
        ],
      },
      positionals: ['publish'],
      values: { recursive: true },
    })
    config.get = ((key: unknown) => {
      if (key === 'recursive') return true
      return undefined
    }) as LoadedConfig['get']

    const result = await command(config)

    t.ok(Array.isArray(result), 'should return array of results')
    const results = result as CommandResultSingle[]
    t.equal(results.length, 2, 'should publish all workspaces')

    t.equal(results[0]!.name, '@test/a')
    t.equal(results[0]!.version, '1.0.0')
    t.equal(results[1]!.name, '@test/b')
    t.equal(results[1]!.version, '2.0.0')
  })

  t.test('handles empty monorepo array', async t => {
    // Store original request
    const tempRequest = RegistryClient.prototype.request

    // Override registry client request to mock success
    RegistryClient.prototype.request = (async () => {
      return {
        statusCode: 201,
        text: () => '{"ok":true}',
        json: () => ({ ok: true }),
        getHeader: () => undefined,
      } as MockCacheEntry
    }) as unknown as typeof tempRequest

    t.teardown(() => {
      RegistryClient.prototype.request = tempRequest
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: [] }),
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        monorepo: [],
      },
      positionals: ['publish'],
      values: { recursive: true },
    })
    config.get = ((key: unknown) => {
      if (key === 'recursive') return true
      return undefined
    }) as LoadedConfig['get']

    await t.rejects(command(config as LoadedConfig), {
      message: 'No workspaces or query results found',
    })
  })

  t.test('handles null monorepo', async t => {
    // Store original request
    const tempRequest = RegistryClient.prototype.request

    // Override registry client request to mock success
    RegistryClient.prototype.request = (async () => {
      return {
        statusCode: 201,
        text: () => '{"ok":true}',
        json: () => ({ ok: true }),
        getHeader: () => undefined,
      } as MockCacheEntry
    }) as unknown as typeof tempRequest

    t.teardown(() => {
      RegistryClient.prototype.request = tempRequest
    })

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({ workspaces: [] }),
    })

    const config = makeTestConfig({
      projectRoot: dir,
      options: {
        packageJson: new PackageJson(),
        registry: 'https://registry.npmjs.org',
        monorepo: null,
      },
      positionals: ['publish'],
      values: { recursive: true },
    })
    config.get = ((key: unknown) => {
      if (key === 'recursive') return true
      return undefined
    }) as LoadedConfig['get']

    await t.rejects(command(config as LoadedConfig), {
      message: 'No workspaces or query results found',
    })
  })
})

t.test('publish command fallback to projectRoot', async t => {
  t.test(
    'uses projectRoot when package.json.find returns null',
    async t => {
      // Store original request
      const tempRequest = RegistryClient.prototype.request

      // Override registry client request to mock success
      RegistryClient.prototype.request = (async () => {
        return {
          statusCode: 201,
          text: () => '{"ok":true}',
          json: () => ({ ok: true }),
          getHeader: () => undefined,
        } as MockCacheEntry
      }) as unknown as typeof tempRequest

      t.teardown(() => {
        RegistryClient.prototype.request = tempRequest
      })

      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'root',
          version: '1.0.0',
        }),
        'index.js': 'console.log("root")',
        'vlt.json': '{}',
      })

      // Override process.cwd to return a different path
      const originalCwd = process.cwd
      process.cwd = () => '/fake/path'
      t.teardown(() => {
        process.cwd = originalCwd
      })

      const packageJson = new PackageJson()
      // Override find to return null for process.cwd(), projectRoot for dir
      const originalFind = packageJson.find.bind(packageJson)
      packageJson.find = (cwd?: string) => {
        if (cwd === '/fake/path') return undefined
        if (cwd === dir) return resolve(dir, 'package.json')
        return originalFind(cwd)
      }

      const config = makeTestConfig({
        projectRoot: dir,
        options: {
          packageJson,
          registry: 'https://registry.npmjs.org',
        },
        positionals: ['publish'],
      })

      const result = await command(config)

      t.notOk(Array.isArray(result), 'should return single result')
      const singleResult = result as CommandResultSingle
      t.equal(singleResult.name, 'root')
      t.equal(singleResult.version, '1.0.0')
    },
  )
})

t.test('human view with arrays', async t => {
  t.test('formats multiple results', async t => {
    const results = [
      {
        id: 'test-a@1.0.0',
        name: 'test-a',
        version: '1.0.0',
        tag: 'latest',
        registry: 'https://registry.npmjs.org',
        shasum: 'abc123',
        integrity: 'sha512-xyz',
        size: 1024,
        access: 'public',
        unpackedSize: 2048,
        files: ['package.json', 'index.js'],
      },
      {
        id: 'test-b@2.0.0',
        name: 'test-b',
        version: '2.0.0',
        tag: 'latest',
        registry: 'https://registry.npmjs.org',
        shasum: 'def456',
        integrity: 'sha512-abc',
        size: 2048,
        access: 'public',
        unpackedSize: 4096,
        files: ['package.json', 'index.js'],
      },
    ] as CommandResultSingle[]

    const output = views.human(results)
    t.match(output, /test-a@1\.0\.0/)
    t.match(output, /test-b@2\.0\.0/)
    t.match(output, /🏷️ Tag: latest/)
    t.match(output, /📡 Registry: https:\/\/registry\.npmjs\.org/)
  })
})
