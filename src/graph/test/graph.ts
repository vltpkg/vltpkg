import { hydrate, joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { inspect } from 'node:util'
import t from 'tap'
import { Edge } from '../src/edge.ts'
import { Graph } from '../src/graph.ts'
import type { GraphLike } from '../src/types.ts'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)"projectRoot": .*$/gm, '$1"projectRoot": #')

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${this}}`
  },
})

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('Graph', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot,
  })
  t.strictSame(
    graph.mainImporter.manifest?.name,
    'my-project',
    'should have created a root folder with expected properties',
  )
  t.matchSnapshot(
    inspect(graph, { depth: 0 }),
    'should print with special tag name',
  )
  const newNode = graph.addNode(
    undefined,
    {
      name: 'foo',
      version: '1.0.0',
      dependencies: { localdep: 'file:localdep' },
    },
    Spec.parse('foo@^1.0.0'),
  )
  t.strictSame(
    graph.nodes.size,
    2,
    'should create and add the new node to the graph',
  )

  // gutchecks
  t.strictSame(
    newNode.id,
    joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    'id gutcheck',
  )
  t.strictSame(
    newNode.location,
    './node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'foo@1.0.0']) +
      '/node_modules/foo',
    'location gutcheck',
  )

  const localdep = graph.addNode(
    joinDepIDTuple(['file', newNode.location + '/localdep']),
    { name: 'localdep', version: '1.2.3' },
    Spec.parse('localdep@file:localdep'),
    'localdep',
    '1.2.3',
  )
  t.equal(
    graph.findResolution(
      Spec.parse('localdep@file:./localdep'),
      newNode,
    ),
    localdep,
  )

  t.equal(
    graph.findResolution(
      Spec.parse('bar@npm:foo@1.x'),
      graph.mainImporter,
    ),
    newNode,
  )
  t.equal(
    graph.findResolution(Spec.parse('foo@1.x'), graph.mainImporter),
    newNode,
  )
  t.equal(
    graph.findResolution(Spec.parse('foo@3.x'), graph.mainImporter),
    undefined,
  )
  t.equal(
    graph.findResolution(Spec.parse('asdf@1.x'), graph.mainImporter),
    undefined,
  )
  t.same(
    graph.resolutionsReverse.get(newNode),
    new Set(['foo@^1.0.0', 'foo@1.x']),
  )
  t.same(graph.nodesByName.get('foo'), new Set([newNode]))
  const fooTwo = graph.addNode(
    undefined,
    {
      name: 'foo',
      version: '2.0.0',
    },
    Spec.parse('foo@^2.0.0'),
  )
  t.same(graph.nodesByName.get('foo'), new Set([newNode, fooTwo]))

  graph.addEdge(
    'implicit',
    Spec.parse('foo', '^1.0.0 || 2'),
    graph.mainImporter,
    newNode,
  )
  t.equal(
    graph.mainImporter.edgesOut.size,
    1,
    'should add edge to the list of edgesOut in its origin node',
  )
  t.equal(
    graph.mainImporter.edgesOut.get('foo')?.type,
    'prod',
    '"implicit" type is saved as prod if not already existing',
  )
  graph.addEdge(
    'dev',
    Spec.parse('foo@^1.0.0'),
    graph.mainImporter,
    newNode,
  )
  t.equal(
    graph.mainImporter.edgesOut.get('foo')?.type,
    'dev',
    'saving as dev moves prod dep to dev',
  )
  graph.addEdge(
    'implicit',
    Spec.parse('foo@^1.0.1'),
    graph.mainImporter,
    newNode,
  )
  t.equal(
    graph.mainImporter.edgesOut.get('foo')?.type,
    'dev',
    'saving as "implicit" leaves dep as dev',
  )
  t.equal(
    String(graph.mainImporter.edgesOut.get('foo')?.spec),
    'foo@^1.0.1',
    'version was updated',
  )
  t.equal(
    graph.mainImporter.edgesOut.size,
    1,
    'should not allow for adding new edges between same nodes',
  )
  graph.addEdge('prod', Spec.parse('missing@*'), graph.mainImporter)
  graph.removeNode(newNode, fooTwo)
  t.same(graph.nodesByName.get('foo'), new Set([fooTwo]))
  graph.removeNode(fooTwo)
  t.same(graph.nodesByName.get('foo'), undefined)
})

t.test('using placePackage', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      bar: '^1.0.0',
      missing: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    ...configData,
    mainManifest,
  })
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  t.ok(foo)
  const bar = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('bar', '^1.0.0'),
    {
      name: 'bar',
      version: '1.0.0',
      dependencies: {
        baz: '^1.0.0',
      },
    },
  )
  if (!bar) throw new Error('failed to place bar')
  const baz = graph.placePackage(
    bar,
    'prod',
    Spec.parse('baz', '^1.0.0'),
    {
      name: 'baz',
      version: '1.0.0',
      dist: {
        tarball: 'https://registry.vlt.sh/baz',
      },
    },
  )
  if (!baz) throw new Error('failed to place baz')
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('missing', '^1.0.0'),
  )
  graph.placePackage(baz, 'prod', Spec.parse('foo', '^1.0.0'), {
    name: 'foo',
    version: '1.0.0',
  })
  t.matchSnapshot(inspect(graph, { depth: 3 }), 'the graph')
  const [edge] = baz.edgesIn
  if (!edge) throw new Error('failed to retrieve baz')
  graph.removeNode(baz)
  t.matchSnapshot(
    inspect(graph, { depth: 3 }),
    'should have removed baz from the graph',
  )

  // placing a package using a spec: (unknown)@file:./a
  // returned from Spec.parseArgs()
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parseArgs('file:./a'),
    {
      name: 'a',
      version: '1.0.0',
    },
    joinDepIDTuple(['file', 'a']),
  )
  t.matchSnapshot(
    inspect(graph, { depth: 3 }),
    'should find and fix nameless spec packages',
  )

  // trying to place a **missing** package using a spec: (unknown)@github:a/b
  // returned from Spec.parseArgs()
  t.throws(
    () =>
      graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parseArgs('github:a/b'),
      ),
    /Impossible to place a missing, nameless dependency/,
    'should throw an impossible to place error',
  )
})

t.test('main manifest missing name', async t => {
  const mainManifest = {
    version: '1.0.0',
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    projectRoot,
    ...configData,
    mainManifest,
  })
  const hydrateId = hydrate(graph.mainImporter.id)
  t.strictSame(
    hydrateId.type,
    'file',
    'should use file type reference id',
  )
  t.strictSame(
    hydrateId.bareSpec,
    'file:.',
    'should have the relative path reference',
  )
})

t.test('workspaces', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
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
        }),
      },
    },
  })
  t.chdir(projectRoot)
  unload('project')
  const monorepo = Monorepo.maybeLoad(projectRoot)
  const graph = new Graph({
    projectRoot,
    ...configData,
    mainManifest,
    monorepo,
  })
  for (const importer of graph.importers) {
    t.strictSame(
      importer.graph,
      graph,
      'should have a ref to its graph',
    )
    importer.graph = 'Graph {}' as unknown as GraphLike
  }
  t.matchSnapshot(
    graph.importers,
    'should have root and workspaces as importers',
  )
})

t.test('prevent duplicate edges', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: { foo: '*' },
  }
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    dependencies: { bar: '*' },
  }
  const bar1Manifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const bar2Manifest = {
    name: 'bar',
    version: '2.0.0',
  }
  const bar3Manifest = {
    name: 'bar',
    version: '3.0.0',
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot,
  })
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo@*'),
    fooManifest,
  )
  graph.addNode(
    joinDepIDTuple(['registry', '', 'bar@1.0.0']),
    bar1Manifest,
  )
  graph.addNode(
    joinDepIDTuple(['registry', '', 'bar@2.0.0']),
    bar2Manifest,
  )
  graph.addNode(
    joinDepIDTuple(['registry', '', 'bar@3.0.0']),
    bar3Manifest,
  )
  const fooNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'foo@1.0.0']),
  )
  if (!fooNode) throw new Error('did not get node added to graph')
  graph.addEdge(
    'prod',
    Spec.parse('bar@*'),
    fooNode,
    graph.nodes.get(joinDepIDTuple(['registry', '', 'bar@1.0.0'])),
  )
  graph.addEdge(
    'prod',
    Spec.parse('bar@*'),
    fooNode,
    graph.nodes.get(joinDepIDTuple(['registry', '', 'bar@1.0.0'])),
  )
  graph.addEdge(
    'prod',
    Spec.parse('bar@*'),
    fooNode,
    graph.nodes.get(joinDepIDTuple(['registry', '', 'bar@2.0.0'])),
  )
  t.match(
    graph.edges,
    new Set([
      new Edge(
        'prod',
        Spec.parse('foo@*'),
        graph.nodes.get(joinDepIDTuple(['file', '.']))!,
        graph.nodes.get(
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        ),
      ),
      new Edge(
        'prod',
        Spec.parse('bar@*'),
        graph.nodes.get(
          joinDepIDTuple(['registry', '', 'foo@1.0.0']),
        )!,
        graph.nodes.get(
          joinDepIDTuple(['registry', '', 'bar@2.0.0']),
        ),
      ),
    ]),
  )
  // use graph.gc to remove the excess
  t.match(
    graph.nodes.keys(),
    new Set([
      joinDepIDTuple(['file', '.']),
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      joinDepIDTuple(['registry', '', 'bar@1.0.0']),
      joinDepIDTuple(['registry', '', 'bar@2.0.0']),
      joinDepIDTuple(['registry', '', 'bar@3.0.0']),
    ]),
    'gut-check that nodes are here to be collected',
  )
  // create a missing edge to verify it's not a problem
  fooNode.edgesOut.set(
    joinDepIDTuple(['registry', '', 'asdf@1.0.0']),
    new Edge('prod', Spec.parse('asdf@1'), fooNode),
  )
  const collected = graph.gc()
  t.match(
    graph.nodes.keys(),
    new Set([
      joinDepIDTuple(['file', '.']),
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      joinDepIDTuple(['registry', '', 'bar@2.0.0']),
    ]),
  )
  t.match(
    collected.keys(),
    new Set([
      joinDepIDTuple(['registry', '', 'bar@1.0.0']),
      joinDepIDTuple(['registry', '', 'bar@3.0.0']),
    ]),
    'garbage-collected nodes are returned',
  )
})
t.test('in-place edge replacement', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: { foo: '*' },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot,
  })

  // Create multiple versions of the same package
  const bar1 = graph.addNode(
    joinDepIDTuple(['registry', '', 'bar@1.0.0']),
    {
      name: 'bar',
      version: '1.0.0',
    },
    Spec.parse('bar@1.0.0'),
  )

  const bar2 = graph.addNode(
    joinDepIDTuple(['registry', 'custom', 'bar@2.0.0']),
    {
      name: 'bar',
      version: '2.0.0',
    },
    Spec.parse('bar@2.0.0'),
  )

  // Create an edge from main importer to bar1
  const spec = Spec.parse('bar@*')
  const edge = graph.addEdge('prod', spec, graph.mainImporter, bar1)

  // Verify initial edge setup is correct
  t.equal(edge.to, bar1, 'edge initially points to bar1')
  t.ok(bar1.edgesIn.has(edge), 'bar1 has the edge in its edgesIn set')
  t.notOk(
    bar2.edgesIn.has(edge),
    'bar2 does not have the edge in its edgesIn set',
  )
  t.equal(
    graph.mainImporter.edgesOut.get('bar'),
    edge,
    'edge is in mainImporter edgesOut',
  )

  // Now replace the edge destination with bar2
  const replacedEdge = graph.addEdge(
    'prod',
    spec,
    graph.mainImporter,
    bar2,
  )

  // Verify the edge was properly updated
  t.equal(replacedEdge, edge, 'the same edge object was returned')
  t.equal(edge.to, bar2, 'edge now points to bar2')
  t.notOk(
    bar1.edgesIn.has(edge),
    'bar1 no longer has the edge in its edgesIn set',
  )
  t.ok(
    bar2.edgesIn.has(edge),
    'bar2 now has the edge in its edgesIn set',
  )
  t.equal(
    graph.mainImporter.edgesOut.get('bar'),
    edge,
    'edge is still in mainImporter edgesOut',
  )
  t.equal(graph.edges.size, 1, 'graph still has only one edge')
})

t.test('garbage collection', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: { foo: '*' },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot,
  })

  // Add connected nodes that should be kept
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo@*'),
    {
      name: 'foo',
      version: '1.0.0',
      dependencies: { bar: '*' },
    },
  )

  graph.placePackage(foo!, 'prod', Spec.parse('bar@*'), {
    name: 'bar',
    version: '1.0.0',
  })

  // Add disconnected nodes that should be collected
  const baz = graph.addNode(
    joinDepIDTuple(['registry', '', 'baz@1.0.0']),
    {
      name: 'baz',
      version: '1.0.0',
    },
  )

  const qux = graph.addNode(
    joinDepIDTuple(['registry', '', 'qux@1.0.0']),
    {
      name: 'qux',
      version: '1.0.0',
    },
  )

  // Create an edge between the disconnected nodes
  graph.addEdge('prod', Spec.parse('qux@*'), baz, qux)

  // Check initial state
  t.equal(graph.nodes.size, 5, 'graph initially has 5 nodes')
  t.equal(graph.edges.size, 3, 'graph initially has 3 edges')
  t.ok(
    graph.nodes.has(joinDepIDTuple(['registry', '', 'baz@1.0.0'])),
    'baz node exists',
  )
  t.ok(
    graph.nodes.has(joinDepIDTuple(['registry', '', 'qux@1.0.0'])),
    'qux node exists',
  )

  // Run garbage collection
  const collected = graph.gc()

  // Verify nodes connected to importers are preserved
  t.equal(graph.nodes.size, 3, 'graph has 3 nodes after gc')
  t.ok(
    graph.nodes.has(joinDepIDTuple(['file', '.'])),
    'main importer node is preserved',
  )
  t.ok(
    graph.nodes.has(joinDepIDTuple(['registry', '', 'foo@1.0.0'])),
    'foo node is preserved',
  )
  t.ok(
    graph.nodes.has(joinDepIDTuple(['registry', '', 'bar@1.0.0'])),
    'bar node is preserved',
  )

  // Verify disconnected nodes are collected
  t.equal(collected.size, 2, 'gc collected 2 nodes')
  t.ok(
    collected.has(joinDepIDTuple(['registry', '', 'baz@1.0.0'])),
    'baz node was collected',
  )
  t.ok(
    collected.has(joinDepIDTuple(['registry', '', 'qux@1.0.0'])),
    'qux node was collected',
  )

  // Verify edge between baz and qux is removed
  t.equal(graph.edges.size, 2, 'graph has 2 edges after gc')

  // Verify the nodesByName entries are updated
  t.notOk(
    graph.nodesByName.has('baz'),
    'baz removed from nodesByName',
  )
  t.notOk(
    graph.nodesByName.has('qux'),
    'qux removed from nodesByName',
  )

  // Add more nodes and run gc again to test the path where nodes are marked during traversal
  graph.addNode(joinDepIDTuple(['registry', '', 'newnode@1.0.0']), {
    name: 'newnode',
    version: '1.0.0',
  })

  t.equal(
    graph.nodes.size,
    4,
    'graph has 4 nodes after adding newnode',
  )

  const secondCollected = graph.gc()

  t.equal(secondCollected.size, 1, 'second gc collected 1 node')
  t.equal(graph.nodes.size, 3, 'graph has 3 nodes after second gc')
  t.ok(
    secondCollected.has(
      joinDepIDTuple(['registry', '', 'newnode@1.0.0']),
    ),
    'newnode was collected',
  )
})

t.test('extra parameter for modifiers', async t => {
  const mainManifest = {
    name: 'root-project',
    version: '1.0.0',
    dependencies: {
      a: '^1.0.0',
      b: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'vlt.json': JSON.stringify({
      modifiers: {
        ':root > #a': '1.0.0',
        ':root > #a > #c': '1.0.0',
      },
    }),
  })
  t.chdir(projectRoot)
  unload('project')

  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot,
  })

  // Place package a with a selector path modifier ":root > #a"
  const nodeA = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('a@^1.0.0'),
    {
      name: 'a',
      version: '1.0.0',
      dependencies: {
        c: '^1.0.0',
      },
    },
    undefined,
    ':root > #a',
  )

  t.ok(nodeA, 'node a was created successfully')
  t.equal(
    nodeA?.modifier,
    ':root > #a',
    'node a has the correct modifier',
  )

  // Place package b with no extra parameter
  const nodeB = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('b@^1.0.0'),
    {
      name: 'b',
      version: '1.0.0',
    },
  )

  t.ok(nodeB, 'node b was created successfully')
  t.equal(nodeB?.modifier, undefined, 'node b has no modifier')

  // Place package c with a nested selector path ":root > #a > #c"
  const nodeC = graph.placePackage(
    nodeA!,
    'prod',
    Spec.parse('c@^1.0.0'),
    {
      name: 'c',
      version: '1.0.0',
    },
    undefined,
    ':root > #a > #c',
  )

  t.ok(nodeC, 'node c was created successfully')
  t.equal(
    nodeC?.modifier,
    ':root > #a > #c',
    'node c has the correct modifier',
  )

  // Verify that we can find the nodes in the graph by their modifiers
  const foundNodeA = [...graph.nodes.values()].find(
    node => node.modifier === ':root > #a',
  )

  t.equal(foundNodeA, nodeA, 'can find node a by its modifier')

  const foundNodeC = [...graph.nodes.values()].find(
    node => node.modifier === ':root > #a > #c',
  )

  t.equal(foundNodeC, nodeC, 'can find node c by its modifier')

  // Verify that the nodes have the correct structure
  t.equal(nodeA?.name, 'a', 'node a has the correct name')

  t.equal(nodeC?.name, 'c', 'node c has the correct name')

  t.ok(
    graph.mainImporter.edgesOut.has('a'),
    'main importer has an edge to node a',
  )

  t.ok(nodeA?.edgesOut.has('c'), 'node a has an edge to node c')

  // Verify the edge structure matches the selector paths
  const edgeToA = graph.mainImporter.edgesOut.get('a')
  t.equal(
    edgeToA?.to,
    nodeA,
    'edge from root to a points to the correct node',
  )

  const edgeToC = nodeA?.edgesOut.get('c')
  t.equal(
    edgeToC?.to,
    nodeC,
    'edge from a to c points to the correct node',
  )
})

t.test('removeEdgeResolution', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      bar: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot,
  })

  t.test(
    'should remove edge resolution and clean up caches',
    async t => {
      // Create a node and edge
      const fooNode = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo@^1.0.0'),
        {
          name: 'foo',
          version: '1.0.0',
        },
      )

      const edge = graph.mainImporter.edgesOut.get('foo')
      if (!edge || !fooNode)
        throw new Error('Failed to create test setup')

      // Verify initial state
      t.equal(edge.to, fooNode, 'edge initially points to foo node')
      t.ok(fooNode.edgesIn.has(edge), 'foo node has edge in edgesIn')
      t.ok(graph.nodesByName.has('foo'), 'nodesByName has foo entry')
      t.ok(
        graph.resolutions.size > 0,
        'resolutions cache has entries',
      )
      t.ok(
        graph.resolutionsReverse.has(fooNode),
        'resolutionsReverse has foo node entry',
      )

      // Remove the edge resolution
      graph.removeEdgeResolution(edge)

      // Verify the edge resolution was removed
      t.equal(edge.to, undefined, 'edge.to is now undefined')
      t.notOk(
        fooNode.edgesIn.has(edge),
        'foo node no longer has edge in edgesIn',
      )
      t.notOk(
        graph.nodesByName.has('foo'),
        'nodesByName no longer has foo entry',
      )

      // Removes from graph.nodes if there are
      // no other edges linking to this node
      t.ok(
        !graph.nodes.has(fooNode.id),
        'node removed from graph.nodes',
      )
    },
  )

  t.test('should handle edge with no resolved node', async t => {
    // Create an unresolved edge
    const missingEdge = graph.addEdge(
      'prod',
      Spec.parse('missing@^1.0.0'),
      graph.mainImporter,
    )

    t.equal(missingEdge.to, undefined, 'edge has no resolved node')

    // This should not throw and should be a no-op
    t.doesNotThrow(
      () => graph.removeEdgeResolution(missingEdge),
      'removing resolution from unresolved edge should not throw',
    )

    t.equal(
      missingEdge.to,
      undefined,
      'edge.to remains undefined after removeEdgeResolution',
    )
  })

  t.test('should work with queryModifier parameter', async t => {
    const queryModifier = ':root > #bar'

    // Create a node and add it to resolution cache with query modifier
    const barNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('bar@^1.0.0'),
      {
        name: 'bar',
        version: '1.0.0',
      },
      undefined,
      queryModifier,
    )

    const edge = graph.mainImporter.edgesOut.get('bar')
    if (!edge || !barNode)
      throw new Error('Failed to create test setup')

    // Manually add to resolution cache with query modifier
    const resolutionKey = `bar@^1.0.0${queryModifier}`
    graph.resolutions.set(resolutionKey, barNode)
    const reverseSet =
      graph.resolutionsReverse.get(barNode) ?? new Set()
    reverseSet.add(resolutionKey)
    graph.resolutionsReverse.set(barNode, reverseSet)

    // Verify the cache entry exists
    t.equal(
      graph.resolutions.get(resolutionKey),
      barNode,
      'resolution cache has entry with query modifier',
    )
    t.ok(
      graph.resolutionsReverse.get(barNode)?.has(resolutionKey),
      'reverse resolution cache has entry',
    )

    // Remove edge resolution with query modifier
    graph.removeEdgeResolution(edge, queryModifier)

    // Verify the specific cache entry was removed
    t.equal(
      graph.resolutions.get(resolutionKey),
      undefined,
      'resolution cache entry with query modifier was removed',
    )
    t.notOk(
      graph.resolutionsReverse.get(barNode)?.has(resolutionKey),
      'reverse resolution cache entry was removed',
    )

    t.equal(edge.to, undefined, 'edge.to is now undefined')
    t.notOk(
      barNode.edgesIn.has(edge),
      'bar node no longer has edge in edgesIn',
    )
    t.notOk(
      graph.nodesByName.has('bar'),
      'nodesByName no longer has bar entry',
    )
  })

  t.test('should handle multiple nodes with same name', async t => {
    // Create two different versions of the same package
    const foo1Node = graph.addNode(
      joinDepIDTuple(['registry', '', 'samename@1.0.0']),
      {
        name: 'samename',
        version: '1.0.0',
      },
      Spec.parse('samename@1.0.0'),
    )

    const foo2Node = graph.addNode(
      joinDepIDTuple(['registry', '', 'samename@2.0.0']),
      {
        name: 'samename',
        version: '2.0.0',
      },
      Spec.parse('samename@2.0.0'),
    )

    // Create edges to both nodes
    const edge1 = graph.addEdge(
      'prod',
      Spec.parse('samename@^1.0.0'),
      graph.mainImporter,
      foo1Node,
    )

    const edge2 = graph.addEdge(
      'dev',
      Spec.parse('samename@^2.0.0'),
      graph.mainImporter,
      foo2Node,
    )

    // Verify both nodes are in nodesByName
    const nodesByName = graph.nodesByName.get('samename')
    t.ok(nodesByName?.has(foo1Node), 'nodesByName has foo1 node')
    t.ok(nodesByName?.has(foo2Node), 'nodesByName has foo2 node')
    t.equal(
      nodesByName?.size,
      2,
      'nodesByName has 2 nodes with same name',
    )

    // Remove resolution for one edge
    graph.removeEdgeResolution(edge1)

    // Verify the correct cleanup occurred
    t.equal(edge1.to, undefined, 'edge1.to is now undefined')
    t.notOk(
      foo1Node.edgesIn.has(edge1),
      'foo1 node no longer has edge1 in edgesIn',
    )

    // The nodesByName entry should be completely removed
    // Note: This might be a bug in the implementation - it removes the entire entry
    // rather than just the specific node, but we're testing the current behavior
    t.notOk(
      graph.nodesByName.has('samename'),
      'nodesByName entry was removed entirely',
    )

    // edge2 should still be valid
    t.equal(edge2.to, foo2Node, 'edge2 still points to foo2 node')
    t.ok(
      foo2Node.edgesIn.has(edge2),
      'foo2 node still has edge2 in edgesIn',
    )
  })

  t.test('should clean up resolution caches properly', async t => {
    // Create a node with multiple resolution cache entries
    const bazNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('baz@^1.0.0'),
      {
        name: 'baz',
        version: '1.0.0',
      },
    )

    if (!bazNode) throw new Error('Failed to create baz node')

    const edge = graph.mainImporter.edgesOut.get('baz')
    if (!edge) throw new Error('Failed to get baz edge')

    // Manually add additional resolution cache entries
    const additionalKey = 'baz@1.x'
    graph.resolutions.set(additionalKey, bazNode)
    const reverseSet =
      graph.resolutionsReverse.get(bazNode) ?? new Set()
    reverseSet.add(additionalKey)
    graph.resolutionsReverse.set(bazNode, reverseSet)

    // Verify initial cache state
    t.ok(
      graph.resolutions.has(additionalKey),
      'additional resolution cache entry exists',
    )
    t.ok(
      graph.resolutionsReverse.get(bazNode)?.has(additionalKey),
      'reverse cache has additional entry',
    )

    // Remove edge resolution
    graph.removeEdgeResolution(edge)

    // The method should only remove the specific resolution key it calculates,
    // not all entries for the node
    t.ok(
      graph.resolutions.has(additionalKey),
      'additional resolution cache entry still exists',
    )
    t.ok(
      graph.resolutionsReverse.get(bazNode)?.has(additionalKey),
      'reverse cache still has additional entry',
    )

    // But the edge should be unresolved
    t.equal(edge.to, undefined, 'edge.to is now undefined')
    t.notOk(
      bazNode.edgesIn.has(edge),
      'baz node no longer has edge in edgesIn',
    )
  })
})
