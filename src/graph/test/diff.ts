import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import { inspect } from 'node:util'
import { Diff } from '../src/diff.ts'
import type {
  Graph,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileNode,
} from '../src/index.ts'
import { loadObject } from '../src/lockfile/load.ts'

const edgeKey = (from: DepIDTuple, to: string): LockfileEdgeKey =>
  (joinDepIDTuple(from) + ' ' + to) as LockfileEdgeKey

t.test('graphs must have same projectRoot', t => {
  const a = { projectRoot: '/some/path' } as unknown as Graph
  const b = { projectRoot: '/other/path' } as unknown as Graph
  t.throws(() => new Diff(a, b), {
    message: 'projectRoot mismatch in Graph diff',
  })
  t.end()
})

t.test('diff two graphs', async t => {
  const projectRoot = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
    packages: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
          dependencies: {
            c: '^1.0.0',
          },
        }),
      },
    },
  })

  // foo: no changes
  // a: in graphA, not in graphB
  // b: in graphB, not in graphA
  // bar: edge changes
  // baz: change version

  const graphA = loadObject(
    {
      projectRoot,
      mainManifest: {
        name: 'foo',
        version: '1.2.3',
      },
    },
    {
      lockfileVersion: 1,
      options: {
        registries: {
          npm: 'https://registry.npmjs.org/',
          custom: 'https://registry.example.com',
        },
      },
      nodes: {
        [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
          0,
          'foo',
          'sha512-foofoofoo==',
          null,
          './node_modules/.pnpm/foo@1.0.0/node_modules/foo',
        ],
        [joinDepIDTuple(['registry', '', 'a@1.0.0'])]: [
          0,
          'foo',
          'sha512-aaaaaaaaa==',
        ],
        [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
          0,
          'bar',
          'sha512-barbarbar==',
          'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        ],
        [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
          0,
          'baz',
          'sha512-bazbazbaz==',
          'https://registry.example.com/baz/-/baz-1.0.0.tgz',
        ],
      } as Record<DepID, LockfileNode>,
      edges: {
        [edgeKey(['file', '.'], 'foo')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        [edgeKey(['file', '.'], 'a')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'a@1.0.0']),
        [edgeKey(['file', '.'], 'bar')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'bar@1.0.0']),
        [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'baz@1.0.0']),
      } as LockfileEdges,
    },
  )

  const graphB = loadObject(
    {
      projectRoot,
      mainManifest: {
        name: 'foo',
        version: '1.2.3',
      },
    },
    {
      lockfileVersion: 1,
      options: {
        registries: {
          npm: 'https://registry.npmjs.org/',
          custom: 'https://registry.example.com',
        },
      },
      nodes: {
        [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
          0,
          'foo',
          'sha512-foofoofoo==',
        ],
        [joinDepIDTuple(['registry', '', 'b@1.0.0'])]: [
          0,
          'foo',
          'sha512-bbbbbbbbb==',
        ],
        [joinDepIDTuple(['registry', '', 'c@1.0.0'])]: [
          0,
          'foo',
          'sha512-ccccccccc==',
        ],
        [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
          0,
          'bar',
          'sha512-barbarbar==',
          'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        ],
        [joinDepIDTuple(['registry', '', 'baz@1.0.1'])]: [
          0,
          'baz',
          'sha512-baz101baz101baz101==',
          'https://registry.example.com/baz/-/baz-1.0.1.tgz',
        ],
        [joinDepIDTuple(['registry', '', 'ooo@1.0.1'])]: [
          0,
          'ooo',
          'sha512-ooo420ooo420ooo420==',
          'https://registry.example.com/ooo/-/ooo-1.0.1.tgz',
        ],
      } as Record<DepID, LockfileNode>,
      edges: {
        [edgeKey(['file', '.'], 'foo')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        [edgeKey(['file', '.'], 'b')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'b@1.0.0']),
        [edgeKey(['registry', '', 'b@1.0.0'], 'c')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'c@1.0.0']),
        [edgeKey(['file', '.'], 'bar')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'bar@1.0.0']),
        [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
          'prod ^1.0.1 ' +
          joinDepIDTuple(['registry', '', 'baz@1.0.1']),
        [edgeKey(['registry', '', 'bar@1.0.0'], 'ooo')]:
          'optional ^1.0.1 ' +
          joinDepIDTuple(['registry', '', 'ooo@1.0.1']),
      } as LockfileEdges,
    },
  )

  const diff = new Diff(graphA, graphB)
  t.matchSnapshot(inspect(diff, { colors: true }), 'diff with color')
  t.matchSnapshot(inspect(diff, { colors: false }), 'diff no color')
})

t.test('hasChanges method', async t => {
  const projectRoot = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
  })

  // Test 1: No changes - identical graphs should return false
  t.test('returns false when graphs are identical', t => {
    const graphData = {
      lockfileVersion: 1,
      options: {
        registries: {
          npm: 'https://registry.npmjs.org/',
        },
      },
      nodes: {
        [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
          0,
          'foo',
          'sha512-foofoofoo==',
        ],
      } as Record<DepID, LockfileNode>,
      edges: {
        [edgeKey(['file', '.'], 'foo')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      } as LockfileEdges,
    }

    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      graphData,
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      graphData,
    )

    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.hasChanges(),
      false,
      'identical graphs should have no changes',
    )
    t.end()
  })

  // Test 2: Only nodes added should return true
  t.test('returns true when only nodes are added', t => {
    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'new-package@1.0.0'])]: [
            0,
            'new-package',
            'sha512-newpackage==',
          ],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.hasChanges(),
      true,
      'adding nodes should result in changes',
    )
    t.ok(diff.nodes.add.size > 0, 'should have nodes to add')
    t.equal(
      diff.nodes.delete.size,
      0,
      'should have no nodes to delete',
    )
    t.equal(diff.edges.add.size, 0, 'should have no edges to add')
    t.equal(
      diff.edges.delete.size,
      0,
      'should have no edges to delete',
    )
    t.end()
  })

  // Test 3: Only nodes deleted should return true
  t.test('returns true when only nodes are deleted', t => {
    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'old-package@1.0.0'])]: [
            0,
            'old-package',
            'sha512-oldpackage==',
          ],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.hasChanges(),
      true,
      'deleting nodes should result in changes',
    )
    t.equal(diff.nodes.add.size, 0, 'should have no nodes to add')
    t.ok(diff.nodes.delete.size > 0, 'should have nodes to delete')
    t.equal(diff.edges.add.size, 0, 'should have no edges to add')
    t.equal(
      diff.edges.delete.size,
      0,
      'should have no edges to delete',
    )
    t.end()
  })

  // Test 4: Only edges added should return true
  t.test('returns true when only edges are added', t => {
    const sharedNodes = {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-foofoofoo==',
      ],
    } as Record<DepID, LockfileNode>

    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: sharedNodes,
        edges: {} as LockfileEdges,
      },
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: sharedNodes,
        edges: {
          [edgeKey(['file', '.'], 'foo')]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        } as LockfileEdges,
      },
    )

    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.hasChanges(),
      true,
      'adding edges should result in changes',
    )
    t.equal(diff.nodes.add.size, 0, 'should have no nodes to add')
    t.equal(
      diff.nodes.delete.size,
      0,
      'should have no nodes to delete',
    )
    t.ok(diff.edges.add.size > 0, 'should have edges to add')
    t.equal(
      diff.edges.delete.size,
      0,
      'should have no edges to delete',
    )
    t.end()
  })

  // Test 5: Only edges deleted should return true
  t.test('returns true when only edges are deleted', t => {
    const sharedNodes = {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-foofoofoo==',
      ],
    } as Record<DepID, LockfileNode>

    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: sharedNodes,
        edges: {
          [edgeKey(['file', '.'], 'foo')]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        } as LockfileEdges,
      },
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: sharedNodes,
        edges: {} as LockfileEdges,
      },
    )

    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.hasChanges(),
      true,
      'deleting edges should result in changes',
    )
    t.equal(diff.nodes.add.size, 0, 'should have no nodes to add')
    t.equal(
      diff.nodes.delete.size,
      0,
      'should have no nodes to delete',
    )
    t.equal(diff.edges.add.size, 0, 'should have no edges to add')
    t.ok(diff.edges.delete.size > 0, 'should have edges to delete')
    t.end()
  })

  // Test 6: Multiple types of changes should return true
  t.test('returns true when multiple types of changes exist', t => {
    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'old-package@1.0.0'])]: [
            0,
            'old-package',
            'sha512-oldpackage==',
          ],
        } as Record<DepID, LockfileNode>,
        edges: {
          [edgeKey(['file', '.'], 'old-package')]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'old-package@1.0.0']),
        } as LockfileEdges,
      },
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'new-package@1.0.0'])]: [
            0,
            'new-package',
            'sha512-newpackage==',
          ],
        } as Record<DepID, LockfileNode>,
        edges: {
          [edgeKey(['file', '.'], 'new-package')]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'new-package@1.0.0']),
        } as LockfileEdges,
      },
    )

    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.hasChanges(),
      true,
      'multiple changes should result in changes',
    )
    t.ok(diff.nodes.add.size > 0, 'should have nodes to add')
    t.ok(diff.nodes.delete.size > 0, 'should have nodes to delete')
    t.ok(diff.edges.add.size > 0, 'should have edges to add')
    t.ok(diff.edges.delete.size > 0, 'should have edges to delete')
    t.end()
  })
})

t.test('optionalOnly method', async t => {
  const projectRoot = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
  })

  // Test 1: Empty diff (no added nodes) should return true
  t.test('returns true when no nodes are added', t => {
    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
            0,
            'foo',
            'sha512-foofoofoo==',
          ],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.optionalOnly,
      true,
      'diff with no added nodes should return true',
    )
    t.end()
  })

  // Test 2: Diff with only optional nodes should return true
  t.test('returns true when all added nodes are optional', t => {
    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'optional-pkg@1.0.0'])]: [
            0,
            'optional-pkg',
            'sha512-optionalpkg==',
          ],
          [joinDepIDTuple([
            'registry',
            '',
            'another-optional@1.0.0',
          ])]: [0, 'another-optional', 'sha512-anotheroptional=='],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    // Mark the added nodes as optional
    const optionalNode1 = graph2.nodes.get(
      joinDepIDTuple(['registry', '', 'optional-pkg@1.0.0']),
    )!
    const optionalNode2 = graph2.nodes.get(
      joinDepIDTuple(['registry', '', 'another-optional@1.0.0']),
    )!
    optionalNode1.optional = true
    optionalNode2.optional = true

    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.optionalOnly,
      true,
      'diff with only optional nodes should return true',
    )
    t.ok(diff.nodes.add.size > 0, 'should have nodes to add')
    t.end()
  })

  // Test 3: Diff with only non-optional nodes should return false
  t.test('returns false when added nodes include non-optional', t => {
    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'required-pkg@1.0.0'])]: [
            0,
            'required-pkg',
            'sha512-requiredpkg==',
          ],
        } as Record<DepID, LockfileNode>,
        edges: {} as LockfileEdges,
      },
    )

    // The added node remains non-optional (default is false)
    const diff = new Diff(graph1, graph2)
    t.equal(
      diff.optionalOnly,
      false,
      'diff with non-optional nodes should return false',
    )
    t.ok(diff.nodes.add.size > 0, 'should have nodes to add')
    t.end()
  })

  // Test 4: Diff with mixed optional and non-optional nodes should return false
  t.test(
    'returns false when added nodes are mixed optional and non-optional',
    t => {
      const graph1 = loadObject(
        {
          projectRoot,
          mainManifest: {
            name: 'test',
            version: '1.0.0',
          },
        },
        {
          lockfileVersion: 1,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          } as Record<DepID, LockfileNode>,
          edges: {} as LockfileEdges,
        },
      )

      const graph2 = loadObject(
        {
          projectRoot,
          mainManifest: {
            name: 'test',
            version: '1.0.0',
          },
        },
        {
          lockfileVersion: 1,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
            [joinDepIDTuple(['registry', '', 'optional-pkg@1.0.0'])]:
              [0, 'optional-pkg', 'sha512-optionalpkg=='],
            [joinDepIDTuple(['registry', '', 'required-pkg@1.0.0'])]:
              [0, 'required-pkg', 'sha512-requiredpkg=='],
          } as Record<DepID, LockfileNode>,
          edges: {} as LockfileEdges,
        },
      )

      // Mark one node as optional, leave the other as non-optional
      const optionalNode = graph2.nodes.get(
        joinDepIDTuple(['registry', '', 'optional-pkg@1.0.0']),
      )!
      optionalNode.optional = true

      const diff = new Diff(graph1, graph2)
      t.equal(
        diff.optionalOnly,
        false,
        'diff with mixed optional and non-optional nodes should return false',
      )
      t.ok(diff.nodes.add.size > 0, 'should have nodes to add')
      t.end()
    },
  )

  // Test 5: Diff with only deletions (no additions) should return true
  t.test(
    'returns true when only deleting nodes (no additions)',
    t => {
      const graph1 = loadObject(
        {
          projectRoot,
          mainManifest: {
            name: 'test',
            version: '1.0.0',
          },
        },
        {
          lockfileVersion: 1,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
            [joinDepIDTuple(['registry', '', 'to-delete@1.0.0'])]: [
              0,
              'to-delete',
              'sha512-todelete==',
            ],
          } as Record<DepID, LockfileNode>,
          edges: {} as LockfileEdges,
        },
      )

      const graph2 = loadObject(
        {
          projectRoot,
          mainManifest: {
            name: 'test',
            version: '1.0.0',
          },
        },
        {
          lockfileVersion: 1,
          options: {
            registries: {
              npm: 'https://registry.npmjs.org/',
            },
          },
          nodes: {
            [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          } as Record<DepID, LockfileNode>,
          edges: {} as LockfileEdges,
        },
      )

      const diff = new Diff(graph1, graph2)
      t.equal(
        diff.optionalOnly,
        true,
        'diff with only deletions should return true (no additions)',
      )
      t.equal(diff.nodes.add.size, 0, 'should have no nodes to add')
      t.ok(diff.nodes.delete.size > 0, 'should have nodes to delete')
      t.end()
    },
  )
})

t.test('toJSON method', async t => {
  const projectRoot = t.testdir({
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
  })

  t.test('serializes diff with nodes and edges correctly', t => {
    const graphA = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'old-package@1.0.0'])]: [
            0,
            'old-package',
            'sha512-oldpackage==',
          ],
          [joinDepIDTuple(['registry', '', 'shared@1.0.0'])]: [
            0,
            'shared',
            'sha512-shared==',
          ],
        } as Record<DepID, LockfileNode>,
        edges: {
          [edgeKey(['file', '.'], 'old-package')]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'old-package@1.0.0']),
          [edgeKey(['file', '.'], 'shared')]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'shared@1.0.0']),
        } as LockfileEdges,
      },
    )

    const graphB = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      {
        lockfileVersion: 1,
        options: {
          registries: {
            npm: 'https://registry.npmjs.org/',
          },
        },
        nodes: {
          [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
          [joinDepIDTuple(['registry', '', 'new-package@2.0.0'])]: [
            0,
            'new-package',
            'sha512-newpackage==',
          ],
          [joinDepIDTuple(['registry', '', 'shared@1.0.0'])]: [
            0,
            'shared',
            'sha512-shared==',
          ],
        } as Record<DepID, LockfileNode>,
        edges: {
          [edgeKey(['file', '.'], 'new-package')]:
            'dev ^2.0.0 ' +
            joinDepIDTuple(['registry', '', 'new-package@2.0.0']),
          [edgeKey(['file', '.'], 'shared')]:
            'prod ^1.0.0 ' +
            joinDepIDTuple(['registry', '', 'shared@1.0.0']),
        } as LockfileEdges,
      },
    )

    const diff = new Diff(graphA, graphB)
    const diffJSON = diff.toJSON()

    // Verify structure
    t.type(diffJSON, 'object', 'should return an object')
    t.ok('nodes' in diffJSON, 'should have nodes property')
    t.ok('edges' in diffJSON, 'should have edges property')
    t.ok('add' in diffJSON.nodes, 'should have nodes.add property')
    t.ok(
      'delete' in diffJSON.nodes,
      'should have nodes.delete property',
    )
    t.ok('add' in diffJSON.edges, 'should have edges.add property')
    t.ok(
      'delete' in diffJSON.edges,
      'should have edges.delete property',
    )

    // Verify types
    t.type(diffJSON.nodes.add, Array, 'nodes.add should be an array')
    t.type(
      diffJSON.nodes.delete,
      Array,
      'nodes.delete should be an array',
    )
    t.type(diffJSON.edges.add, Array, 'edges.add should be an array')
    t.type(
      diffJSON.edges.delete,
      Array,
      'edges.delete should be an array',
    )

    // Verify content
    t.ok(diffJSON.nodes.add.length > 0, 'should have added nodes')
    t.ok(
      diffJSON.nodes.delete.length > 0,
      'should have deleted nodes',
    )
    t.ok(diffJSON.edges.add.length > 0, 'should have added edges')
    t.ok(
      diffJSON.edges.delete.length > 0,
      'should have deleted edges',
    )

    // Check node structure
    const addedNode = diffJSON.nodes.add[0]!
    t.ok(addedNode, 'should have an added node')
    t.ok('id' in addedNode, 'added node should have id')
    t.ok('name' in addedNode, 'added node should have name')
    t.ok('location' in addedNode, 'added node should have location')

    const deletedNode = diffJSON.nodes.delete[0]!
    t.ok(deletedNode, 'should have a deleted node')
    t.ok('id' in deletedNode, 'deleted node should have id')
    t.ok('name' in deletedNode, 'deleted node should have name')
    t.ok(
      'location' in deletedNode,
      'deleted node should have location',
    )

    // Check edge structure
    const addedEdge = diffJSON.edges.add[0]!
    t.ok(addedEdge, 'should have an added edge')
    t.ok('from' in addedEdge, 'added edge should have from')
    t.ok('to' in addedEdge, 'added edge should have to')
    t.ok('type' in addedEdge, 'added edge should have type')
    t.ok('spec' in addedEdge, 'added edge should have spec')

    const deletedEdge = diffJSON.edges.delete[0]!
    t.ok(deletedEdge, 'should have a deleted edge')
    t.ok('from' in deletedEdge, 'deleted edge should have from')
    t.ok('to' in deletedEdge, 'deleted edge should have to')
    t.ok('type' in deletedEdge, 'deleted edge should have type')
    t.ok('spec' in deletedEdge, 'deleted edge should have spec')

    t.end()
  })

  t.test('serializes empty diff correctly', t => {
    const graphData = {
      lockfileVersion: 1,
      options: {
        registries: {
          npm: 'https://registry.npmjs.org/',
        },
      },
      nodes: {
        [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
          0,
          'foo',
          'sha512-foofoofoo==',
        ],
      } as Record<DepID, LockfileNode>,
      edges: {
        [edgeKey(['file', '.'], 'foo')]:
          'prod ^1.0.0 ' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      } as LockfileEdges,
    }

    const graph1 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      graphData,
    )

    const graph2 = loadObject(
      {
        projectRoot,
        mainManifest: {
          name: 'test',
          version: '1.0.0',
        },
      },
      graphData,
    )

    const diff = new Diff(graph1, graph2)
    const diffJSON = diff.toJSON()

    t.equal(
      diffJSON.nodes.add.length,
      0,
      'should have no added nodes',
    )
    t.equal(
      diffJSON.nodes.delete.length,
      0,
      'should have no deleted nodes',
    )
    t.equal(
      diffJSON.edges.add.length,
      0,
      'should have no added edges',
    )
    t.equal(
      diffJSON.edges.delete.length,
      0,
      'should have no deleted edges',
    )

    t.end()
  })

  t.end()
})
