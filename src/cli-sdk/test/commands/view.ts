import t from 'tap'
import { resolve } from 'node:path'
import { getId } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Manifest, Packument, NodeLike } from '@vltpkg/types'
import type { PackageReportData } from '@vltpkg/security-archive'

const mockPackument: Packument = {
  name: 'test-pkg',
  'dist-tags': { latest: '2.0.0', next: '3.0.0-beta.1' },
  versions: {
    '1.0.0': {
      name: 'test-pkg',
      version: '1.0.0',
      description: 'Old version',
    },
    '2.0.0': {
      name: 'test-pkg',
      version: '2.0.0',
      description: 'A test package',
      license: 'MIT',
      homepage: 'https://test-pkg.example.com',
      repository: {
        type: 'git',
        url: 'https://github.com/test/test-pkg',
      },
      author: { name: 'Test Author' },
      keywords: ['test', 'example'],
      dependencies: { lodash: '^4.0.0', express: '^4.0.0' },
      devDependencies: { tap: '^18.0.0' },
    },
  },
  time: {
    '1.0.0': '2024-01-01T00:00:00.000Z',
    '2.0.0': '2024-06-15T12:00:00.000Z',
  },
  maintainers: [{ name: 'maintainer-1' }, { name: 'maintainer-2' }],
}

const mockManifest: Manifest = mockPackument.versions['2.0.0']!

const mockSecurity: PackageReportData = {
  id: 'test-pkg@2.0.0',
  author: ['Test Author'],
  size: 12345,
  type: 'npm',
  name: 'test-pkg',
  version: '2.0.0',
  license: 'MIT',
  alerts: [
    {
      key: 'outdatedDependency',
      type: 'supplyChainRisk',
      severity: 'low',
      category: 'supply-chain',
    },
  ],
  score: {
    overall: 0.85,
    license: 0.9,
    maintenance: 0.8,
    quality: 0.85,
    supplyChain: 0.9,
    vulnerability: 0.8,
  },
}

let mockPackumentResult: Packument | undefined
let mockManifestResult: Manifest | undefined
let securityStartCalled = false
let lastSecurityNodes: unknown[] = []
let mockSecurityResult: PackageReportData | undefined
let mockSecurityShouldThrow = false
let lastSpec: Spec | undefined
let picCalls = 0

const Command = await t.mockImport<
  typeof import('../../src/commands/view.ts')
>('../../src/commands/view.ts', {
  '@vltpkg/package-info': {
    PackageInfoClient: class {
      constructor() {
        picCalls++
      }
      async packument(spec: Spec) {
        lastSpec = spec
        if (!mockPackumentResult) {
          throw new Error('No packument found')
        }
        return mockPackumentResult
      }
      async manifest() {
        if (!mockManifestResult) {
          throw new Error('No manifest found')
        }
        return mockManifestResult
      }
    },
  },
  '@vltpkg/security-archive': {
    SecurityArchive: {
      start: async (opts: { nodes: unknown[] }) => {
        securityStartCalled = true
        lastSecurityNodes = opts.nodes
        if (mockSecurityShouldThrow) {
          throw new Error('Security service unavailable')
        }
        return {
          get: () => mockSecurityResult,
        }
      },
    },
  },
})

t.beforeEach(() => {
  mockPackumentResult = undefined
  mockManifestResult = undefined
  securityStartCalled = false
  lastSecurityNodes = []
  mockSecurityResult = undefined
  mockSecurityShouldThrow = false
  lastSpec = undefined
  picCalls = 0
})

const makeConfig = (
  positionals: string[],
  overrides?: Partial<LoadedConfig>,
): LoadedConfig =>
  ({
    positionals,
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
    ...overrides,
  }) as unknown as LoadedConfig

t.test('usage', async t => {
  t.matchSnapshot(Command.usage().usageMarkdown())
})

t.test('views', async t => {
  const result = {
    packument: mockPackument,
    manifest: mockManifest,
    security: mockSecurity,
  }

  t.test('human view - full output', async t => {
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.type(output, 'string')
    const str = output
    t.ok(str.includes('test-pkg@2.0.0'), 'includes name@version')
    t.ok(str.includes('A test package'), 'includes description')
    t.ok(str.includes('MIT'), 'includes license')
    t.ok(
      str.includes('https://test-pkg.example.com'),
      'includes homepage',
    )
    t.ok(
      str.includes('https://github.com/test/test-pkg'),
      'includes repository',
    )
    t.ok(str.includes('Test Author'), 'includes author')
    t.ok(str.includes('test, example'), 'includes keywords')
    t.ok(str.includes('latest: 2.0.0'), 'includes dist-tags')
    t.ok(str.includes('2 dependencies'), 'includes dep count')
    t.ok(str.includes('1 dev'), 'includes dev dep count')
    t.ok(str.includes('maintainer-1'), 'includes maintainers')
    t.ok(str.includes('security:'), 'includes security section')
    t.ok(str.includes('score: 85/100'), 'includes overall score')
    t.ok(str.includes('alerts: 1'), 'includes alert count')
    t.ok(
      str.includes('[LOW] supplyChainRisk'),
      'includes alert details',
    )
    t.ok(str.includes('2 total'), 'includes version count')
  })

  t.test('human view - field value (string)', async t => {
    const fieldResult = {
      ...result,
      fieldPath: 'name',
      fieldValue: 'test-pkg',
    }
    const output = Command.views.human(
      fieldResult,
      {},
      {} as LoadedConfig,
    )
    t.equal(output, 'test-pkg')
  })

  t.test('human view - field value (array)', async t => {
    const fieldResult = {
      ...result,
      fieldPath: 'versions',
      fieldValue: ['1.0.0', '2.0.0'],
    }
    const output = Command.views.human(
      fieldResult,
      {},
      {} as LoadedConfig,
    )
    t.equal(output, '1.0.0\n2.0.0')
  })

  t.test('human view - field value (object)', async t => {
    const fieldResult = {
      ...result,
      fieldPath: 'dependencies',
      fieldValue: { lodash: '^4.0.0', express: '^4.0.0' },
    }
    const output = Command.views.human(
      fieldResult,
      {},
      {} as LoadedConfig,
    )
    t.equal(
      output,
      JSON.stringify(
        { lodash: '^4.0.0', express: '^4.0.0' },
        null,
        2,
      ),
    )
  })

  t.test('human view - field value (undefined)', async t => {
    const fieldResult = {
      ...result,
      fieldPath: 'nonexistent',
      fieldValue: undefined,
    }
    const output = Command.views.human(
      fieldResult,
      {},
      {} as LoadedConfig,
    )
    t.equal(output, '')
  })

  t.test('json view - full output', async t => {
    const output = Command.views.json(result, {}, {} as LoadedConfig)
    t.ok(typeof output === 'object' && output !== null)
    const obj = output as Record<string, unknown>
    t.equal(obj.name, 'test-pkg')
    t.equal(obj.version, '2.0.0')
    t.ok(obj['dist-tags'], 'includes dist-tags')
    t.ok(obj.time, 'includes time')
    t.ok(obj.security, 'includes security')
  })

  t.test('json view - field value', async t => {
    const fieldResult = {
      ...result,
      fieldPath: 'version',
      fieldValue: '2.0.0',
    }
    const output = Command.views.json(
      fieldResult,
      {},
      {} as LoadedConfig,
    )
    t.equal(output, '2.0.0')
  })

  t.test('json view - no security', async t => {
    const noSecResult = {
      packument: mockPackument,
      manifest: mockManifest,
    }
    const output = Command.views.json(
      noSecResult,
      {},
      {} as LoadedConfig,
    )
    t.ok(typeof output === 'object' && output !== null)
    const obj = output as Record<string, unknown>
    t.notOk(obj.security, 'no security when not available')
  })
})

t.test('command', async t => {
  t.test('basic view - fetches packument and manifest', async t => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
    mockSecurityResult = mockSecurity

    const config = makeConfig(['test-pkg'])
    const result = await Command.command(config)

    t.equal(result.packument, mockPackument)
    t.equal(result.manifest, mockManifest)
    t.equal(result.security, mockSecurity)
    t.equal(result.fieldPath, undefined)
    t.ok(securityStartCalled, 'security archive was started')
  })

  t.test(
    'passes spec-derived id and registries options to archive',
    async t => {
      mockPackumentResult = mockPackument
      mockManifestResult = mockManifest
      mockSecurityResult = mockSecurity

      const registries = {
        npm: 'https://registry.vlt.io/acct/npm/',
      }
      const config = makeConfig(['test-pkg'])
      config.options.registries = registries
      await Command.command(config)

      t.equal(lastSecurityNodes.length, 1)
      const node = lastSecurityNodes[0] as NodeLike
      const spec = Spec.parseArgs('test-pkg', config.options)
      t.equal(
        node.id,
        getId(spec, { name: 'test-pkg', version: '2.0.0' }),
        'should derive the DepID from the parsed spec',
      )
      t.strictSame(
        node.options.registries,
        registries,
        'should pass config registries through to the fake node',
      )
    },
  )

  t.test('field access - returns field value', async t => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
    mockSecurityResult = undefined

    const config = makeConfig(['test-pkg', 'version'])
    const result = await Command.command(config)

    t.equal(result.fieldPath, 'version')
    t.equal(result.fieldValue, '2.0.0')
  })

  t.test('field access - packument field (versions)', async t => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
    mockSecurityResult = undefined

    const config = makeConfig(['test-pkg', 'versions'])
    const result = await Command.command(config)

    t.equal(result.fieldPath, 'versions')
    t.ok(
      typeof result.fieldValue === 'object',
      'versions is an object',
    )
  })

  t.test('field access - dist-tags', async t => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
    mockSecurityResult = undefined

    const config = makeConfig(['test-pkg', 'dist-tags'])
    const result = await Command.command(config)

    t.equal(result.fieldPath, 'dist-tags')
    t.strictSame(result.fieldValue, {
      latest: '2.0.0',
      next: '3.0.0-beta.1',
    })
  })

  t.test('field access - dist-tags.latest', async t => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
    mockSecurityResult = undefined

    const config = makeConfig(['test-pkg', 'dist-tags.latest'])
    const result = await Command.command(config)

    t.equal(result.fieldPath, 'dist-tags.latest')
    t.equal(result.fieldValue, '2.0.0')
  })

  t.test('field access - security', async t => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
    mockSecurityResult = mockSecurity

    const config = makeConfig(['test-pkg', 'security'])
    const result = await Command.command(config)

    t.equal(result.fieldPath, 'security')
    t.equal(result.fieldValue, mockSecurity)
  })

  t.test('field access - security.score.overall', async t => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
    mockSecurityResult = mockSecurity

    const config = makeConfig(['test-pkg', 'security.score.overall'])
    const result = await Command.command(config)

    t.equal(result.fieldPath, 'security.score.overall')
    t.equal(result.fieldValue, 0.85)
  })

  t.test('security failure does not break command', async t => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
    mockSecurityShouldThrow = true

    const config = makeConfig(['test-pkg'])
    const result = await Command.command(config)

    t.ok(securityStartCalled, 'security archive start was attempted')
    t.equal(
      result.security,
      undefined,
      'security is undefined on failure',
    )
    t.equal(result.packument, mockPackument)
    t.equal(result.manifest, mockManifest)
  })

  t.test('no security lookup when name is missing', async t => {
    mockPackumentResult = {
      name: '',
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': { version: '1.0.0' },
      },
    }
    mockManifestResult = { version: '1.0.0' }

    const config = makeConfig(['test-pkg'])
    const result = await Command.command(config)

    t.equal(
      securityStartCalled,
      false,
      'security archive not started for empty name',
    )
    t.equal(result.security, undefined)
  })
})

t.test('human formatting edge cases', async t => {
  t.test('minimal manifest', async t => {
    const result = {
      packument: {
        name: 'minimal-pkg',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': { name: 'minimal-pkg', version: '1.0.0' },
        },
      } as Packument,
      manifest: {
        name: 'minimal-pkg',
        version: '1.0.0',
      } as Manifest,
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.ok(output.includes('minimal-pkg@1.0.0'))
    t.notOk(output.includes('license:'))
    t.notOk(output.includes('homepage:'))
    t.notOk(output.includes('security:'))
  })

  t.test('string author', async t => {
    const result = {
      packument: {
        name: 'pkg',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'pkg',
            version: '1.0.0',
            author: 'String Author',
          },
        },
      } as Packument,
      manifest: {
        name: 'pkg',
        version: '1.0.0',
        author: 'String Author',
      } as Manifest,
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.ok(output.includes('author: String Author'))
  })

  t.test('string repository', async t => {
    const result = {
      packument: {
        name: 'pkg',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'pkg',
            version: '1.0.0',
            repository: 'github:user/repo',
          },
        },
      } as Packument,
      manifest: {
        name: 'pkg',
        version: '1.0.0',
        repository: 'github:user/repo',
      } as Manifest,
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.ok(output.includes('repository: github:user/repo'))
  })

  t.test('string maintainers', async t => {
    const result = {
      packument: {
        name: 'pkg',
        'dist-tags': { latest: '1.0.0' },
        versions: { '1.0.0': { name: 'pkg', version: '1.0.0' } },
        maintainers: ['string-maintainer'],
      } as Packument,
      manifest: { name: 'pkg', version: '1.0.0' } as Manifest,
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.ok(output.includes('string-maintainer'))
  })

  t.test('no alerts', async t => {
    const result = {
      packument: mockPackument,
      manifest: mockManifest,
      security: {
        ...mockSecurity,
        alerts: [],
      },
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.ok(output.includes('alerts: none'))
  })

  t.test('alert severity levels', async t => {
    const result = {
      packument: mockPackument,
      manifest: mockManifest,
      security: {
        ...mockSecurity,
        alerts: [
          {
            key: 'crit',
            type: 'vulnerability',
            severity: 'critical' as const,
            category: 'security',
          },
          {
            key: 'high',
            type: 'vulnerability',
            severity: 'high' as const,
            category: 'security',
          },
          {
            key: 'med',
            type: 'risk',
            severity: 'medium' as const,
            category: 'quality',
          },
          {
            key: 'low',
            type: 'info',
            severity: 'low' as const,
            category: 'info',
          },
        ],
      },
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.ok(output.includes('[CRITICAL]'))
    t.ok(output.includes('[HIGH]'))
    t.ok(output.includes('[MEDIUM]'))
    t.ok(output.includes('[LOW]'))
  })

  t.test('fallback name and version', async t => {
    const result = {
      packument: {
        name: 'from-packument',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': { version: '1.0.0' },
        },
      } as Packument,
      manifest: { version: undefined } as unknown as Manifest,
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.equal(
      output.split('\n')[0],
      'from-packument',
      'falls back to packument name, no version',
    )
  })

  t.test('non-array keywords', async t => {
    const result = {
      packument: {
        name: 'pkg',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'pkg',
            version: '1.0.0',
            keywords: 'single-keyword',
          },
        },
      } as Packument,
      manifest: {
        name: 'pkg',
        version: '1.0.0',
        keywords: 'single-keyword',
      } as Manifest,
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.ok(output.includes('keywords: single-keyword'))
  })

  t.test('human view - field value (number)', async t => {
    const result = {
      packument: mockPackument,
      manifest: mockManifest,
      fieldPath: 'count',
      fieldValue: 42,
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.equal(output, '42')
  })

  t.test('optional dependencies', async t => {
    const result = {
      packument: {
        name: 'pkg',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'pkg',
            version: '1.0.0',
            optionalDependencies: { fsevents: '^2.0.0' },
            peerDependencies: { react: '^18.0.0' },
          },
        },
      } as Packument,
      manifest: {
        name: 'pkg',
        version: '1.0.0',
        optionalDependencies: { fsevents: '^2.0.0' },
        peerDependencies: { react: '^18.0.0' },
      } as Manifest,
    }
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.ok(output.includes('1 optional'))
    t.ok(output.includes('1 peer'))
  })
})

t.test('local package (.)', async t => {
  const localConfig = (
    positionals: string[],
    pkg: Record<string, unknown> | null = {
      name: 'test-pkg',
      version: '1.0.0',
    },
  ) => {
    const found: string[] = []
    const config = makeConfig(positionals)
    config.options.packageJson = {
      find: (cwd: string) => {
        found.push(cwd)
        return pkg ? '/p/package.json' : undefined
      },
      read: () => pkg,
    } as unknown as LoadedConfig['options']['packageJson']
    return { config, found }
  }

  t.beforeEach(() => {
    mockPackumentResult = mockPackument
    mockManifestResult = mockManifest
  })

  t.test('no args views local pkg from registry', async t => {
    const { config } = localConfig([])
    const result = await Command.command(config)
    t.equal(lastSpec?.name, 'test-pkg')
    t.equal(lastSpec?.bareSpec, '')
    t.equal(result.manifest, mockManifest)
  })

  t.test('. views local pkg from registry', async t => {
    const { config, found } = localConfig(['.'])
    const result = await Command.command(config)
    t.strictSame(found, [process.cwd()])
    t.equal(lastSpec?.name, 'test-pkg')
    t.equal(lastSpec?.bareSpec, '')
    t.equal(result.manifest, mockManifest)
  })

  t.test('.@<version>', async t => {
    const { config } = localConfig(['.@1.0.0'])
    await Command.command(config)
    t.equal(lastSpec?.name, 'test-pkg')
    t.equal(lastSpec?.bareSpec, '1.0.0')
  })

  t.test('name kept literal', async t => {
    const { config } = localConfig(['.'], { name: 'npm:x' })
    await Command.command(config)
    t.equal(lastSpec?.name, 'npm:x')
    t.equal(lastSpec?.bareSpec, '')
  })

  t.test('path spec skips local lookup', async t => {
    const { config, found } = localConfig(['./sub'])
    await Command.command(config)
    t.strictSame(found, [])
    t.equal(lastSpec?.type, 'file')
  })

  t.test('scoped .@<tag>', async t => {
    const { config } = localConfig(['.@next'], {
      name: '@scope/pkg',
      version: '1.0.0',
    })
    await Command.command(config)
    t.equal(lastSpec?.name, '@scope/pkg')
    t.equal(lastSpec?.bareSpec, 'next')
  })

  t.test('. <field>', async t => {
    const { config } = localConfig(['.', 'version'])
    const result = await Command.command(config)
    t.equal(result.fieldValue, '2.0.0')
  })

  t.test('no package.json', async t => {
    const { config } = localConfig(['.'], null)
    await t.rejects(Command.command(config), {
      message: 'No local package.json found',
      cause: { code: 'EUSAGE' },
    })
  })

  t.test('no name', async t => {
    const { config } = localConfig(['.'], { version: '1.0.0' })
    await t.rejects(Command.command(config), {
      message: 'No package name found in package.json',
      cause: { code: 'EUSAGE', found: '/p/package.json' },
    })
  })

  t.test('private shows local info, no fetch', async t => {
    const pkg = { name: 'test-pkg', version: '1.0.0', private: true }
    const { config } = localConfig(['.'], pkg)
    const result = await Command.command(config)
    t.equal(result.manifest, pkg)
    t.strictSame(result.packument, {
      name: 'test-pkg',
      'dist-tags': {},
      versions: {},
    })
    t.equal(result.security, undefined)
    t.equal(securityStartCalled, false)
    t.equal(picCalls, 0)
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.equal(output.split('\n')[0], 'test-pkg@1.0.0')
    t.notMatch(output, 'versions:')

    const { config: fieldConfig } = localConfig(['.', 'version'], pkg)
    t.equal((await Command.command(fieldConfig)).fieldValue, '1.0.0')
  })

  t.test('private without version', async t => {
    const pkg = { name: 'test-pkg', private: true }
    const { config } = localConfig(['.'], pkg)
    const result = await Command.command(config)
    t.strictSame(result.packument.versions, {})
    const output = Command.views.human(result, {}, {} as LoadedConfig)
    t.equal(output.split('\n')[0], 'test-pkg')
  })

  t.test('private .@<version>', async t => {
    const { config } = localConfig(['.@1'], {
      name: 'test-pkg',
      private: true,
    })
    await t.rejects(Command.command(config), {
      message: 'Cannot select a version of a private package',
      cause: { code: 'EUSAGE', found: '.@1' },
    })
    t.equal(picCalls, 0)
  })

  t.test('walks up from cwd', async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'x',
        version: '1.2.3',
        private: true,
      }),
      sub: {},
    })
    t.chdir(resolve(dir, 'sub'))
    const config = makeConfig(['.'])
    config.options.packageJson = new PackageJson()
    const result = await Command.command(config)
    t.equal(result.manifest.name, 'x')
    t.equal(result.manifest.version, '1.2.3')
  })
})
