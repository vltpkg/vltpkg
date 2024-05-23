import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { inspect } from 'node:util'
import t from 'tap'
import { Spec } from '@vltpkg/spec'
import { hydrate } from '@vltpkg/dep-id'
import { Graph } from '../src/graph.js'

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')
Object.assign(Spec.prototype, {
  [kCustomInspect]() {
    return `Spec {${this}}`
  },
})

const __dirname = dirname(fileURLToPath(import.meta.url))
const encodedCwd = encodeURIComponent(
  String(pathToFileURL(resolve(__dirname, '../..'))),
).substring(13)
t.cleanSnapshot = s => s.replaceAll(encodedCwd, '')

t.test('Graph', async t => {
  const location = t.testdirName
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const graph = new Graph({
    location,
    mainManifest,
  })
  t.strictSame(
    graph.mainImporter.manifest.name,
    'my-project',
    'should have created a root folder with expected properties',
  )
  t.matchSnapshot(
    inspect(graph, { depth: 0 }),
    'should print with special tag name',
  )
  const newNode = graph.newNode(
    {
      name: 'foo',
      version: '1.0.0',
    },
    undefined,
    Spec.parse('foo@^1.0.0'),
  )
  t.strictSame(
    graph.nodes.size,
    2,
    'should create and add the new node to the graph',
  )
  graph.newEdge(
    'dependencies',
    Spec.parse('foo', '^1.0.0'),
    graph.mainImporter,
    newNode,
  )
  t.strictSame(
    graph.mainImporter.edgesOut.size,
    1,
    'should add edge to the list of edgesOut in its origin node',
  )
  graph.newEdge(
    'dependencies',
    Spec.parse('foo@^1.0.0'),
    graph.mainImporter,
    newNode,
  )
  t.strictSame(
    graph.mainImporter.edgesOut.size,
    1,
    'should not allow for adding new edges between same nodes',
  )
  graph.newEdge(
    'dependencies',
    Spec.parse('missing@*'),
    graph.mainImporter,
  )
  t.strictSame(
    graph.missingDependencies.size,
    1,
    'should add edge to list of missing dependencies',
  )
})

t.test('using placePackage', async t => {
  const location = t.testdirName
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
    location,
    mainManifest,
  })
  const foo = graph.placePackage(
    graph.mainImporter,
    'dependencies',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  t.ok(foo)
  const bar = graph.placePackage(
    graph.mainImporter,
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
    graph.mainImporter,
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

t.test('main manifest missing name', async t => {
  const location = t.testdirName
  const mainManifest = {
    version: '1.0.0',
  }
  const graph = new Graph({
    location,
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
    String(pathToFileURL(location)),
    'should have the encoded location as part of its id',
  )
})
