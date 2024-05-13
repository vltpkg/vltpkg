import { Graph } from '@vltpkg/graph'
import { Spec } from '@vltpkg/spec'
import { inspect } from 'util'
import t from 'tap'
import { createStorageTree } from '../src/create-storage-tree.js'

t.test('createStorageTree', async t => {
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
    Spec.parse('foo@^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
    './node_modules/foo',
  )
  const bar = graph.placePackage(
    graph.root,
    'dependencies',
    Spec.parse('bar@^1.0.0'),
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
    Spec.parse('baz@^1.0.0'),
    {
      name: 'baz',
      version: '1.0.0',
      dist: {
        tarball: 'https://registry.vlt.sh/baz',
      },
    },
  )
  graph.placePackage(
    graph.root,
    'dependencies',
    Spec.parse('missing@^1.0.0'),
  )
  graph.placePackage(baz, 'dependencies', Spec.parse('foo@^1.0.0'), {
    name: 'foo',
    version: '1.0.0',
  })
  t.matchSnapshot(
    createStorageTree(graph, [...graph.packages.values()]),
  )
})
