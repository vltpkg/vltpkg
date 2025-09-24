import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Node } from '@vltpkg/graph'

let buildCalled = false
let buildOptions: any = null
let skipCalled = false
let skipOptions: any = null
let actualLoadCalled = false
let _actualLoadOptions: any = null
let queryCalled = false
let _queryOptions: any = null
let mockError: Error | null = null

// Reset state before each test
t.beforeEach(() => {
  buildCalled = false
  buildOptions = null
  skipCalled = false
  skipOptions = null
  actualLoadCalled = false
  _actualLoadOptions = null
  queryCalled = false
  _queryOptions = null
  mockError = null
})

const mockGraph = {
  nodes: new Map([['dep1', { id: 'dep1' }]]),
  edges: new Set(),
  importers: new Set(),
}

const Command = await t.mockImport<
  typeof import('../../src/commands/build.ts')
>('../../src/commands/build.ts', {
  '@vltpkg/graph': {
    build: async (options: any) => {
      buildCalled = true
      buildOptions = options
      if (mockError) throw mockError
    },
    skip: async (options: any) => {
      skipCalled = true
      skipOptions = options
      if (mockError) throw mockError
    },
    actual: {
      load: (options: any) => {
        actualLoadCalled = true
        _actualLoadOptions = options
        return mockGraph
      },
    },
    GraphModifier: {
      maybeLoad: () => null,
    },
    // Common graph exports that other modules may import
    asDependency: (obj: unknown) => obj,
    install: async () => ({ graph: mockGraph, buildQueue: [] }),
    uninstall: async () => ({ graph: mockGraph }),
    update: async () => ({ graph: mockGraph, buildQueue: [] }),
    createVirtualRoot: () => ({
      name: 'virtual-root',
      version: '0.0.0',
    }),
    reify: async () => ({
      diff: { nodes: new Map(), edges: new Map() },
      buildQueue: [],
    }),
    lockfile: {
      load: () => mockGraph,
      save: () => {},
      loadEdges: () => new Set(),
      loadNodes: () => new Map(),
    },
    ideal: {
      build: () => mockGraph,
    },
    Graph: class MockGraph {
      nodes = new Map()
    },
    Node: class MockNode {
      id = 'mock-node'
    },
    Edge: class MockEdge {
      spec = null
    },
    Diff: class MockDiff {
      nodes = new Map()
    },
  },
  '@vltpkg/query': {
    Query: class MockQuery {
      constructor(options: any) {
        _queryOptions = options
      }
      static hasSecuritySelectors = () => false
      async search() {
        queryCalled = true
        return { nodes: [{ id: 'dep1' }] }
      }
    },
  },
  '@vltpkg/security-archive': {
    SecurityArchive: {
      start: () => undefined,
    },
  },
  '../query-host-contexts.ts': {
    createHostContextsMap: async () => ({}),
  },
})

const makeTestConfig = (
  options = {},
  values = {},
  positionals: string[] = [],
): LoadedConfig =>
  ({
    projectRoot: '/test/project',
    options: {
      packageJson: {},
      monorepo: null,
      scurry: {
        cwd: {
          resolve: (path: string) => ({ fullpath: () => path }),
        },
        lstat: async (path: string) => ({
          isDirectory: () => true,
          fullpath: () => path,
        }),
      },
      ...options,
    },
    values,
    positionals,
    get: (key: string) => (values as any)[key],
  }) as unknown as LoadedConfig

t.test('usage', async t => {
  t.matchSnapshot(
    Command.usage().usage(),
    'should return usage information',
  )
})

t.test('views', async t => {
  t.test('human view - build', async t => {
    const config = makeTestConfig()
    const output = Command.views.human({}, {}, config)
    t.matchSnapshot(
      output,
      'should return human-readable success message for build',
    )
  })

  t.test('json view - build', async t => {
    const config = makeTestConfig()
    const output = Command.views.json({}, {}, config)
    t.matchSnapshot(
      output,
      'should return json success object for build',
    )
  })

  t.test('human view - skip', async t => {
    const config = makeTestConfig({}, {}, ['skip'])
    const output = Command.views.human({}, {}, config)
    t.matchSnapshot(
      output,
      'should return human-readable success message for skip',
    )
  })

  t.test('json view - skip', async t => {
    const config = makeTestConfig({}, {}, ['skip'])
    const output = Command.views.json({}, {}, config)
    t.matchSnapshot(
      output,
      'should return json success object for skip',
    )
  })
})

t.test('command execution', async t => {
  t.test('successful build', async t => {
    const config = makeTestConfig({
      packageJson: { name: 'test-package' },
      monorepo: { name: 'test-mono' },
      scurry: { name: 'test-scurry' },
    })

    const result = await Command.command(config)

    t.ok(buildCalled, 'should call build function')
    t.strictSame(
      result,
      { success: true },
      'should return success result',
    )
    t.strictSame(
      buildOptions,
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
        projectRoot: '/test/project',
        queryFilteredNodes: undefined,
      },
      'should pass correct options to build function',
    )

    // Test views with the actual result
    t.matchSnapshot(
      Command.views.human({}, {}, config),
      'should format human output for successful build',
    )
    t.matchSnapshot(
      Command.views.json({}, {}, config),
      'should format json output for successful build',
    )
  })

  t.test('build fails with GRAPHRUN_TRAVERSAL error', async t => {
    const mockNode = {
      name: 'failing-package',
      version: '1.2.3',
    } as Node

    const graphRunError = Object.assign(
      new Error('Graph traversal failed'),
      {
        code: 'GRAPHRUN_TRAVERSAL',
        node: mockNode,
        cause: new Error('Inner error'),
      },
    )

    const buildError = Object.assign(
      new Error('Build process failed'),
      {
        cause: graphRunError,
      },
    )

    mockError = buildError

    const config = makeTestConfig()

    await t.rejects(
      Command.command(config),
      {
        message:
          'Build failed:\n  Failed to build package: failing-package@1.2.3',
        cause: {
          cause: buildError,
        },
      },
      'should throw error with specific package information',
    )
  })

  t.test('build fails with generic error', async t => {
    const buildError = new Error('Generic build failure')
    mockError = buildError

    const config = makeTestConfig()

    await t.rejects(
      Command.command(config),
      {
        message: 'Build failed',
        cause: {
          cause: buildError,
        },
      },
      'should throw generic build failed error',
    )
  })

  t.test('build fails with nested error without node', async t => {
    const innerError = Object.assign(new Error('Some other error'), {
      code: 'SOME_OTHER_ERROR',
    })

    const buildError = Object.assign(
      new Error('Build process failed'),
      {
        cause: innerError,
      },
    )

    mockError = buildError

    const config = makeTestConfig()

    await t.rejects(
      Command.command(config),
      {
        message: 'Build failed',
        cause: {
          cause: buildError,
        },
      },
      'should throw generic build failed error for non-GRAPHRUN_TRAVERSAL errors',
    )
  })

  t.test(
    'build fails with malformed GRAPHRUN_TRAVERSAL error',
    async t => {
      const graphRunError = Object.assign(
        new Error('Graph traversal failed'),
        {
          code: 'GRAPHRUN_TRAVERSAL',
          // Missing node property
        },
      )

      const buildError = Object.assign(
        new Error('Build process failed'),
        {
          cause: graphRunError,
        },
      )

      mockError = buildError

      const config = makeTestConfig()

      await t.rejects(
        Command.command(config),
        {
          message: 'Build failed',
          cause: {
            cause: buildError,
          },
        },
        'should throw generic error for malformed GRAPHRUN_TRAVERSAL error',
      )
    },
  )

  t.test('build with --scope option', async t => {
    const config = makeTestConfig(
      {
        packageJson: {
          maybeRead: () => ({ name: 'test-package' }),
        },
      },
      { scope: '#dep1' },
    )

    const result = await Command.command(config)

    t.ok(buildCalled, 'should call build function')
    t.ok(
      actualLoadCalled,
      'should load actual graph for scope filtering',
    )
    t.ok(queryCalled, 'should execute query search')
    t.strictSame(
      result,
      { success: true },
      'should return success result',
    )
    t.ok(
      buildOptions.queryFilteredNodes,
      'should pass queryFilteredNodes to build',
    )
    t.strictSame(
      buildOptions.queryFilteredNodes,
      ['dep1'],
      'should pass filtered node IDs',
    )
  })

  t.test('skip subcommand', async t => {
    const config = makeTestConfig(
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
      },
      {},
      ['skip'],
    )

    const result = await Command.command(config)

    t.ok(skipCalled, 'should call skip function')
    t.strictSame(
      result,
      { success: true },
      'should return success result',
    )
    t.strictSame(
      skipOptions,
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
        projectRoot: '/test/project',
        queryFilteredNodes: undefined,
      },
      'should pass correct options to skip function',
    )
  })

  t.test('skip subcommand with --scope option', async t => {
    const config = makeTestConfig(
      {
        packageJson: {
          maybeRead: () => ({ name: 'test-package' }),
        },
      },
      { scope: '#dep1' },
      ['skip'],
    )

    const result = await Command.command(config)

    t.ok(skipCalled, 'should call skip function')
    t.ok(queryCalled, 'should execute query search')
    t.strictSame(
      result,
      { success: true },
      'should return success result',
    )
    t.ok(
      skipOptions.queryFilteredNodes,
      'should pass queryFilteredNodes to skip',
    )
    t.strictSame(
      skipOptions.queryFilteredNodes,
      ['dep1'],
      'should pass filtered node IDs',
    )
  })

  t.test('skip fails with error', async t => {
    const skipError = new Error('Skip failure')
    mockError = skipError

    const config = makeTestConfig({}, {}, ['skip'])

    await t.rejects(
      Command.command(config),
      {
        message: 'Skip failed',
        cause: {
          cause: skipError,
        },
      },
      'should throw skip failed error',
    )
  })
})
