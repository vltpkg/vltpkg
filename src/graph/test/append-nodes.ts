import t from 'tap'
import { Spec } from '@vltpkg/spec'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Graph } from '../src/graph.js'
import { appendNodes } from '../src/append-nodes.js'

t.test('append a new node to a graph from a registry', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    dependencies: {
      bar: '^1.0.0',
    },
  }
  const barManifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const rootPkg = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  t.testdir({
    'package.json': JSON.stringify(rootPkg),
  })
  const graph = new Graph(rootPkg)
  graph.packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'bar':
          return barManifest
        case 'foo':
          return fooManifest
        case 'borked':
          throw new Error('ERR')
        default:
          return null
      }
    },
  } as PackageInfoClient
  t.strictSame(
    graph.root.edgesOut.size,
    0,
    'has no direct dependency yet',
  )
  await appendNodes(
    graph,
    graph.root,
    [Spec.parse('foo@^1.0.0')],
    'dependencies',
  )
  t.strictSame(
    [...graph.root.edgesOut.values()].map(e => e.to?.pkg.name),
    ['foo'],
    'should have a direct dependency on foo',
  )
  const barPkg = graph.packages.get('npm:bar@1.0.0')
  if (!barPkg) {
    throw new Error('Package could not be retrieved')
  }
  t.strictSame(
    barPkg.name,
    'bar',
    'should have added to inventory transitive dependencies',
  )

  await appendNodes(
    graph,
    graph.root,
    [Spec.parse('bar')],
    'dependencies',
  )
  t.strictSame(
    graph.root.edgesOut.get('bar')?.spec.semver,
    '',
    'should add a direct dependency on latest bar',
  )

  await t.rejects(
    appendNodes(
      graph,
      graph.root,
      [Spec.parse('borked')],
      'dependencies',
    ),
    /ERR/,
    'should not intercept errors on fetching / parsing manifest',
  )
})
