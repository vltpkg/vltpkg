import t from 'tap'
import {
  assertGraphModifiersConfigObject,
  GraphModifier,
} from '../src/modifiers.ts'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { reload } from '@vltpkg/vlt-json'
import type { Node } from '../src/node.ts'
import { Edge } from '../src/edge.ts'
import type { GraphLike, NodeLike, EdgeLike } from '../src/types.ts'
import type { DependencyTypeShort, Manifest } from '@vltpkg/types'
import { joinDepIDTuple } from '@vltpkg/dep-id'

// Graph fixtures code
const specOptions: SpecOptions = {
  registries: {
    custom: 'http://example.com',
  },
}

const projectRoot = '.'

const newGraph = (rootName: string): GraphLike => {
  const graph = {} as GraphLike
  const addNode = newNode(graph)
  const mainImporter = addNode(rootName)
  mainImporter.id = joinDepIDTuple(['file', '.'])
  mainImporter.mainImporter = true
  mainImporter.importer = true
  mainImporter.graph = graph
  graph.importers = new Set([mainImporter])
  graph.mainImporter = mainImporter
  graph.nodes = new Map([[mainImporter.id, mainImporter]])
  graph.edges = new Set()

  return graph
}

const newNode =
  (graph: GraphLike) =>
  (name: string, version = '1.0.0'): NodeLike => ({
    projectRoot,
    confused: false,
    edgesIn: new Set(),
    edgesOut: new Map(),
    importer: false,
    mainImporter: false,
    graph,
    id: joinDepIDTuple(['registry', '', `${name}@${version}`]),
    name,
    version,
    location:
      'node_modules/.vlt/;;${name}@${version}/node_modules/${name}',
    manifest: { name, version },
    integrity: 'sha512-deadbeef',
    resolved: undefined,
    dev: false,
    optional: false,
    setConfusedManifest() {},
    setResolved() {},
    toJSON() {
      return {
        id: this.id,
        name: this.name,
        version: this.version,
        location: this.location,
        importer: this.importer,
        manifest: this.manifest,
        projectRoot: this.projectRoot,
        integrity: this.integrity,
        resolved: this.resolved,
        dev: this.dev,
        optional: this.optional,
        confused: false,
      }
    },
    toString() {
      return `${this.name}@${this.version}`
    },
  })

const newEdge = (
  from: NodeLike,
  spec: Spec,
  type: DependencyTypeShort,
  to?: NodeLike,
) => {
  const edge = {
    name: spec.name,
    from,
    to,
    spec,
    type,
    get optional() {
      return this.type === 'peerOptional' || this.type === 'optional'
    },
    get peer() {
      return this.type === 'peer' || this.type === 'peerOptional'
    },
  } as EdgeLike
  from.edgesOut.set(spec.name, edge)
  if (to) {
    to.edgesIn.add(edge)
  }
  from.graph.edges.add(edge)
  return edge
}

/*
Returns a graph that looks like:

```mermaid
flowchart TD
  root --> a
  root --> b:::dev
  root --> e
  root --> y("@x/y"):::dev
  b --> c
  b --> d
  d --> e
  d --> f:::optional

  classDef dev fill:palegreen
  classDef optional fill:cornsilk
```
*/
const getSimpleGraph = (): GraphLike => {
  const graph = newGraph('my-project')
  const addNode = newNode(graph)
  const [a, b, c, d, e, f, y] = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    '@x/y',
  ].map(i => addNode(i)) as [
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
    NodeLike,
  ]
  b.dev = c.dev = d.dev = e.dev = f.dev = y.dev = true // deps of dev deps
  f.optional = true
  y.id = joinDepIDTuple(['file', 'y'])
  ;[a, b, c, d, e, f, y].forEach(i => {
    graph.nodes.set(i.id, i)
  })
  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
    a,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('b', '^1.0.0', specOptions),
    'dev',
    b,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('e', '^1.0.0', specOptions),
    'prod',
    e,
  )
  newEdge(
    graph.mainImporter,
    Spec.parse('@x/y', 'file:y', specOptions),
    'dev',
    y,
  )
  newEdge(b, Spec.parse('c', '^1.0.0', specOptions), 'prod', c)
  newEdge(b, Spec.parse('d', '^1.0.0', specOptions), 'prod', d)
  newEdge(d, Spec.parse('e', '^1.0.0', specOptions), 'prod', e)
  newEdge(d, Spec.parse('f', '^1.0.0', specOptions), 'optional', f)

  // give some nodes an expanded manifest so that we can test
  // more attribute selector scenarios
  b.manifest = {
    ...b.manifest,
    version: '2.0.0',
    scripts: {
      postinstall: 'postinstall',
      test: 'test',
    },
    contributors: [
      {
        name: 'Ruy Adorno',
        email: 'ruyadorno@example.com',
      },
    ],
  } as Manifest

  c.manifest = {
    ...c.manifest,
    peerDependenciesMeta: {
      foo: {
        optional: true,
      },
    },
    keywords: ['something', 'someother'],
  } as Manifest

  d.manifest = {
    ...d.manifest,
    private: true,
    a: {
      b: [
        {
          c: {
            d: 'foo',
          },
        },
        {
          c: {
            d: 'bar',
          },
        },
      ],
      e: ['foo', 'bar'],
    },
  } as Manifest
  return graph
}

/* Returns a graph that looks like:
```mermaid
flowchart TD
  root --> a
  a --> b
  b --> a
```
*/
const getCycleGraph = (): GraphLike => {
  const graph = newGraph('cycle-project')
  graph.mainImporter.manifest = {
    ...graph.mainImporter.manifest,
    dependencies: {
      a: '^1.0.0',
    },
  }
  const addNode = newNode(graph)

  const a = addNode('a')
  a.manifest = {
    ...a.manifest,
    scripts: {
      test: 'foo',
    },
    dependencies: {
      b: '^1.0.0',
    },
  }
  graph.nodes.set(a.id, a)
  newEdge(
    graph.mainImporter,
    Spec.parse('a', '^1.0.0', specOptions),
    'prod',
    a,
  )

  const b = addNode('b')
  b.manifest = {
    ...b.manifest,
    scripts: {
      test: 'bar',
    },
    dependencies: {
      a: '^1.0.0',
    },
  }
  graph.nodes.set(b.id, b)
  newEdge(a, Spec.parse('b', '^1.0.0', specOptions), 'prod', b)
  newEdge(b, Spec.parse('a', '^1.0.0', specOptions), 'prod', a)

  return graph
}

/* Returns a complex graph with multiple workspaces with dependencies:
```mermaid
flowchart TD
  root --> y("@x/y")
  root --> a
  root --> b
  root --> c
  b --> a
  b --> d
  b --> e
  a --> f
```
*/
const getMultiWorkspaceGraph = (): GraphLike => {
  const graph = newGraph('ws')
  const addNode = newNode(graph)
  const a = addNode('a')
  a.id = joinDepIDTuple(['workspace', 'a'])
  graph.nodes.set(a.id, a)
  graph.importers.add(a)
  a.importer = true
  const b = addNode('b')
  b.id = joinDepIDTuple(['workspace', 'b'])
  graph.nodes.set(b.id, b)
  graph.importers.add(b)
  b.importer = true
  const c = addNode('c')
  c.id = joinDepIDTuple(['workspace', 'c'])
  graph.nodes.set(c.id, c)
  graph.importers.add(c)
  c.importer = true
  const [d, e, f, y] = ['d', 'e', 'f', '@x/y'].map(i => {
    const n = addNode(i)
    graph.nodes.set(n.id, n)
    return n
  }) as [NodeLike, NodeLike, NodeLike, NodeLike]

  newEdge(b, Spec.parse('a', 'workspace:*', specOptions), 'prod', a)
  newEdge(b, Spec.parse('d', '^1.0.0', specOptions), 'prod', d)
  newEdge(b, Spec.parse('e', '^1.0.0', specOptions), 'prod', e)
  newEdge(a, Spec.parse('f', '^1.0.0', specOptions), 'prod', f)
  newEdge(
    graph.mainImporter,
    Spec.parse('@x/y', '^1.0.0', specOptions),
    'prod',
    y,
  )
  return graph
}

// Test fixtures
const validStringConfig = {
  '#a > #c': '1.0.0',
}

const validObjectConfig = {
  '#a > #c': {
    name: 'test-package',
    version: '1.0.0',
  },
}

const invalidConfig = {
  '#a > #c': 123, // Invalid value type
}

const invalidManifestConfig = {
  '#a > #c': {
    name: null,
  },
}

// Mock options for tests
const mockSpecOptions: SpecOptions = {
  registry: 'https://registry.npmjs.org',
}

// Helper function to create a test edge
const createMockEdge = (from: Node, to: Node, name: string): Edge => {
  const spec = new Spec(name, '1.0.0')
  return new Edge('prod' as DependencyTypeShort, spec, from, to)
}

t.test('assertGraphModifiersConfigObject', async t => {
  await t.test('should validate valid configs', async t => {
    t.doesNotThrow(
      () => assertGraphModifiersConfigObject(validStringConfig),
      'should not throw for valid string config',
    )

    t.doesNotThrow(
      () => assertGraphModifiersConfigObject(validObjectConfig),
      'should not throw for valid object config',
    )
  })

  await t.test('should throw for invalid configs', async t => {
    t.throws(
      () => assertGraphModifiersConfigObject(null),
      'should throw for null config',
    )

    t.throws(
      () => assertGraphModifiersConfigObject(123 as any),
      /Invalid modifiers configuration/,
      'should throw for non-object config',
    )

    t.throws(
      () => assertGraphModifiersConfigObject(invalidConfig),
      /Invalid modifier value/,
      'should throw for invalid value type',
    )

    t.throws(
      () => assertGraphModifiersConfigObject(invalidManifestConfig),
      /Invalid modifier manifest/,
      'should throw for invalid manifest',
    )
  })
})

t.test('GraphModifier', async t => {
  await t.test('constructor', async t => {
    // Test with empty config
    const emptyconfigDir = t.testdir({
      'vlt.json': JSON.stringify({}), // No modifiers key
    })
    const options = {
      specOptions: mockSpecOptions,
    }
    // Reload vlt.json to ensure we have the latest config
    t.chdir(emptyconfigDir)
    reload('modifiers', 'project')

    const emptyModifier = new GraphModifier(options)
    t.same(
      emptyModifier.config,
      {},
      'should return empty object when no config is found',
    )
  })

  await t.test('config getter', async t => {
    const testdir = t.testdir({
      'vlt.json': JSON.stringify({ modifiers: validStringConfig }),
    })

    const options = {
      specOptions: mockSpecOptions,
    }
    // Reload vlt.json to ensure we have the latest config
    t.chdir(testdir)
    reload('modifiers', 'project')

    // Create a GraphModifier instance
    const modifier = new GraphModifier(options)

    // Test with config from vlt.json
    t.same(
      modifier.config,
      validStringConfig,
      'should load config from vlt.json',
    )

    // Test cache behavior (accessing config property again)
    t.same(
      modifier.config,
      validStringConfig,
      'should return same cached config',
    )
  })

  await t.test('maybeHasModifier with simple graph', async t => {
    // Test with importer modifier
    const importerConfigDir = t.testdir({
      'vlt.json': JSON.stringify({
        modifiers: { ':root > #a': '1.0.0' },
      }),
    })
    // Reload vlt.json to ensure we have the latest config
    t.chdir(importerConfigDir)
    reload('modifiers', 'project')

    const importerOptions = {
      specOptions: mockSpecOptions,
    }

    const importerModifier = new GraphModifier(importerOptions)
    // Using actual node names from the fixtures
    t.equal(
      importerModifier.maybeHasModifier('a'),
      true,
      'should return true for matching dependency',
    )
    t.equal(
      importerModifier.maybeHasModifier('nonexistent'),
      false,
      'should return false for non-matching dependency',
    )
  })

  await t.test('non-importer modifier', async t => {
    // Test with non-importer modifier
    const nonImporterConfigDir = t.testdir({
      'vlt.json': JSON.stringify({
        modifiers: { '#a > #c': '1.0.0' },
      }),
    })

    const nonImporterOptions = {
      specOptions: mockSpecOptions,
    }
    // Reload vlt.json to ensure we have the latest config
    t.chdir(nonImporterConfigDir)
    reload('modifiers', 'project')

    const nonImporterModifier = new GraphModifier(nonImporterOptions)
    t.equal(
      nonImporterModifier.maybeHasModifier('anything'),
      true,
      'should return true when rootless breadcrumb exists',
    )
  })

  await t.test(
    'tryImporter and tryNewDependency with simple graph',
    async t => {
      const testdir = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: {
            ':root > #a': '1.0.0',
            '#b > #c': '2.0.0',
          },
        }),
      })

      const options = {
        specOptions: mockSpecOptions,
      }
      // Reload vlt.json to ensure we have the latest config
      t.chdir(testdir)
      reload('modifiers', 'project')

      const modifier = new GraphModifier(options)

      // Use nodes from the simple graph
      const simpleGraph = getSimpleGraph()
      const mainImporter = simpleGraph.mainImporter as Node
      const nodeA = Array.from(simpleGraph.nodes.values()).find(
        n => n.name === 'a',
      )! as Node

      // Test tryImporter
      modifier.tryImporter(mainImporter)
      t.pass(
        'tryImporter should process main importer node without errors',
      )

      // Test tryNewDependency
      const [result] = modifier.tryNewDependency(mainImporter, 'a')
      t.ok(
        result,
        'should return a modifier active entry for matching name',
      )
      if (result) {
        t.same(
          result.originalFrom,
          mainImporter,
          'should set originalFrom to the provided parent node',
        )
      }

      // Test with non-matching name
      const [nonMatchingResult] = modifier.tryNewDependency(
        nodeA,
        'nonexistent',
      )
      t.equal(
        nonMatchingResult,
        undefined,
        'should return undefined for non-matching name',
      )
    },
  )

  await t.test(
    'three-level navigation and non-matching queries',
    async t => {
      const testdir = t.testdir({
        'vlt.json': JSON.stringify({
          modifiers: {
            // Three-level navigation pattern
            ':root > #b > #c': '3.0.0',
            // Non-matching pattern (r doesn't exist)
            ':root > #a > #r': '1.0.0',
            // Another non-matching pattern
            '#r': '1.0.0',
            // Single node match
            '#c': '4.0.0',
          },
        }),
      })

      const options = {
        specOptions: mockSpecOptions,
      }
      // Reload vlt.json to ensure we have the latest config
      t.chdir(testdir)
      reload('modifiers', 'project')

      const modifier = new GraphModifier(options)

      // Use nodes from the simple graph
      const simpleGraph = getSimpleGraph()
      const mainImporter = simpleGraph.mainImporter as Node
      const nodeA = Array.from(simpleGraph.nodes.values()).find(
        n => n.name === 'a',
      )! as Node
      const nodeB = Array.from(simpleGraph.nodes.values()).find(
        n => n.name === 'b',
      )! as Node
      const nodeC = Array.from(simpleGraph.nodes.values()).find(
        n => n.name === 'c',
      )! as Node

      // Let's manually perform the graph traversal
      // First, process the root
      modifier.tryImporter(mainImporter)
      t.equal(
        modifier.activeModifiers.size,
        2,
        'should have two active entries that start with :root',
      )
      // try to match 'a' from root
      const [resultA] = modifier.tryNewDependency(mainImporter, 'a')
      t.strictSame(
        resultA?.modifier.query,
        ':root > #a > #r',
        'should match modifier that contains a as a dep from root',
      )
      const [resultB] = modifier.tryNewDependency(mainImporter, 'b')
      t.strictSame(
        resultB?.modifier.query,
        ':root > #b > #c',
        'should match modifier that contains b as a dep from root',
      )
      const resultY = modifier.tryNewDependency(mainImporter, '@x/y')
      t.equal(
        resultY.size,
        0,
        'should return no entries for non-matching @x/y from root',
      )
      // update the active entries as we go a level deeper
      modifier.updateActiveEntry(nodeA, resultA!)
      modifier.updateActiveEntry(nodeB, resultB!)
      t.equal(
        modifier.activeModifiers.size,
        2,
        'should only update the existing active entries so the count remains the same',
      )

      // Now try to match deps of b
      const resultC = modifier.tryNewDependency(nodeB, 'c')
      t.strictSame(
        [...resultC].map(i => i.modifier.query),
        [':root > #b > #c', '#c'],
        'should match modifiers that contains c as a breadcrumb item',
      )
      const resultD = modifier.tryNewDependency(nodeB, 'd')
      t.equal(
        resultD.size,
        0,
        'should return no results node with no matching breadcrumb item',
      )
      // Update the active entry for nodeC active modifiers
      for (const entry of resultC) {
        modifier.updateActiveEntry(nodeC, entry)
      }

      t.equal(
        modifier.activeModifiers.size,
        1,
        'should add a leftover active modifier entry for non-matching r',
      )
      modifier.rollbackActiveEntries()
      t.equal(
        modifier.activeModifiers.size,
        0,
        'should remove the leftover active modifier entry after rollback',
      )
    },
  )

  await t.test('rollbackActiveEntries with cycle graph', async t => {
    const testdir = t.testdir({
      'vlt.json': JSON.stringify({
        modifiers: {
          '#a > #b': '1.0.0',
        },
      }),
    })

    const options = {
      specOptions: mockSpecOptions,
    }
    // Reload vlt.json to ensure we have the latest config
    t.chdir(testdir)
    reload('modifiers', 'project')

    const modifier = new GraphModifier(options)

    // Use nodes from the cycle graph
    const cycleGraph = getCycleGraph()
    const nodes = Array.from(cycleGraph.nodes.values())
    const mainImporter = cycleGraph.mainImporter as Node
    const nodeA = nodes.find(n => n.name === 'a') as Node
    const nodeB = nodes.find(n => n.name === 'b') as Node

    const [resultA] = modifier.tryNewDependency(mainImporter, 'a')
    // call updateActiveEntry to set an active entry for nodeA
    modifier.updateActiveEntry(nodeA, resultA!)
    t.equal(
      modifier.activeModifiers.size,
      1,
      'should have one active entry after processing a',
    )
    // rollback unfinished parsed breadcrumb
    t.doesNotThrow(
      () => modifier.rollbackActiveEntries(),
      'rollbackActiveEntries should not throw',
    )
    t.equal(
      modifier.activeModifiers.size,
      0,
      'should have no active entry left after rollback',
    )

    // traverse again
    const [newResultA] = modifier.tryNewDependency(mainImporter, 'a')
    modifier.updateActiveEntry(nodeA, newResultA!)
    t.equal(
      modifier.activeModifiers.size,
      1,
      'should have one active entry after processing a again',
    )
    const [resultB] = modifier.tryNewDependency(nodeA, 'b')
    modifier.updateActiveEntry(nodeB, resultB!)
    t.equal(
      modifier.activeModifiers.size,
      0,
      'should have no active entry left after completing b',
    )
  })

  await t.test('more complex rollbackActiveEntries', async t => {
    const testdir = t.testdir({
      'vlt.json': JSON.stringify({
        modifiers: {
          ':root > #a': '2.0.0',
          ':root > #b': '3.0.0',
          ':root > #b > #c': '3.0.0',
          '#b > #c': '4.0.0',
          '#b > #d': '4.0.0',
        },
      }),
    })

    const options = {
      specOptions: mockSpecOptions,
    }
    // Reload vlt.json to ensure we have the latest config
    t.chdir(testdir)
    reload('modifiers', 'project')

    const modifier = new GraphModifier(options)

    // Use nodes from the simple graph
    const simpleGraph = getSimpleGraph()
    const mainImporter = simpleGraph.mainImporter as Node
    const nodeA = Array.from(simpleGraph.nodes.values()).find(
      n => n.name === 'a',
    )! as Node
    const nodeB = Array.from(simpleGraph.nodes.values()).find(
      n => n.name === 'b',
    )! as Node

    // Process the root
    modifier.tryImporter(mainImporter)

    // Process multiple paths to build up multiple active entries
    const [resultA] = modifier.tryNewDependency(mainImporter, 'a')
    t.strictSame(
      resultA?.modifier.query,
      ':root > #a',
      'should match a from root with a single query',
    )

    const resultB = modifier.tryNewDependency(mainImporter, 'b')
    t.strictSame(
      [...resultB].map(i => i.modifier.query),
      [':root > #b', ':root > #b > #c', '#b > #c', '#b > #d'],
      'should match b from root with multiple queries',
    )
    for (const entry of resultB) {
      modifier.updateActiveEntry(nodeB, entry)
    }

    const resultC = modifier.tryNewDependency(nodeB, 'c')
    t.strictSame(
      [...resultC].map(i => i.modifier.query),
      [':root > #b > #c', '#b > #c'],
      'should match c from b with multiple queries',
    )

    // Set up an edge to rollback
    const newEdge = createMockEdge(nodeA, nodeB, 'test-edge')
    nodeA.edgesOut.set('test-edge', newEdge)

    // Simulate having an original edge in the active entry
    if (resultA) {
      resultA.originalEdge = newEdge
    }

    // Now rollback all active entries
    modifier.rollbackActiveEntries()

    // Check if the original edge was restored
    t.equal(
      nodeA.edgesOut.get('test-edge'),
      newEdge,
      'should restore original edge during rollback',
    )
  })

  await t.test('static methods', async t => {
    const testdir = t.testdir({
      'vlt.json': JSON.stringify({
        modifiers: validStringConfig,
      }),
    })

    const options = {
      specOptions: mockSpecOptions,
    }
    // Reload vlt.json to ensure we have the latest config
    t.chdir(testdir)
    reload('modifiers', 'project')

    // Test maybeLoad with config
    const loaded = GraphModifier.maybeLoad(options)
    t.ok(
      loaded instanceof GraphModifier,
      'should return GraphModifier instance when config exists',
    )

    // Test load
    const forcedLoad = GraphModifier.load(options)
    t.ok(
      forcedLoad instanceof GraphModifier,
      'should return GraphModifier instance',
    )
  })

  await t.test('missing config', async t => {
    const emptyDir = t.testdir({
      'vlt.json': JSON.stringify({}),
    })
    const options = {
      specOptions: mockSpecOptions,
    }
    // Reload vlt.json to ensure we have the latest config
    t.chdir(emptyDir)
    reload('modifiers', 'project')
    // Test maybeLoad with no config
    const notLoaded = GraphModifier.maybeLoad(options)
    t.equal(
      notLoaded,
      undefined,
      'should return undefined when no config exists',
    )

    const mod = new GraphModifier(options)
    t.match(
      mod.config,
      {},
      'should return empty config when no config exists',
    )
  })

  await t.test('load method with various config types', async t => {
    // Test with a mix of edge and node modifiers
    const configDir = t.testdir({
      'vlt.json': JSON.stringify({
        modifiers: {
          // Edge modifier
          ':root > #a': '2.0.0',
          // Node modifier
          ':root > #b': {
            name: 'custom-b',
            version: '3.0.0',
          },
          // Single non-importer selector
          '#c': '1.0.0',
        },
      }),
    })

    const options = {
      specOptions: mockSpecOptions,
    }

    // Reload vlt.json to ensure we have the latest config
    t.chdir(configDir)
    reload('modifiers', 'project')

    // Create a new modifier to test loading various config types
    const modifier = new GraphModifier(options)

    // Check if the config was properly loaded
    t.equal(
      Object.keys(modifier.config).length,
      3,
      'should load all three modifiers',
    )
    t.equal(
      typeof modifier.config[':root > #a'],
      'string',
      'should load edge modifier as string',
    )
    t.equal(
      typeof modifier.config[':root > #b'],
      'object',
      'should load node modifier as object',
    )
    t.equal(
      typeof modifier.config['#c'],
      'string',
      'should load single selector as string',
    )
  })

  await t.test('workspaces modifiers', async t => {
    const testdir = t.testdir({
      'vlt.json': JSON.stringify({
        modifiers: {
          ':workspace > #d': '2.0.0',
          ':workspace > #f': '3.0.0',
          ':workspace > #a > #f': '4.0.0', // <- not matched since a is not a dep of another workspace
        },
      }),
    })

    const options = {
      specOptions: mockSpecOptions,
    }
    // Reload vlt.json to ensure we have the latest config
    t.chdir(testdir)
    reload('modifiers', 'project')

    const modifier = new GraphModifier(options)

    // Use the multi-workspace graph
    const multiWorkspaceGraph = getMultiWorkspaceGraph()
    const mainImporter = multiWorkspaceGraph.mainImporter as Node
    const importers = [...multiWorkspaceGraph.importers] as Node[]
    const workspaceA = importers.find(n => n.name === 'a')!
    const workspaceB = importers.find(n => n.name === 'b')!
    const workspaceC = importers.find(n => n.name === 'c')!
    const nodeD = [...multiWorkspaceGraph.nodes.values()].find(
      n => n.name === 'd',
    )! as Node
    const nodeF = [...multiWorkspaceGraph.nodes.values()].find(
      n => n.name === 'f',
    )! as Node

    // Process all importers
    modifier.tryImporter(mainImporter)
    modifier.tryImporter(workspaceA)
    modifier.tryImporter(workspaceB)
    modifier.tryImporter(workspaceC)

    // Test :workspace modifier for dependency 'd' from workspace 'b'
    const resultD = modifier.tryNewDependency(workspaceB, 'd')
    t.strictSame(
      [...resultD].map(i => i.modifier.query),
      [':workspace > #d'],
      'should match d from workspace b with :workspace query',
    )

    // Test :workspace modifier for dependency 'f' from workspace 'a'
    const resultF = modifier.tryNewDependency(workspaceA, 'f')
    t.strictSame(
      [...resultF].map(i => i.modifier.query),
      [':workspace > #f'],
      'should match f from workspace a with both :workspace and :workspaces > #a queries',
    )

    // Test that no modifiers match for dependency 'e' from workspace 'b'
    const resultE = modifier.tryNewDependency(workspaceB, 'e')
    t.equal(
      resultE.size,
      0,
      'should return no results for e with no matching query',
    )

    // Update active entries
    for (const entry of resultD) {
      modifier.updateActiveEntry(nodeD, entry)
    }
    for (const entry of resultF) {
      modifier.updateActiveEntry(nodeF, entry)
    }

    // Test rollback
    t.equal(
      modifier.activeModifiers.size,
      4,
      'should have leftover activbe entries after processing',
    )
    modifier.rollbackActiveEntries()
    t.equal(
      modifier.activeModifiers.size,
      0,
      'should have no leftover active entries after rollback',
    )
  })
})
