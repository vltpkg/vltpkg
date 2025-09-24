import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Node } from '@vltpkg/graph'

let buildCalled = false
let buildOptions: any = null
let mockError: Error | null = null

// Reset state before each test
t.beforeEach(() => {
  buildCalled = false
  buildOptions = null
  mockError = null
})

const Command = await t.mockImport<
  typeof import('../../src/commands/build.ts')
>('../../src/commands/build.ts', {
  '@vltpkg/graph': {
    build: async (options: any) => {
      buildCalled = true
      buildOptions = options
      if (mockError) throw mockError
      return { success: [], failure: [] }
    },
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
  const mockResult = {
    success: [
      { id: 'node1', name: 'package1', version: '1.0.0' },
      { id: 'node2', name: 'package2', version: '2.0.0' },
    ],
    failure: [],
  } as any

  t.test('human view - build', async t => {
    const output = Command.views.human(mockResult)
    t.matchSnapshot(
      output,
      'should return human-readable success message for build',
    )
  })

  t.test('json view - build', async t => {
    const output = Command.views.json(mockResult)
    t.matchSnapshot(
      output,
      'should return json success object for build',
    )
  })

  t.test('human view - with failures', async t => {
    const resultWithFailures = {
      success: [{ id: 'node1', name: 'package1', version: '1.0.0' }],
      failure: [
        { id: 'node2', name: 'optional-pkg', version: '1.0.0' },
      ],
    } as any
    const output = Command.views.human(resultWithFailures)
    t.matchSnapshot(
      output,
      'should show both success and failure messages',
    )
  })

  t.test('json view - with failures', async t => {
    const resultWithFailures = {
      success: [{ id: 'node1', name: 'package1', version: '1.0.0' }],
      failure: [
        { id: 'node2', name: 'optional-pkg', version: '1.0.0' },
      ],
    } as any
    const output = Command.views.json(resultWithFailures)
    t.matchSnapshot(
      output,
      'should show both success and failure json message',
    )
  })

  t.test('human view - no packages built', async t => {
    const emptyResult = { success: [], failure: [] } as any
    const output = Command.views.human(emptyResult)
    t.matchSnapshot(output, 'should show no packages message')
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
    t.ok(result, 'should return result object')
    t.ok('success' in result, 'should have success array')
    t.ok('failure' in result, 'should have failure array')
    t.strictSame(
      buildOptions,
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
        projectRoot: '/test/project',
        target: ':scripts:not(:built):not(:malware)',
      },
      'should pass correct options to build function',
    )

    // Test views with the actual result
    t.matchSnapshot(
      Command.views.human(result),
      'should format human output for successful build',
    )
    t.matchSnapshot(
      Command.views.json(result),
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

  t.test('build with --target option', async t => {
    const config = makeTestConfig(
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
      },
      { target: '#dep1' },
    )

    const result = await Command.command(config)

    t.ok(buildCalled, 'should call build function')
    t.ok(result, 'should return result object')
    t.ok('success' in result, 'should have success array')
    t.ok('failure' in result, 'should have failure array')
    t.equal(
      buildOptions.target,
      '#dep1',
      'should pass target to build function',
    )
  })

  t.test('build with positional query', async t => {
    const config = makeTestConfig(
      {
        packageJson: { name: 'test-package' },
        monorepo: { name: 'test-mono' },
        scurry: { name: 'test-scurry' },
      },
      {},
      ['#my-package'],
    )

    const result = await Command.command(config)

    t.ok(buildCalled, 'should call build function')
    t.ok(result, 'should return result object')
    t.ok('success' in result, 'should have success array')
    t.ok('failure' in result, 'should have failure array')
    t.equal(
      buildOptions.target,
      '#my-package',
      'should use positional as target',
    )
  })

  t.test(
    'build with --target option overrides positional',
    async t => {
      const config = makeTestConfig(
        {
          packageJson: { name: 'test-package' },
          monorepo: { name: 'test-mono' },
          scurry: { name: 'test-scurry' },
        },
        { target: '#from-option' },
        ['#from-positional'],
      )

      const result = await Command.command(config)

      t.ok(buildCalled, 'should call build function')
      t.ok(result, 'should return result object')
      t.ok('success' in result, 'should have success array')
      t.ok('failure' in result, 'should have failure array')
      t.equal(
        buildOptions.target,
        '#from-option',
        'should prefer --target option over positional',
      )
    },
  )

  t.end()
})
