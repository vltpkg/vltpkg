import { Spec } from '@vltpkg/spec'
import t from 'tap'
import { Graph } from '../../src/graph.js'
import { mermaidOutput } from '../../src/visualization/mermaid-output.js'

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
  graph.placePackage(
    graph.root,
    'dependencies',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
    './node_modules/foo',
  )
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
  t.matchSnapshot(
    mermaidOutput(graph),
    'should print human readable output',
  )
})
