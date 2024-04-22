import { inspect } from 'node:util'
import t from 'tap'
import { Graph } from '../../src/graph.js'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.js'

t.test('human-readable-output', async t => {
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
    'foo',
    '^1.0.0',
    {
      name: 'foo',
      version: '1.0.0',
    },
    './node_modules/foo',
  )
  const bar = graph.placePackage(
    graph.root,
    'dependencies',
    'bar',
    '^1.0.0',
    {
      name: 'bar',
      version: '1.0.0',
      dependencies: {
        baz: '^1.0.0',
      },
    },
  )
  const baz = graph.placePackage(
    bar,
    'dependencies',
    'baz',
    '^1.0.0',
    {
      name: 'baz',
      version: '1.0.0',
      dist: {
        tarball: 'https://registry.vlt.sh/baz',
      },
    },
  )
  graph.placePackage(graph.root, 'dependencies', 'missing', '^1.0.0')
  graph.placePackage(baz, 'dependencies', 'foo', '^1.0.0', {
    name: 'foo',
    version: '1.0.0',
  })
  t.matchSnapshot(
    inspect(humanReadableOutput(graph)),
    'should print human readable output',
  )
})
