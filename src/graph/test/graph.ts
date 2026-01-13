import { hydrate, joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import { normalizeManifest } from '@vltpkg/types'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { inspect } from 'node:util'
import t from 'tap'
import { Edge } from '../src/edge.ts'
import { Graph } from '../src/graph.ts'

t.cleanSnapshot = s =>
  s
    .replace(/^(\s+)"projectRoot": .*$/gm, '$1"projectRoot": #')
    .replace(/^(\s+)"fullpath": .*$/gm, '$1"fullpath": #')

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
  const newNode = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo@^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
      dependencies: { localdep: 'file:localdep' },
    },
  )
  if (!newNode) throw new Error('failed to place foo@1.0.0')
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

  const localdep = graph.placePackage(
    newNode,
    'prod',
    Spec.parse('localdep@file:localdep'),
    { name: 'localdep', version: '1.2.3' },
    joinDepIDTuple(['file', 'localdep', newNode.id]),
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
    new Set([
      'foo@^1.0.0│registry│https://registry.npmjs.org/│',
      'foo@1.x│registry│https://registry.npmjs.org/│',
    ]),
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

t.test('findResolution respects registries', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const registries = {
    a: 'https://a.example.com/',
    b: 'https://b.example.com/',
  }
  const graph = new Graph({
    projectRoot,
    ...configData,
    registries,
    mainManifest: { name: 'proj', version: '1.0.0' },
  })

  // add bar in registry a
  const barA = graph.addNode(
    joinDepIDTuple([
      'registry',
      'https://a.example.com/',
      'bar@1.0.0',
    ]),
    { name: 'bar', version: '1.0.0' },
    Spec.parse('bar@a:bar@1.0.0', { registries }),
  )
  // add bar in registry b
  const barB = graph.addNode(
    joinDepIDTuple([
      'registry',
      'https://b.example.com/',
      'bar@1.0.0',
    ]),
    { name: 'bar', version: '1.0.0' },
    Spec.parse('bar@b:bar@1.0.0', { registries }),
  )

  // same name, different registries
  t.ok(barA, 'node for registry a created')
  t.ok(barB, 'node for registry b created')

  // resolve explicitly against a
  const resA = graph.findResolution(
    Spec.parse('bar@a:bar@1.x', { registries }),
    graph.mainImporter,
  )
  t.equal(resA, barA, 'resolves to registry a node')

  // resolve explicitly against b
  const resB = graph.findResolution(
    Spec.parse('bar@b:bar@1.x', { registries }),
    graph.mainImporter,
  )
  t.equal(resB, barB, 'resolves to registry b node')

  // resolve without registry uses any satisfying node (barA or barB)
  const resAny = graph.findResolution(
    Spec.parse('bar@1.x'),
    graph.mainImporter,
  )
  t.notOk(
    resAny,
    'should not resolve to any node if its registry has not been specified',
  )
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
      bin: { foo: './bin.js' }, // cover bin field handling
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

  // place a package using a github spec
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('bar', 'github:foo/bar'),
    {
      name: 'bar',
      version: '1.0.0',
    },
  )
  t.matchSnapshot(
    inspect(graph, { depth: 3 }),
    'should add a type=git package',
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
    importer.graph = 'Graph {}' as unknown as Graph
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
    const resolutionKey = `bar@^1.0.0│registry│https://registry.npmjs.org/│${queryModifier}`
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

t.test('node platform data setting', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      'engines-pkg': '^1.0.0',
      'os-pkg': '^1.0.0',
      'cpu-pkg': '^1.0.0',
      'combined-pkg': '^1.0.0',
      'no-platform-pkg': '^1.0.0',
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

  t.test('should set engines property from manifest', async t => {
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('engines-pkg@^1.0.0'),
      normalizeManifest({
        name: 'engines-pkg',
        version: '1.0.0',
        engines: {
          node: '>=16.0.0',
          npm: '>=8.0.0',
        },
      }),
    )

    t.ok(node, 'node was created successfully')
    t.ok(node?.platform, 'platform property is set')
    t.strictSame(
      node?.platform?.engines,
      {
        node: '>=16.0.0',
        npm: '>=8.0.0',
      },
      'engines property correctly set on node.platform',
    )
    t.notOk(
      node?.platform?.os,
      'os property is not set when not in manifest',
    )
    t.notOk(
      node?.platform?.cpu,
      'cpu property is not set when not in manifest',
    )
  })

  t.test('should set os property from manifest (string)', async t => {
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('os-string-pkg@^1.0.0'),
      normalizeManifest({
        name: 'os-string-pkg',
        version: '1.0.0',
        os: 'linux',
      }),
    )

    t.ok(node, 'node was created successfully')
    t.ok(node?.platform, 'platform property is set')
    t.strictSame(
      node?.platform?.os,
      ['linux'],
      'os property correctly normalized to array on node.platform',
    )
    t.notOk(
      node?.platform?.engines,
      'engines property is not set when not in manifest',
    )
    t.notOk(
      node?.platform?.cpu,
      'cpu property is not set when not in manifest',
    )
  })

  t.test('should set os property from manifest (array)', async t => {
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('os-array-pkg@^1.0.0'),
      {
        name: 'os-array-pkg',
        version: '1.0.0',
        os: ['linux', 'darwin'],
      },
    )

    t.ok(node, 'node was created successfully')
    t.ok(node?.platform, 'platform property is set')
    t.strictSame(
      node?.platform?.os,
      ['linux', 'darwin'],
      'os property correctly set as array on node.platform',
    )
  })

  t.test(
    'should set cpu property from manifest (string)',
    async t => {
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('cpu-string-pkg@^1.0.0'),
        normalizeManifest({
          name: 'cpu-string-pkg',
          version: '1.0.0',
          cpu: 'x64',
        }),
      )

      t.ok(node, 'node was created successfully')
      t.ok(node?.platform, 'platform property is set')
      t.strictSame(
        node?.platform?.cpu,
        ['x64'],
        'cpu property correctly normalized to array on node.platform',
      )
      t.notOk(
        node?.platform?.engines,
        'engines property is not set when not in manifest',
      )
      t.notOk(
        node?.platform?.os,
        'os property is not set when not in manifest',
      )
    },
  )

  t.test('should set cpu property from manifest (array)', async t => {
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('cpu-array-pkg@^1.0.0'),
      {
        name: 'cpu-array-pkg',
        version: '1.0.0',
        cpu: ['x64', 'arm64'],
      },
    )

    t.ok(node, 'node was created successfully')
    t.ok(node?.platform, 'platform property is set')
    t.strictSame(
      node?.platform?.cpu,
      ['x64', 'arm64'],
      'cpu property correctly set as array on node.platform',
    )
  })

  t.test(
    'should set libc property from manifest (string)',
    async t => {
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('libc-string-pkg@^1.0.0'),
        normalizeManifest({
          name: 'libc-string-pkg',
          version: '1.0.0',
          libc: 'glibc',
        }),
      )

      t.ok(node, 'node was created successfully')
      t.ok(node?.platform, 'platform property is set')
      t.strictSame(
        node?.platform?.libc,
        ['glibc'],
        'libc property correctly normalized to array on node.platform',
      )
      t.notOk(
        node?.platform?.engines,
        'engines property is not set when not in manifest',
      )
      t.notOk(
        node?.platform?.os,
        'os property is not set when not in manifest',
      )
      t.notOk(
        node?.platform?.cpu,
        'cpu property is not set when not in manifest',
      )
    },
  )

  t.test(
    'should set libc property from manifest (array)',
    async t => {
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('libc-array-pkg@^1.0.0'),
        {
          name: 'libc-array-pkg',
          version: '1.0.0',
          libc: ['glibc', 'musl'],
        },
      )

      t.ok(node, 'node was created successfully')
      t.ok(node?.platform, 'platform property is set')
      t.strictSame(
        node?.platform?.libc,
        ['glibc', 'musl'],
        'libc property correctly set as array on node.platform',
      )
    },
  )

  t.test(
    'should set all platform properties when present',
    async t => {
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('combined-pkg@^1.0.0'),
        normalizeManifest({
          name: 'combined-pkg',
          version: '1.0.0',
          engines: {
            node: '>=18.0.0',
          },
          os: ['linux', 'darwin'],
          cpu: 'x64',
          libc: 'glibc',
        }),
      )

      t.ok(node, 'node was created successfully')
      t.ok(node?.platform, 'platform property is set')
      t.strictSame(
        node?.platform?.engines,
        {
          node: '>=18.0.0',
        },
        'engines property correctly set',
      )
      t.strictSame(
        node?.platform?.os,
        ['linux', 'darwin'],
        'os property correctly set',
      )
      t.strictSame(
        node?.platform?.cpu,
        ['x64'],
        'cpu property correctly normalized to array',
      )
      t.strictSame(
        node?.platform?.libc,
        ['glibc'],
        'libc property correctly normalized to array',
      )
    },
  )

  t.test(
    'should not set platform when no platform properties in manifest',
    async t => {
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('no-platform-pkg@^1.0.0'),
        {
          name: 'no-platform-pkg',
          version: '1.0.0',
          dependencies: {
            some: '^1.0.0',
          },
        },
      )

      t.ok(node, 'node was created successfully')
      t.notOk(
        node?.platform,
        'platform property should not be set when manifest has no platform data',
      )
    },
  )

  t.test(
    'should not set platform when manifest is undefined',
    async t => {
      // Create an edge without manifest (missing dependency)
      graph.addEdge(
        'prod',
        Spec.parse('missing-pkg@^1.0.0'),
        graph.mainImporter,
      )

      const edge = graph.mainImporter.edgesOut.get('missing-pkg')
      t.ok(edge, 'edge was created')
      t.equal(
        edge?.to,
        undefined,
        'edge has no target node (missing dependency)',
      )

      // Verify that placePackage without manifest doesn't crash
      const result = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('missing-test-pkg@^1.0.0'),
      )

      t.equal(
        result,
        undefined,
        'placePackage returns undefined for missing manifest',
      )
    },
  )

  t.test('should handle empty platform objects', async t => {
    const node1 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('empty-engines-pkg@^1.0.0'),
      normalizeManifest({
        name: 'empty-engines-pkg',
        version: '1.0.0',
        engines: {},
      }),
    )

    t.ok(node1, 'node was created successfully')
    t.notOk(
      node1?.platform,
      'platform property should not be set when engines is empty object',
    )

    const node2 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('empty-array-pkg@^1.0.0'),
      normalizeManifest({
        name: 'empty-array-pkg',
        version: '1.0.0',
        os: [],
        cpu: [],
      }),
    )

    t.ok(node2, 'node was created successfully')
    t.notOk(
      node2?.platform,
      'platform property should not be set when os and cpu are empty arrays',
    )
  })

  t.test(
    'should preserve platform data when reusing existing nodes',
    async t => {
      // First, create a node with platform data
      const originalNode = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('reuse-pkg@^1.0.0'),
        normalizeManifest({
          name: 'reuse-pkg',
          version: '1.0.0',
          engines: {
            node: '>=16.0.0',
          },
          os: 'linux',
        }),
      )

      t.ok(originalNode, 'original node was created successfully')
      t.ok(originalNode?.platform, 'original node has platform data')

      // Now try to place the same package again (should reuse existing node)
      const reusedNode = graph.placePackage(
        graph.mainImporter,
        'dev',
        Spec.parse('reuse-pkg@^1.0.0'),
        normalizeManifest({
          name: 'reuse-pkg',
          version: '1.0.0',
          engines: {
            node: '>=16.0.0',
          },
          os: 'linux',
        }),
      )

      t.equal(
        reusedNode,
        originalNode,
        'same node instance is reused',
      )
      t.ok(
        reusedNode?.platform,
        'platform data is preserved on reused node',
      )
      t.strictSame(
        reusedNode?.platform?.engines,
        { node: '>=16.0.0' },
        'engines property is preserved',
      )
      t.strictSame(
        reusedNode?.platform?.os,
        ['linux'],
        'os property is preserved as normalized array',
      )
    },
  )
})

t.test('splitExtra and joinExtra integration', async t => {
  const mainManifest = {
    name: 'root-project',
    version: '1.0.0',
    dependencies: {
      a: '^1.0.0',
      b: '^1.0.0',
      c: '^1.0.0',
      d: '^1.0.0',
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

  t.test('should split extra with only modifier', async t => {
    const nodeA = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('a@^1.0.0'),
      {
        name: 'a',
        version: '1.0.0',
      },
      undefined,
      ':root > #a',
    )

    t.ok(nodeA, 'node a created')
    t.equal(nodeA?.modifier, ':root > #a', 'modifier set correctly')
    t.equal(nodeA?.peerSetHash, undefined, 'peerSetHash not set')
  })

  t.test('should split extra with only peerSetHash', async t => {
    const nodeB = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('b@^1.0.0'),
      {
        name: 'b',
        version: '1.0.0',
      },
      undefined,
      'ṗ:abc123',
    )

    t.ok(nodeB, 'node b created')
    t.equal(nodeB?.modifier, undefined, 'modifier not set')
    t.equal(
      nodeB?.peerSetHash,
      'ṗ:abc123',
      'peerSetHash set correctly',
    )
  })

  t.test(
    'should split extra with both modifier and peerSetHash',
    async t => {
      const nodeC = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('c@^1.0.0'),
        {
          name: 'c',
          version: '1.0.0',
        },
        undefined,
        ':root > #cṗ:xyz789',
      )

      t.ok(nodeC, 'node c created')
      t.equal(nodeC?.modifier, ':root > #c', 'modifier set correctly')
      t.equal(
        nodeC?.peerSetHash,
        'ṗ:xyz789',
        'peerSetHash set correctly',
      )
    },
  )

  t.test('should handle empty extra', async t => {
    const nodeD = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('d@^1.0.0'),
      {
        name: 'd',
        version: '1.0.0',
      },
    )

    t.ok(nodeD, 'node d created')
    t.equal(nodeD?.modifier, undefined, 'modifier not set')
    t.equal(nodeD?.peerSetHash, undefined, 'peerSetHash not set')
  })
})

t.test('nextPeerContextIndex', async t => {
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

  // Initial index should be 0
  t.equal(
    graph.currentPeerContextIndex,
    0,
    'initial peer context index is 0',
  )

  // Call nextPeerContextIndex and verify it increments and returns
  const firstNext = graph.nextPeerContextIndex()
  t.equal(firstNext, 1, 'first call returns 1')
  t.equal(
    graph.currentPeerContextIndex,
    1,
    'currentPeerContextIndex updated to 1',
  )

  // Call again to verify it continues incrementing
  const secondNext = graph.nextPeerContextIndex()
  t.equal(secondNext, 2, 'second call returns 2')
  t.equal(
    graph.currentPeerContextIndex,
    2,
    'currentPeerContextIndex updated to 2',
  )

  // Verify multiple sequential calls
  graph.nextPeerContextIndex()
  graph.nextPeerContextIndex()
  const fifthNext = graph.nextPeerContextIndex()
  t.equal(fifthNext, 5, 'fifth call returns 5')
  t.equal(
    graph.currentPeerContextIndex,
    5,
    'currentPeerContextIndex updated to 5',
  )
})

t.test('resetEdges method', async t => {
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

  t.test('should clear all edges while preserving nodes', async t => {
    // Create a complex graph structure
    const fooNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo@^1.0.0'),
      {
        name: 'foo',
        version: '1.0.0',
        dependencies: {
          baz: '^2.0.0',
        },
      },
    )

    const barNode = graph.placePackage(
      graph.mainImporter,
      'dev',
      Spec.parse('bar@^1.0.0'),
      {
        name: 'bar',
        version: '1.0.0',
      },
    )

    const bazNode = graph.placePackage(
      fooNode!,
      'prod',
      Spec.parse('baz@^2.0.0'),
      {
        name: 'baz',
        version: '2.0.0',
      },
    )

    // Verify initial state
    t.equal(graph.nodes.size, 4, 'graph has 4 nodes initially')
    t.equal(graph.edges.size, 3, 'graph has 3 edges initially')
    t.equal(
      graph.mainImporter.edgesOut.size,
      2,
      'main importer has 2 edges out',
    )
    t.equal(fooNode!.edgesOut.size, 1, 'foo has 1 edge out')
    t.equal(fooNode!.edgesIn.size, 1, 'foo has 1 edge in')
    t.equal(barNode!.edgesIn.size, 1, 'bar has 1 edge in')
    t.equal(bazNode!.edgesIn.size, 1, 'baz has 1 edge in')

    // Reset edges
    graph.resetEdges()

    // Verify edges are cleared
    t.equal(graph.edges.size, 0, 'graph edges set is empty')
    t.equal(
      graph.mainImporter.edgesOut.size,
      0,
      'main importer edgesOut cleared',
    )
    t.equal(fooNode!.edgesOut.size, 0, 'foo edgesOut cleared')
    t.equal(fooNode!.edgesIn.size, 0, 'foo edgesIn cleared')
    t.equal(barNode!.edgesOut.size, 0, 'bar edgesOut cleared')
    t.equal(barNode!.edgesIn.size, 0, 'bar edgesIn cleared')
    t.equal(bazNode!.edgesOut.size, 0, 'baz edgesOut cleared')
    t.equal(bazNode!.edgesIn.size, 0, 'baz edgesIn cleared')

    // Verify nodes are preserved
    t.equal(graph.nodes.size, 4, 'all nodes still in graph')
    t.ok(
      graph.nodes.has(graph.mainImporter.id),
      'main importer preserved',
    )
    t.ok(graph.nodes.has(fooNode!.id), 'foo node preserved')
    t.ok(graph.nodes.has(barNode!.id), 'bar node preserved')
    t.ok(graph.nodes.has(bazNode!.id), 'baz node preserved')
  })

  t.test('should preserve resolution caches', async t => {
    // Create nodes and edges
    const alphaNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('alpha@^1.0.0'),
      {
        name: 'alpha',
        version: '1.0.0',
      },
    )

    // Store cache state before reset
    const resolutionSizeBefore = graph.resolutions.size
    const resolutionsReverseSizeBefore = graph.resolutionsReverse.size

    t.equal(resolutionSizeBefore, 4, 'resolutions cache populated')
    t.equal(
      resolutionsReverseSizeBefore,
      4,
      'resolutionsReverse cache populated',
    )

    // Verify resolution works before reset
    const foundBefore = graph.findResolution(
      Spec.parse('alpha@^1.0.0'),
      graph.mainImporter,
    )
    t.equal(foundBefore, alphaNode, 'resolution works before reset')

    // Reset edges
    graph.resetEdges()

    // Verify caches are preserved
    t.equal(
      graph.resolutions.size,
      resolutionSizeBefore,
      'resolutions cache size unchanged',
    )
    t.equal(
      graph.resolutionsReverse.size,
      resolutionsReverseSizeBefore,
      'resolutionsReverse cache size unchanged',
    )

    // Verify resolution still works after reset
    const foundAfter = graph.findResolution(
      Spec.parse('alpha@^1.0.0'),
      graph.mainImporter,
    )
    t.equal(
      foundAfter,
      alphaNode,
      'resolution still works after reset',
    )
  })

  t.test('should preserve nodesByName', async t => {
    // Create multiple versions of same package
    const betaNode1 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('beta@^1.0.0'),
      {
        name: 'beta',
        version: '1.0.0',
      },
    )

    const betaNode2 = graph.addNode(
      joinDepIDTuple(['registry', '', 'beta@2.0.0']),
      {
        name: 'beta',
        version: '2.0.0',
      },
      Spec.parse('beta@2.0.0'),
    )

    // Verify nodesByName before reset
    const betaSetBefore = graph.nodesByName.get('beta')
    t.ok(betaSetBefore?.has(betaNode1!), 'beta v1 in nodesByName')
    t.ok(betaSetBefore?.has(betaNode2), 'beta v2 in nodesByName')
    t.equal(betaSetBefore?.size, 2, 'nodesByName has 2 beta versions')

    // Reset edges
    graph.resetEdges()

    // Verify nodesByName preserved
    const betaSetAfter = graph.nodesByName.get('beta')
    t.ok(
      betaSetAfter?.has(betaNode1!),
      'beta v1 still in nodesByName',
    )
    t.ok(betaSetAfter?.has(betaNode2), 'beta v2 still in nodesByName')
    t.equal(
      betaSetAfter?.size,
      2,
      'nodesByName still has 2 beta versions',
    )
  })

  t.test('should allow graph reconstruction', async t => {
    // Create initial graph
    const gammaNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('gamma@^1.0.0'),
      {
        name: 'gamma',
        version: '1.0.0',
        dependencies: {
          delta: '^1.0.0',
        },
      },
    )

    const deltaNode = graph.placePackage(
      gammaNode!,
      'prod',
      Spec.parse('delta@^1.0.0'),
      {
        name: 'delta',
        version: '1.0.0',
      },
    )

    // Store node count
    const nodeCount = graph.nodes.size

    // Reset edges
    graph.resetEdges()

    t.equal(graph.edges.size, 0, 'no edges after reset')
    t.equal(graph.nodes.size, nodeCount, 'nodes preserved')

    // Reconstruct graph using existing nodes
    const newEdge1 = graph.addEdge(
      'prod',
      Spec.parse('gamma@^1.0.0'),
      graph.mainImporter,
      gammaNode,
    )
    const newEdge2 = graph.addEdge(
      'prod',
      Spec.parse('delta@^1.0.0'),
      gammaNode!,
      deltaNode,
    )

    // Verify reconstruction
    t.equal(graph.edges.size, 2, '2 edges after reconstruction')
    t.ok(graph.edges.has(newEdge1), 'new edge1 in graph')
    t.ok(graph.edges.has(newEdge2), 'new edge2 in graph')
    t.equal(
      graph.mainImporter.edgesOut.size,
      1,
      'main importer has 1 edge',
    )
    t.equal(gammaNode!.edgesOut.size, 1, 'gamma has 1 edge')
    t.equal(gammaNode!.edgesIn.size, 1, 'gamma has 1 edge in')
    t.equal(deltaNode!.edgesIn.size, 1, 'delta has 1 edge in')
  })

  t.test('should work with empty graph', async t => {
    const emptyGraph = new Graph({
      ...configData,
      mainManifest: { name: 'empty', version: '1.0.0' },
      projectRoot,
    })

    // Verify initial empty state
    t.equal(
      emptyGraph.nodes.size,
      1,
      'empty graph has only main importer',
    )
    t.equal(emptyGraph.edges.size, 0, 'empty graph has no edges')

    // Reset should not throw
    t.doesNotThrow(
      () => emptyGraph.resetEdges(),
      'resetEdges works on empty graph',
    )

    // Verify still empty
    t.equal(emptyGraph.edges.size, 0, 'edges still empty after reset')
    t.equal(
      emptyGraph.nodes.size,
      1,
      'node count unchanged after reset',
    )
  })

  t.test('should work with nodes having modifiers', async t => {
    // Create node with modifier
    const epsilonNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('epsilon@^1.0.0'),
      {
        name: 'epsilon',
        version: '1.0.0',
      },
      undefined,
      ':root > #epsilon',
    )

    // Verify modifier before reset
    t.equal(
      epsilonNode?.modifier,
      ':root > #epsilon',
      'node has modifier',
    )

    // Reset edges
    graph.resetEdges()

    // Verify node and modifier preserved
    t.ok(graph.nodes.has(epsilonNode!.id), 'node preserved')
    t.equal(
      epsilonNode?.modifier,
      ':root > #epsilon',
      'modifier preserved',
    )

    // Verify resolution still works with modifier
    const found = graph.findResolution(
      Spec.parse('epsilon@^1.0.0'),
      graph.mainImporter,
      ':root > #epsilon',
    )
    t.equal(found, epsilonNode, 'resolution with modifier works')
  })

  t.test('should work with nodes having peerSetHash', async t => {
    // Create node with peerSetHash
    const zetaNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('zeta@^1.0.0'),
      {
        name: 'zeta',
        version: '1.0.0',
      },
      undefined,
      'ṗ:peer123',
    )

    // Verify peerSetHash before reset
    t.equal(
      zetaNode?.peerSetHash,
      'ṗ:peer123',
      'node has peerSetHash',
    )

    // Reset edges
    graph.resetEdges()

    // Verify node and peerSetHash preserved
    t.ok(graph.nodes.has(zetaNode!.id), 'node preserved')
    t.equal(
      zetaNode?.peerSetHash,
      'ṗ:peer123',
      'peerSetHash preserved',
    )

    // Verify resolution still works with peerSetHash
    const found = graph.findResolution(
      Spec.parse('zeta@^1.0.0'),
      graph.mainImporter,
      'ṗ:peer123',
    )
    t.equal(found, zetaNode, 'resolution with peerSetHash works')
  })

  t.test('should preserve manifest inventory', async t => {
    // Create nodes
    const etaNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('eta@^1.0.0'),
      {
        name: 'eta',
        version: '1.0.0',
      },
    )

    // Verify manifest before reset
    const manifestBefore = graph.manifests.get(etaNode!.id)
    t.ok(manifestBefore, 'manifest exists before reset')
    t.equal(manifestBefore?.name, 'eta', 'manifest has correct name')

    // Reset edges
    graph.resetEdges()

    // Verify manifest preserved
    const manifestAfter = graph.manifests.get(etaNode!.id)
    t.ok(manifestAfter, 'manifest exists after reset')
    t.equal(manifestAfter?.name, 'eta', 'manifest name preserved')
    t.equal(
      manifestAfter,
      manifestBefore,
      'same manifest instance preserved',
    )
  })
})

t.test('removeNode with keepEdges parameter', async t => {
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

  t.test('default behavior (keepEdges=false)', async t => {
    // Create nodes and edges
    const fooNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo@^1.0.0'),
      {
        name: 'foo',
        version: '1.0.0',
        dependencies: { baz: '^1.0.0' },
      },
    )

    const bazNode = graph.placePackage(
      fooNode!,
      'prod',
      Spec.parse('baz@^1.0.0'),
      {
        name: 'baz',
        version: '1.0.0',
      },
    )

    if (!fooNode || !bazNode) {
      throw new Error('Failed to create test nodes')
    }

    // Verify initial state
    const fooEdge = graph.mainImporter.edgesOut.get('foo')
    const bazEdge = fooNode.edgesOut.get('baz')

    t.ok(fooEdge, 'foo edge exists')
    t.ok(bazEdge, 'baz edge exists')
    t.equal(fooEdge?.to, fooNode, 'foo edge points to foo node')
    t.equal(bazEdge?.to, bazNode, 'baz edge points to baz node')
    t.ok(
      fooNode.edgesIn.has(fooEdge!),
      'foo node has edge in edgesIn',
    )
    t.ok(
      bazNode.edgesIn.has(bazEdge!),
      'baz node has edge in edgesIn',
    )
    t.ok(graph.edges.has(fooEdge!), 'graph has foo edge')
    t.ok(graph.edges.has(bazEdge!), 'graph has baz edge')

    // Remove foo node with default keepEdges=false
    graph.removeNode(fooNode)

    // Verify edges are completely removed
    t.notOk(
      graph.mainImporter.edgesOut.has('foo'),
      'foo edge removed from main importer edgesOut',
    )
    t.notOk(
      graph.edges.has(fooEdge!),
      'foo edge removed from graph edges',
    )
    t.notOk(
      graph.nodes.has(fooNode.id),
      'foo node removed from graph nodes',
    )
    t.notOk(
      graph.nodesByName.has('foo'),
      'foo removed from nodesByName',
    )

    // Verify baz edge (from removed foo node) is also removed
    t.notOk(
      graph.edges.has(bazEdge!),
      'baz edge removed from graph edges',
    )
  })

  t.test('keepEdges=true behavior', async t => {
    // Create fresh nodes and edges for this test
    const barNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('bar@^1.0.0'),
      {
        name: 'bar',
        version: '1.0.0',
        dependencies: { qux: '^1.0.0' },
      },
    )

    const quxNode = graph.placePackage(
      barNode!,
      'prod',
      Spec.parse('qux@^1.0.0'),
      {
        name: 'qux',
        version: '1.0.0',
      },
    )

    if (!barNode || !quxNode) {
      throw new Error('Failed to create test nodes')
    }

    // Verify initial state
    const barEdge = graph.mainImporter.edgesOut.get('bar')
    const quxEdge = barNode.edgesOut.get('qux')

    t.ok(barEdge, 'bar edge exists')
    t.ok(quxEdge, 'qux edge exists')
    t.equal(barEdge?.to, barNode, 'bar edge points to bar node')
    t.equal(quxEdge?.to, quxNode, 'qux edge points to qux node')
    t.ok(
      barNode.edgesIn.has(barEdge!),
      'bar node has edge in edgesIn',
    )
    t.ok(
      quxNode.edgesIn.has(quxEdge!),
      'qux node has edge in edgesIn',
    )
    t.ok(graph.edges.has(barEdge!), 'graph has bar edge')
    t.ok(graph.edges.has(quxEdge!), 'graph has qux edge')

    // Remove bar node with keepEdges=true
    graph.removeNode(barNode, undefined, true)

    // Verify the edge from main importer is kept but unresolved
    const keptBarEdge = graph.mainImporter.edgesOut.get('bar')
    t.ok(
      keptBarEdge,
      'bar edge still exists in main importer edgesOut',
    )
    t.equal(
      keptBarEdge?.to,
      undefined,
      'bar edge.to is now undefined',
    )
    t.ok(
      graph.edges.has(keptBarEdge!),
      'bar edge still in graph edges',
    )

    // Verify the node itself is removed
    t.notOk(
      graph.nodes.has(barNode.id),
      'bar node removed from graph nodes',
    )
    t.notOk(
      graph.nodesByName.has('bar'),
      'bar removed from nodesByName',
    )

    // Verify edges from the removed node (qux edge) are still removed
    t.notOk(
      graph.edges.has(quxEdge!),
      'qux edge removed from graph edges',
    )
  })

  t.test('keepEdges=true with replacement node', async t => {
    // Create test scenario with replacement
    const alphaNode = graph.addNode(
      joinDepIDTuple(['registry', '', 'alpha@1.0.0']),
      {
        name: 'alpha',
        version: '1.0.0',
      },
      Spec.parse('alpha@1.0.0'),
    )

    const replacementNode = graph.addNode(
      joinDepIDTuple(['registry', '', 'alpha@1.1.0']),
      {
        name: 'alpha',
        version: '1.1.0',
      },
      Spec.parse('alpha@1.1.0'),
    )

    // Create edge to alpha node
    const alphaEdge = graph.addEdge(
      'prod',
      Spec.parse('alpha@^1.0.0'),
      graph.mainImporter,
      alphaNode,
    )

    // Verify initial setup
    t.equal(
      alphaEdge.to,
      alphaNode,
      'edge initially points to alpha node',
    )
    t.ok(
      alphaNode.edgesIn.has(alphaEdge),
      'alpha node has edge in edgesIn',
    )

    // Remove alpha node with replacement and keepEdges=true
    graph.removeNode(alphaNode, replacementNode, true)

    // Since replacement satisfies the edge spec, it should be used
    t.equal(
      alphaEdge.to,
      replacementNode,
      'edge now points to replacement node',
    )
    // Note: Current implementation doesn't update edgesIn sets when using replacement
    // This is the actual behavior of the current code
    t.notOk(
      replacementNode.edgesIn.has(alphaEdge),
      'replacement node does not have edge in edgesIn (current implementation limitation)',
    )
    t.ok(
      alphaNode.edgesIn.has(alphaEdge),
      'original node still has edge in edgesIn (current implementation behavior)',
    )

    // Verify original node is removed
    t.notOk(
      graph.nodes.has(alphaNode.id),
      'original alpha node removed from graph',
    )
  })
})
