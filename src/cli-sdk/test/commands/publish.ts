import t from 'tap'
import { command, views, usage } from '../../src/commands/publish.ts'
import type { CommandResult } from '../../src/commands/publish.ts'
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

    const result = await command(config)

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

    const result = await command(config)
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

    const result = await command(config)
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

    const result = await command(config)
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

    const result = await command(config)

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

    const result = await command(config)
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
    } as CommandResult

    t.test('human view', async t => {
      const output = views.human(result)
      t.match(output, /✅ Published test@1\.0\.0/)
      t.match(output, /📦 Package: test@1\.0\.0/)
      t.match(output, /🏷️ Tag: latest/)
      t.match(output, /📡 Registry: https:\/\/registry\.npmjs\.org/)
      t.match(output, /📁 3 files/)
      t.match(output, /package\.json/)
      t.match(output, /index\.js/)
      t.match(output, /README\.md/)
      t.match(output, /📊 package size: 2\.05 kB/)
      t.match(output, /📂 unpacked size: 4\.1?0? kB/)
      t.match(
        output,
        /🔒 shasum: abc123def456abc123def456abc123def456abc123/,
      )
      t.match(output, /🔐 integrity: sha512-xyz789abcdef/)
    })

    t.test('human view without optional fields', async t => {
      const minResult = {
        ...result,
        shasum: undefined,
        integrity: undefined,
      } as CommandResult
      const output = views.human(minResult)
      t.notMatch(output, /🔒 shasum/)
      t.notMatch(output, /🔐 integrity/)
    })

    t.test('json view', async t => {
      const output = views.json(result)
      t.same(output, result)
    })
  })
})
