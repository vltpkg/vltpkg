import { hydrate } from '@vltpkg/dep-id'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { inspect } from 'node:util'
import t from 'tap'
import { Graph } from '../src/graph.js'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)"projectRoot": .*$/gm, '$1"projectRoot": #')

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')
Object.assign(Spec.prototype, {
  [kCustomInspect]() {
    return `Spec {${this}}`
  },
})

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
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
    },
    Spec.parse('foo@^1.0.0'),
  )
  t.strictSame(
    graph.nodes.size,
    2,
    'should create and add the new node to the graph',
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
  t.matchSnapshot(inspect(graph, { depth: 2 }), 'the graph')
  const [edge] = baz.edgesIn
  if (!edge) throw new Error('failed to retrieve baz')
  graph.removeNode(baz)
  t.matchSnapshot(
    inspect(graph, { depth: 2 }),
    'should have removed baz from the graph',
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
  t.matchSnapshot(
    graph.importers,
    'should have root and workspaces as importers',
  )
})
