import t from 'tap'
import { resolve } from 'node:path'
import { command } from '../../src/commands/publish.ts'
import { Config } from '../../src/config/index.ts'
import { RegistryClient } from '@vltpkg/registry-client'

// Mock the RegistryClient
const mockResponses = new Map<string, any>()
const originalRequest = RegistryClient.prototype.request

t.beforeEach(() => {
  // Reset mock responses
  mockResponses.clear()
  
  // Mock the request method
  RegistryClient.prototype.request = async function(url: any, options: any) {
    const urlStr = url.toString()
    const mockResponse = mockResponses.get(urlStr)
    
    if (mockResponse) {
      return {
        statusCode: mockResponse.statusCode || 201,
        text: () => mockResponse.text || '',
        json: () => mockResponse.json || {},
        getHeader: () => undefined,
      } as any
    }
    
    // Default to success
    return {
      statusCode: 201,
      text: () => '{"ok":true}',
      json: () => ({ ok: true }),
      getHeader: () => undefined,
    } as any
  }
})

t.afterEach(() => {
  // Restore original request method
  RegistryClient.prototype.request = originalRequest
})

t.test('publish command', async t => {
  const testDir = t.testdir({
    'test-package': {
      'package.json': JSON.stringify({
        name: '@test/package',
        version: '1.2.3',
        description: 'Test package for publish command',
        main: 'index.js',
      }),
      'index.js': '// test file\nconsole.log("hello");',
      'README.md': '# Test Package',
    },
  })

  const packagePath = resolve(testDir, 'test-package')
  
  // Create a proper Config instance
  const config = new Config(undefined, testDir)
  await config.loadConfigFile()
  const mockConfig = config.parse(['publish', packagePath])

  t.test('publishes package successfully', async t => {
    const result = await command(mockConfig)
    
    t.equal(result.name, '@test/package')
    t.equal(result.version, '1.2.3')
    t.equal(result.tag, 'latest')
    t.equal(result.registry, 'https://registry.npmjs.org')
    t.ok(result.size > 0, 'should have a size')
  })

  t.test('throws error if package has no name', async t => {
    const badDir = t.testdir({
      'bad-package': {
        'package.json': JSON.stringify({
          version: '1.0.0',
        }),
      },
    })
    
    const badConfig = new Config(undefined, badDir)
    await badConfig.loadConfigFile()
    const parsedBadConfig = badConfig.parse(['publish', resolve(badDir, 'bad-package')])
    
    await t.rejects(
      command(parsedBadConfig),
      /Package must have a name and version/,
    )
  })

  t.test('throws error if package has no version', async t => {
    const badDir = t.testdir({
      'bad-package': {
        'package.json': JSON.stringify({
          name: 'bad-package',
        }),
      },
    })
    
    const badConfig = new Config(undefined, badDir)
    await badConfig.loadConfigFile()
    const parsedBadConfig = badConfig.parse(['publish', resolve(badDir, 'bad-package')])
    
    await t.rejects(
      command(parsedBadConfig),
      /Package must have a name and version/,
    )
  })

  t.test('handles registry errors', async t => {
    // Mock a failure response
    mockResponses.set('https://registry.npmjs.org/@test/package', {
      statusCode: 403,
      text: 'Forbidden',
    })
    
    await t.rejects(
      command(mockConfig),
      /Failed to publish package/,
    )
  })

  t.test('uses custom tag when provided', async t => {
    // Create a new config with custom tag
    const configWithTag = new Config(undefined, testDir)
    await configWithTag.loadConfigFile()
    const parsedConfigWithTag = configWithTag.parse(['publish', '--tag=beta', packagePath])
    
    const result = await command(parsedConfigWithTag)
    t.equal(result.tag, 'beta')
  })
})