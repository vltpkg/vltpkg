import { Spec } from '@vltpkg/spec'
import { inspect } from 'node:util'
import t from 'tap'
import { Graph } from '../src/graph.js'
import { Package } from '../src/pkgs.js'

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')
Object.assign(Spec.prototype, {
  [kCustomInspect]() {
    return `Spec {${this}}`
  },
})

t.test('Graph', async t => {
  const rootPackageJson = {
    name: 'my-project',
    version: '1.0.0',
  }
  const graph = new Graph(rootPackageJson)
  t.strictSame(
    graph.root.pkg.name,
    'my-project',
    'should have created a root folder with expected properties',
  )
  t.matchSnapshot(
    inspect(graph, { depth: 0 }),
    'should print with special tag name',
  )
  const newNode = graph.newNode({
    name: 'foo',
    version: '1.0.0',
  } as Package)
  t.strictSame(
    graph.nodes.size,
    2,
    'should create and add the new node to the graph',
  )
  graph.newEdge(
    'dependencies',
    Spec.parse('foo', '^1.0.0'),
    graph.root,
    newNode,
  )
  t.strictSame(
    graph.root.edgesOut.size,
    1,
    'should add edge to the list of edgesOut in its origin node',
  )
  graph.newEdge(
    'dependencies',
    Spec.parse('foo@^1.0.0'),
    graph.root,
    newNode,
  )
  t.strictSame(
    graph.root.edgesOut.size,
    1,
    'should not allow for adding new edges between same nodes',
  )
  graph.newEdge('dependencies', Spec.parse('missing@*'), graph.root)
  t.strictSame(
    graph.missingDependencies.size,
    1,
    'should add edge to list of missing dependencies',
  )
})

t.test('using placePackage', async t => {
  const graph = new Graph({
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      bar: '^1.0.0',
      missing: '^1.0.0',
    },
  })
  const foo = graph.placePackage(
    graph.root,
    'dependencies',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
    './node_modules/foo',
  )
  t.ok(foo)
  const bar = graph.placePackage(
    graph.root,
    'dependencies',
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
    'dependencies',
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
    graph.root,
    'dependencies',
    Spec.parse('missing', '^1.0.0'),
  )
  graph.placePackage(
    baz,
    'dependencies',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  t.matchSnapshot(inspect(graph, { depth: 2 }), 'the graph')
})
