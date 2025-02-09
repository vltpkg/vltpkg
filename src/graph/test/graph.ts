import { hydrate, joinDepIDTuple } from '@vltpkg/dep-id'
import { kCustomInspect, Spec, type SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { inspect } from 'node:util'
import t from 'tap'
import { Edge } from '../src/edge.ts'
import { Graph } from '../src/graph.ts'
import { type GraphLike } from '../src/types.ts'

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
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot: t.testdirName,
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
    'prod',
    Spec.parse('foo', '^1.0.0 || 2'),
    graph.mainImporter,
    newNode,
  )
  t.strictSame(
    graph.mainImporter.edgesOut.size,
    1,
    'should add edge to the list of edgesOut in its origin node',
  )
  graph.addEdge(
    'prod',
    Spec.parse('foo@^1.0.0'),
    graph.mainImporter,
    newNode,
  )
  t.strictSame(
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
  const graph = new Graph({
    projectRoot: t.testdirName,
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
  const graph = new Graph({
    projectRoot: t.testdirName,
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
  const dir = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt-workspaces.json': JSON.stringify({
      packages: ['./packages/*'],
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
  const monorepo = Monorepo.maybeLoad(dir)
  const graph = new Graph({
    projectRoot: t.testdirName,
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
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot: t.testdirName,
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
