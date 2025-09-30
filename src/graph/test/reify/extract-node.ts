import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { Spec } from '@vltpkg/spec'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'
import type { Node } from '../../src/node.ts'
import { extractNode } from '../../src/reify/extract-node.ts'

const removed: string[] = []
const mockRemover = {
  rm: async (path: string) => {
    removed.push(path)
  },
} as unknown as RollbackRemove

const extracted: [Spec, string, any][] = []
const mockPackageInfo = {
  extract: async (spec: Spec, target: string, options: any) => {
    if (spec.name === 'failer') {
      throw new Error('failer fails to extract')
    }
    extracted.push([spec, target, options])
    return { extracted: true }
  },
} as unknown as PackageInfoClient

t.beforeEach(() => {
  removed.length = 0
  extracted.length = 0
})

const mockNode = (props: Record<string, any>) =>
  ({
    ...props,
    resolvedLocation: (scurry: PathScurry) =>
      scurry.cwd.resolve(props.location).fullpath(),
    isOptional: () => props.optional ?? false,
  }) as unknown as Node

const mockDiff = {
  to: {
    removeNode: () => {},
  },
  nodes: {
    delete: new Set<any>([]),
    add: new Set<any>([]),
  },
  hadOptionalFailures: false,
} as unknown as Diff

t.test('successfully extract a node', async t => {
  const node = mockNode({
    id: joinDepIDTuple(['registry', '', 'foo@1.2.3']),
    location:
      './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
      '/node_modules/foo',
    name: 'foo',
    manifest: { name: 'foo', version: '1.2.3' },
    integrity: 'sha512-abc123',
    resolved: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
  })

  const scurry = new PathScurry(t.testdirName)
  const result = await extractNode(
    node,
    scurry,
    mockRemover,
    {},
    mockPackageInfo,
    mockDiff,
  )

  t.strictSame(
    result,
    { success: true, node },
    'extraction successful',
  )

  t.strictSame(
    removed,
    [
      resolve(
        t.testdirName,
        'node_modules/.vlt/' +
          joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
          '/node_modules/foo',
      ),
    ],
    'target directory removed',
  )

  t.equal(extracted.length, 1, 'package extracted')
  const [spec, _target, options] = extracted[0]!
  t.equal(spec.name, 'foo', 'correct spec name')
  t.equal(spec.bareSpec, '1.2.3', 'correct spec version')
  t.equal(options.integrity, 'sha512-abc123', 'integrity passed')
  t.equal(
    options.resolved,
    'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
    'resolved passed',
  )
})

t.test('handle extraction failure for optional node', async t => {
  const node = mockNode({
    id: joinDepIDTuple(['registry', '', 'failer@1.2.3']),
    location:
      './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'failer@1.2.3']) +
      '/node_modules/failer',
    name: 'failer',
    manifest: { name: 'failer', version: '1.2.3' },
    edgesIn: new Set(),
    optional: true,
  })

  const scurry = new PathScurry(t.testdirName)
  const result = await extractNode(
    node,
    scurry,
    mockRemover,
    {},
    mockPackageInfo,
    mockDiff,
  )

  t.equal(result.success, false, 'extraction failed')
  t.equal(result.node, node, 'node returned in result')
  if (!result.success) {
    t.ok(result.error, 'error included in result')
    t.match(
      result.error,
      /failer fails to extract/,
      'correct error message',
    )
  }

  t.match(
    mockDiff.nodes.delete,
    new Set([
      { id: joinDepIDTuple(['registry', '', 'failer@1.2.3']) },
    ]),
    'failer scheduled for deletion',
  )
})

t.test('skip deprecated optional package', async t => {
  const node = mockNode({
    id: joinDepIDTuple(['registry', '', 'deprecated@1.2.3']),
    location:
      './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'deprecated@1.2.3']) +
      '/node_modules/deprecated',
    name: 'deprecated',
    manifest: {
      name: 'deprecated',
      version: '1.2.3',
      deprecated: 'do not use this',
    },
    edgesIn: new Set(),
    optional: true,
  })

  const scurry = new PathScurry(t.testdirName)
  const result = await extractNode(
    node,
    scurry,
    mockRemover,
    {},
    mockPackageInfo,
    mockDiff,
  )

  t.equal(result.success, false, 'extraction skipped')
  if (!result.success) {
    t.match(
      result.error,
      /Platform check failed or package deprecated/,
      'correct error message',
    )
  }
  t.equal(extracted.length, 0, 'no extraction attempted')
  t.match(
    mockDiff.nodes.delete,
    new Set([
      { id: joinDepIDTuple(['registry', '', 'deprecated@1.2.3']) },
    ]),
    'deprecated node scheduled for deletion',
  )
})

t.test('skip incompatible platform for optional package', async t => {
  const node = mockNode({
    id: joinDepIDTuple(['registry', '', 'incompatible@1.2.3']),
    location:
      './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'incompatible@1.2.3']) +
      '/node_modules/incompatible',
    name: 'incompatible',
    manifest: {
      name: 'incompatible',
      version: '1.2.3',
      engines: { node: '1.x' },
    },
    edgesIn: new Set(),
    optional: true,
  })

  const scurry = new PathScurry(t.testdirName)
  const result = await extractNode(
    node,
    scurry,
    mockRemover,
    {},
    mockPackageInfo,
    mockDiff,
  )

  t.equal(result.success, false, 'extraction skipped')
  if (!result.success) {
    t.match(
      result.error,
      /Platform check failed or package deprecated/,
      'correct error message',
    )
  }
  t.equal(extracted.length, 0, 'no extraction attempted')
})

t.test(
  'throw error for non-optional node extraction failure',
  async t => {
    const node = mockNode({
      id: joinDepIDTuple(['registry', '', 'failer@1.2.3']),
      location:
        './node_modules/.vlt/' +
        joinDepIDTuple(['registry', '', 'failer@1.2.3']) +
        '/node_modules/failer',
      name: 'failer',
      manifest: { name: 'failer', version: '1.2.3' },
      optional: false,
    })

    const scurry = new PathScurry(t.testdirName)

    await t.rejects(
      extractNode(
        node,
        scurry,
        mockRemover,
        {},
        mockPackageInfo,
        mockDiff,
      ),
      /failer fails to extract/,
      'should throw error for non-optional package',
    )
  },
)

t.test('use platform data from node when available', async t => {
  const node = mockNode({
    id: joinDepIDTuple(['registry', '', 'platform-test@1.2.3']),
    location:
      './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'platform-test@1.2.3']) +
      '/node_modules/platform-test',
    name: 'platform-test',
    manifest: {
      name: 'platform-test',
      version: '1.2.3',
    },
    platform: {
      engines: { node: '>=14' },
      os: ['darwin', 'linux'],
    },
    optional: true,
  })

  const scurry = new PathScurry(t.testdirName)
  const result = await extractNode(
    node,
    scurry,
    mockRemover,
    {},
    mockPackageInfo,
    mockDiff,
  )

  // Should succeed since current node version is likely >= 14
  t.equal(
    result.success,
    true,
    'extraction successful with platform data',
  )
})

t.test('extract node without diff object', async t => {
  t.test('successfully extract a node without diff', async t => {
    const node = mockNode({
      id: joinDepIDTuple(['registry', '', 'no-diff@1.2.3']),
      location:
        './node_modules/.vlt/' +
        joinDepIDTuple(['registry', '', 'no-diff@1.2.3']) +
        '/node_modules/no-diff',
      name: 'no-diff',
      manifest: { name: 'no-diff', version: '1.2.3' },
      integrity: 'sha512-xyz789',
      resolved:
        'https://registry.npmjs.org/no-diff/-/no-diff-1.2.3.tgz',
    })

    const scurry = new PathScurry(t.testdirName)
    const result = await extractNode(
      node,
      scurry,
      mockRemover,
      {},
      mockPackageInfo,
      undefined, // No diff provided
    )

    t.strictSame(
      result,
      { success: true, node },
      'extraction successful without diff',
    )
    t.equal(extracted.length, 1, 'package extracted')
  })

  t.test(
    'handle extraction failure for optional node without diff',
    async t => {
      // Create a mock graph that the node belongs to
      const mockGraph = {
        nodes: new Map(),
        removeNode: () => {},
      }

      const node = mockNode({
        id: joinDepIDTuple(['registry', '', 'failer@1.2.3']),
        location:
          './node_modules/.vlt/' +
          joinDepIDTuple(['registry', '', 'failer@1.2.3']) +
          '/node_modules/failer',
        name: 'failer',
        manifest: { name: 'failer', version: '1.2.3' },
        edgesIn: new Set(),
        optional: true,
        graph: mockGraph,
      })

      const scurry = new PathScurry(t.testdirName)
      const result = await extractNode(
        node,
        scurry,
        mockRemover,
        {},
        mockPackageInfo,
        undefined, // No diff provided
      )

      t.equal(result.success, false, 'extraction failed')
      t.equal(result.node, node, 'node returned in result')
      if (!result.success) {
        t.ok(result.error, 'error included in result')
        t.match(
          result.error,
          /failer fails to extract/,
          'correct error message',
        )
      }
    },
  )

  t.test(
    'throw error for non-optional node extraction failure without diff',
    async t => {
      const mockGraph = {
        nodes: new Map(),
        removeNode: () => {},
      }

      const node = mockNode({
        id: joinDepIDTuple(['registry', '', 'failer@1.2.3']),
        location:
          './node_modules/.vlt/' +
          joinDepIDTuple(['registry', '', 'failer@1.2.3']) +
          '/node_modules/failer',
        name: 'failer',
        manifest: { name: 'failer', version: '1.2.3' },
        optional: false,
        graph: mockGraph,
      })

      const scurry = new PathScurry(t.testdirName)

      await t.rejects(
        extractNode(
          node,
          scurry,
          mockRemover,
          {},
          mockPackageInfo,
          undefined, // No diff provided
        ),
        /failer fails to extract/,
        'should throw error for non-optional package without diff',
      )
    },
  )

  t.test('skip deprecated optional package without diff', async t => {
    const mockGraph = {
      nodes: new Map(),
      removeNode: () => {},
    }

    const node = mockNode({
      id: joinDepIDTuple(['registry', '', 'deprecated@1.2.3']),
      location:
        './node_modules/.vlt/' +
        joinDepIDTuple(['registry', '', 'deprecated@1.2.3']) +
        '/node_modules/deprecated',
      name: 'deprecated',
      manifest: {
        name: 'deprecated',
        version: '1.2.3',
        deprecated: 'do not use this',
      },
      edgesIn: new Set(),
      optional: true,
      graph: mockGraph,
    })

    const scurry = new PathScurry(t.testdirName)
    const result = await extractNode(
      node,
      scurry,
      mockRemover,
      {},
      mockPackageInfo,
      undefined, // No diff provided
    )

    t.equal(result.success, false, 'extraction skipped')
    if (!result.success) {
      t.match(
        result.error,
        /Platform check failed or package deprecated/,
        'correct error message',
      )
    }
    t.equal(extracted.length, 0, 'no extraction attempted')
  })

  t.test(
    'skip incompatible platform for optional package without diff',
    async t => {
      const mockGraph = {
        nodes: new Map(),
        removeNode: () => {},
      }

      const node = mockNode({
        id: joinDepIDTuple(['registry', '', 'incompatible@1.2.3']),
        location:
          './node_modules/.vlt/' +
          joinDepIDTuple(['registry', '', 'incompatible@1.2.3']) +
          '/node_modules/incompatible',
        name: 'incompatible',
        manifest: {
          name: 'incompatible',
          version: '1.2.3',
          engines: { node: '1.x' },
        },
        edgesIn: new Set(),
        optional: true,
        graph: mockGraph,
      })

      const scurry = new PathScurry(t.testdirName)
      const result = await extractNode(
        node,
        scurry,
        mockRemover,
        {},
        mockPackageInfo,
        undefined, // No diff provided
      )

      t.equal(result.success, false, 'extraction skipped')
      if (!result.success) {
        t.match(
          result.error,
          /Platform check failed or package deprecated/,
          'correct error message',
        )
      }
      t.equal(extracted.length, 0, 'no extraction attempted')
    },
  )
})
