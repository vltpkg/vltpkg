import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Manifest } from '@vltpkg/types'

let openedUrl: string | undefined
let mockManifest: Manifest | undefined
let mockFromUrlResult: { docs: () => string } | null = null

const Command = await t.mockImport<
  typeof import('../../src/commands/docs.ts')
>('../../src/commands/docs.ts', {
  '@vltpkg/url-open': {
    urlOpen: async (url: string) => {
      openedUrl = url
    },
  },
  '@vltpkg/package-info': {
    PackageInfoClient: class {
      async manifest() {
        if (!mockManifest) {
          throw new Error('No manifest found')
        }
        return mockManifest
      }
    },
  },
  'hosted-git-info': {
    fromUrl: (url: string) => {
      t.ok(url, 'fromUrl called with url')
      return mockFromUrlResult
    },
  },
})

t.beforeEach(() => {
  openedUrl = undefined
  mockManifest = undefined
  mockFromUrlResult = null
})

t.test('usage', async t => {
  t.matchSnapshot(Command.usage().usageMarkdown())
})

t.test('views', async t => {
  t.strictSame(
    Command.views.json({ url: 'https://example.com', name: 'pkg' }),
    { url: 'https://example.com', name: 'pkg' },
  )
  t.strictSame(
    Command.views.human({
      url: 'https://example.com',
      name: 'pkg',
    }),
    '',
    'should return empty string for single result, url-open will print the url',
  )
})

t.test('no args - reads from local package.json', async t => {
  const localManifest = {
    name: 'my-package',
    repository: {
      type: 'git',
      url: 'https://github.com/user/repo',
    },
  }

  mockFromUrlResult = {
    docs: () => 'https://github.com/user/repo#readme',
  }

  const config = {
    positionals: [],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: (path: string) => {
          t.equal(path, '/test/project')
          return localManifest
        },
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'my-package',
    url: 'https://github.com/user/repo#readme',
  })
  t.equal(openedUrl, 'https://github.com/user/repo#readme')
})

t.test('with spec arg - fetches manifest', async t => {
  mockManifest = {
    name: 'abbrev',
    version: '2.0.0',
    repository: {
      type: 'git',
      url: 'https://github.com/npm/abbrev',
    },
  } as Manifest

  mockFromUrlResult = {
    docs: () => 'https://github.com/npm/abbrev#readme',
  }

  const config = {
    positionals: ['abbrev@2.0.0'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'abbrev',
    url: 'https://github.com/npm/abbrev#readme',
  })
  t.equal(openedUrl, 'https://github.com/npm/abbrev#readme')
})

t.test('homepage takes priority over repository', async t => {
  mockManifest = {
    name: 'some-package',
    homepage: 'https://example.com/docs',
    repository: {
      type: 'git',
      url: 'https://github.com/user/repo',
    },
  } as Manifest

  mockFromUrlResult = {
    docs: () => 'https://github.com/user/repo#readme',
  }

  const config = {
    positionals: ['some-package'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'some-package',
    url: 'https://example.com/docs',
  })
  t.equal(openedUrl, 'https://example.com/docs')
})

t.test('homepage used when no repository', async t => {
  mockManifest = {
    name: 'homepage-only',
    homepage: 'https://my-docs-site.com',
  } as Manifest

  const config = {
    positionals: ['homepage-only'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'homepage-only',
    url: 'https://my-docs-site.com',
  })
  t.equal(openedUrl, 'https://my-docs-site.com')
})

t.test('repository as string', async t => {
  mockManifest = {
    name: 'test-pkg',
    repository: 'https://github.com/user/repo',
  } as Manifest

  mockFromUrlResult = {
    docs: () => 'https://github.com/user/repo#readme',
  }

  const config = {
    positionals: ['test-pkg'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'test-pkg',
    url: 'https://github.com/user/repo#readme',
  })
})

t.test('git+ prefix stripped from repository url', async t => {
  mockManifest = {
    name: 'test-pkg',
    repository: {
      type: 'git',
      url: 'git+https://github.com/user/repo',
    },
  } as Manifest

  const fromUrlCalls: string[] = []
  mockFromUrlResult = {
    docs: () => 'https://github.com/user/repo#readme',
  }

  const CommandWithTracking = await t.mockImport<
    typeof import('../../src/commands/docs.ts')
  >('../../src/commands/docs.ts', {
    '@vltpkg/url-open': {
      urlOpen: async (url: string) => {
        openedUrl = url
      },
    },
    '@vltpkg/package-info': {
      PackageInfoClient: class {
        async manifest() {
          return mockManifest
        }
      },
    },
    'hosted-git-info': {
      fromUrl: (url: string) => {
        fromUrlCalls.push(url)
        return mockFromUrlResult
      },
    },
  })

  const config = {
    positionals: ['test-pkg'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  await CommandWithTracking.command(config)

  t.strictSame(fromUrlCalls, ['https://github.com/user/repo'])
})

t.test('fallback to vlt.io when no repository', async t => {
  mockManifest = {
    name: 'no-repo-pkg',
  } as Manifest

  const config = {
    positionals: ['no-repo-pkg'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(
    result,
    {
      name: 'no-repo-pkg',
      url: 'https://vlt.io/explore/npm/no-repo-pkg/overview',
    },
    'opens default vlt.io URL',
  )
  t.equal(
    openedUrl,
    'https://vlt.io/explore/npm/no-repo-pkg/overview',
    'opens default vlt.io URL',
  )
})

t.test('fallback to vlt.io when hosted-git-info fails', async t => {
  mockManifest = {
    name: 'unknown-host-pkg',
    repository: 'https://unknown-git-host.com/user/repo',
  } as Manifest

  mockFromUrlResult = null

  const config = {
    positionals: ['unknown-host-pkg'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  const result = await Command.command(config)

  t.strictSame(result, {
    name: 'unknown-host-pkg',
    url: 'https://vlt.io/explore/npm/unknown-host-pkg/overview',
  })
})

t.test('error when no manifest found', async t => {
  mockManifest = undefined

  const config = {
    positionals: ['nonexistent'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  await t.rejects(Command.command(config), {
    message: 'No manifest found',
  })
})

t.test('error when manifest has no name', async t => {
  mockManifest = {} as Manifest

  const config = {
    positionals: ['invalid'],
    get: () => undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        read: () => ({}),
      },
    },
  } as unknown as LoadedConfig

  await t.rejects(Command.command(config), {
    message: 'No package name found',
  })
})

t.test('target option without package.json', async t => {
  const config = {
    positionals: [],
    get: (key: string) =>
      key === 'target' ? ':root > *' : undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        maybeRead: () => undefined,
      },
      monorepo: undefined,
    },
  } as unknown as LoadedConfig

  await t.rejects(Command.command(config), {
    message: 'No package.json found in project root',
  })
})

t.test('views for multiple results', async t => {
  const multipleResults = [
    { name: 'pkg-a', url: 'https://example.com/pkg-a' },
    { name: 'pkg-b', url: 'https://example.com/pkg-b' },
  ]

  const humanOutput = Command.views.human(multipleResults)
  t.equal(
    humanOutput,
    'Multiple package docs found:\n• pkg-a: https://example.com/pkg-a\n• pkg-b: https://example.com/pkg-b',
  )

  const jsonOutput = Command.views.json(multipleResults)
  t.strictSame(jsonOutput, multipleResults)
})

t.test('target option with single result - opens URL', async t => {
  let actualLoadCalled = false
  let querySearchCalled = false

  const mockNode = {
    name: 'test-package',
    manifest: {
      name: 'test-package',
      repository: 'https://github.com/user/repo',
    },
  }

  mockFromUrlResult = {
    docs: () => 'https://github.com/user/repo#readme',
  }

  const graphModule = await import('@vltpkg/graph')

  const CommandWithMocks = await t.mockImport<
    typeof import('../../src/commands/docs.ts')
  >('../../src/commands/docs.ts', {
    '@vltpkg/url-open': {
      urlOpen: async (url: string) => {
        openedUrl = url
      },
    },
    '@vltpkg/graph': {
      ...graphModule,
      actual: {
        load: () => {
          actualLoadCalled = true
          return {
            nodes: new Map([['test-package', mockNode]]),
            edges: new Map(),
            importers: new Map(),
          }
        },
      },
    },
    '@vltpkg/query': {
      Query: class {
        static hasSecuritySelectors() {
          return false
        }
        async search() {
          querySearchCalled = true
          return { nodes: [mockNode] }
        }
      },
    },
    '@vltpkg/security-archive': {
      SecurityArchive: {
        start: async () => undefined,
      },
    },
    'hosted-git-info': {
      fromUrl: () => mockFromUrlResult,
    },
    '../../src/query-host-contexts.ts': {
      createHostContextsMap: async () => new Map(),
    },
  })

  const config = {
    positionals: [],
    get: (key: string) =>
      key === 'target' ? ':root > *' : undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        maybeRead: () => ({ name: 'root-package' }),
      },
      monorepo: undefined,
    },
  } as unknown as LoadedConfig

  const result = await CommandWithMocks.command(config)

  t.ok(actualLoadCalled, 'actual.load should be called')
  t.ok(querySearchCalled, 'query.search should be called')
  t.strictSame(result, {
    name: 'test-package',
    url: 'https://github.com/user/repo#readme',
  })
  t.equal(openedUrl, 'https://github.com/user/repo#readme')
})

t.test(
  'target option with multiple results - returns list',
  async t => {
    const mockNodes = [
      {
        name: 'pkg-a',
        manifest: {
          name: 'pkg-a',
          homepage: 'https://example.com/pkg-a',
        },
      },
      {
        name: 'pkg-b',
        manifest: {
          name: 'pkg-b',
          homepage: 'https://example.com/pkg-b',
        },
      },
    ]

    const graphModule = await import('@vltpkg/graph')

    const CommandWithMocks = await t.mockImport<
      typeof import('../../src/commands/docs.ts')
    >('../../src/commands/docs.ts', {
      '@vltpkg/url-open': {
        urlOpen: async (url: string) => {
          openedUrl = url
        },
      },
      '@vltpkg/graph': {
        ...graphModule,
        actual: {
          load: () => ({
            nodes: new Map(),
            edges: new Map(),
            importers: new Map(),
          }),
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors() {
            return false
          }
          async search() {
            return { nodes: mockNodes }
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async () => undefined,
        },
      },
      'hosted-git-info': {
        fromUrl: () => null,
      },
      '../../src/query-host-contexts.ts': {
        createHostContextsMap: async () => new Map(),
      },
    })

    const config = {
      positionals: [],
      get: (key: string) =>
        key === 'target' ? ':root > *' : undefined,
      options: {
        projectRoot: '/test/project',
        packageJson: {
          maybeRead: () => ({ name: 'root-package' }),
        },
        monorepo: undefined,
      },
    } as unknown as LoadedConfig

    const result = await CommandWithMocks.command(config)

    t.strictSame(result, [
      { name: 'pkg-a', url: 'https://example.com/pkg-a' },
      { name: 'pkg-b', url: 'https://example.com/pkg-b' },
    ])
    t.equal(
      openedUrl,
      undefined,
      'should not open URL for multiple results',
    )
  },
)

t.test('target option with no results - throws error', async t => {
  const graphModule = await import('@vltpkg/graph')

  const CommandWithMocks = await t.mockImport<
    typeof import('../../src/commands/docs.ts')
  >('../../src/commands/docs.ts', {
    '@vltpkg/graph': {
      ...graphModule,
      actual: {
        load: () => ({
          nodes: new Map(),
          edges: new Map(),
          importers: new Map(),
        }),
      },
    },
    '@vltpkg/query': {
      Query: class {
        static hasSecuritySelectors() {
          return false
        }
        async search() {
          return { nodes: [] }
        }
      },
    },
    '@vltpkg/security-archive': {
      SecurityArchive: {
        start: async () => undefined,
      },
    },
    '../../src/query-host-contexts.ts': {
      createHostContextsMap: async () => new Map(),
    },
  })

  const config = {
    positionals: [],
    get: (key: string) =>
      key === 'target' ? ':root > .missing' : undefined,
    options: {
      projectRoot: '/test/project',
      packageJson: {
        maybeRead: () => ({ name: 'root-package' }),
      },
      monorepo: undefined,
    },
  } as unknown as LoadedConfig

  await t.rejects(CommandWithMocks.command(config), {
    message: 'No packages found matching target query',
  })
})

t.test(
  'target option with node without manifest - skips',
  async t => {
    const mockNodeWithManifest = {
      name: 'pkg-with-manifest',
      manifest: {
        name: 'pkg-with-manifest',
        homepage: 'https://example.com/good',
      },
    }

    const mockNodeWithoutManifest = {
      name: 'pkg-without-manifest',
      manifest: undefined,
    }

    const graphModule = await import('@vltpkg/graph')

    const CommandWithMocks = await t.mockImport<
      typeof import('../../src/commands/docs.ts')
    >('../../src/commands/docs.ts', {
      '@vltpkg/url-open': {
        urlOpen: async (url: string) => {
          openedUrl = url
        },
      },
      '@vltpkg/graph': {
        ...graphModule,
        actual: {
          load: () => ({
            nodes: new Map(),
            edges: new Map(),
            importers: new Map(),
          }),
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors() {
            return false
          }
          async search() {
            return {
              nodes: [mockNodeWithoutManifest, mockNodeWithManifest],
            }
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async () => undefined,
        },
      },
      'hosted-git-info': {
        fromUrl: () => null,
      },
      '../../src/query-host-contexts.ts': {
        createHostContextsMap: async () => new Map(),
      },
    })

    const config = {
      positionals: [],
      get: (key: string) =>
        key === 'target' ? ':root > *' : undefined,
      options: {
        projectRoot: '/test/project',
        packageJson: {
          maybeRead: () => ({ name: 'root-package' }),
        },
        monorepo: undefined,
      },
    } as unknown as LoadedConfig

    const result = await CommandWithMocks.command(config)

    t.strictSame(result, {
      name: 'pkg-with-manifest',
      url: 'https://example.com/good',
    })
    t.equal(openedUrl, 'https://example.com/good')
  },
)

t.test(
  'target option with security selectors - initializes SecurityArchive',
  async t => {
    let securityArchiveStartCalled = false
    let securityArchivePassedToQuery: any = undefined
    const mockSecurityArchive = { ok: true }

    const mockNode = {
      name: 'test-package',
      manifest: {
        name: 'test-package',
        homepage: 'https://example.com',
      },
    }

    const graphModule = await import('@vltpkg/graph')

    const CommandWithMocks = await t.mockImport<
      typeof import('../../src/commands/docs.ts')
    >('../../src/commands/docs.ts', {
      '@vltpkg/url-open': {
        urlOpen: async (url: string) => {
          openedUrl = url
        },
      },
      '@vltpkg/graph': {
        ...graphModule,
        actual: {
          load: () => ({
            nodes: new Map([['test-package', mockNode]]),
            edges: new Map(),
            importers: new Map(),
          }),
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors(query: string) {
            return query.includes(':vuln')
          }
          constructor(options: any) {
            securityArchivePassedToQuery = options.securityArchive
          }
          async search() {
            return { nodes: [mockNode] }
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async (options: any) => {
            securityArchiveStartCalled = true
            t.ok(options.nodes, 'start called with nodes')
            return mockSecurityArchive
          },
        },
      },
      'hosted-git-info': {
        fromUrl: () => null,
      },
      '../../src/query-host-contexts.ts': {
        createHostContextsMap: async () => new Map(),
      },
    })

    const config = {
      positionals: [],
      get: (key: string) => (key === 'target' ? '*:vuln' : undefined),
      options: {
        projectRoot: '/test/project',
        packageJson: {
          maybeRead: () => ({ name: 'root-package' }),
        },
        monorepo: undefined,
      },
    } as unknown as LoadedConfig

    const result = await CommandWithMocks.command(config)

    t.ok(
      securityArchiveStartCalled,
      'SecurityArchive.start should be called',
    )
    t.equal(
      securityArchivePassedToQuery,
      mockSecurityArchive,
      'securityArchive should be passed to Query',
    )
    t.strictSame(result, {
      name: 'test-package',
      url: 'https://example.com',
    })
  },
)

t.test(
  'target option without security selectors - skips SecurityArchive',
  async t => {
    let securityArchiveStartCalled = false

    const mockNode = {
      name: 'test-package',
      manifest: {
        name: 'test-package',
        homepage: 'https://example.com',
      },
    }

    const graphModule = await import('@vltpkg/graph')

    const CommandWithMocks = await t.mockImport<
      typeof import('../../src/commands/docs.ts')
    >('../../src/commands/docs.ts', {
      '@vltpkg/url-open': {
        urlOpen: async (url: string) => {
          openedUrl = url
        },
      },
      '@vltpkg/graph': {
        ...graphModule,
        actual: {
          load: () => ({
            nodes: new Map([['test-package', mockNode]]),
            edges: new Map(),
            importers: new Map(),
          }),
        },
      },
      '@vltpkg/query': {
        Query: class {
          static hasSecuritySelectors() {
            return false
          }
          async search() {
            return { nodes: [mockNode] }
          }
        },
      },
      '@vltpkg/security-archive': {
        SecurityArchive: {
          start: async () => {
            securityArchiveStartCalled = true
            return undefined
          },
        },
      },
      'hosted-git-info': {
        fromUrl: () => null,
      },
      '../../src/query-host-contexts.ts': {
        createHostContextsMap: async () => new Map(),
      },
    })

    const config = {
      positionals: [],
      get: (key: string) =>
        key === 'target' ? ':root > *' : undefined,
      options: {
        projectRoot: '/test/project',
        packageJson: {
          maybeRead: () => ({ name: 'root-package' }),
        },
        monorepo: undefined,
      },
    } as unknown as LoadedConfig

    await CommandWithMocks.command(config)

    t.notOk(
      securityArchiveStartCalled,
      'SecurityArchive.start should not be called',
    )
  },
)
