import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import t from 'tap'
import { Diff } from '../../src/diff.ts'
import { Edge } from '../../src/edge.ts'
import { Graph } from '../../src/graph.ts'
import { lockfileData } from '../../src/lockfile/save.ts'
import { Node } from '../../src/node.ts'
import { optionalFail } from '../../src/reify/optional-fail.ts'

t.formatSnapshot = (obj: any) => {
  if (!!obj && obj instanceof Graph) {
    return lockfileData({ graph: obj })
  }
  return obj
}

t.test('register and optional node failure', async t => {
  const projectRoot = t.testdirName
  const actual = new Graph({
    projectRoot,
    mainManifest: {
      name: 'project',
      version: '1.2.3',
    },
  })
  const ideal = new Graph({
    projectRoot: t.testdirName,
    mainManifest: {
      name: 'project',
      version: '1.2.3',
      optionalDependencies: { foo: '' },
    },
  })
  const foo = new Node(
    { graph: ideal, projectRoot },
    joinDepIDTuple(['registry', '', 'foo@1.2.3']),
    {
      name: 'foo',
      version: '1.2.3',
      dependencies: { bar: '' },
    },
  )
  ideal.nodes.set(foo.id, foo)
  const fooEdge = new Edge(
    'optional',
    Spec.parse('foo@'),
    ideal.mainImporter,
    foo,
  )
  ideal.edges.add(fooEdge)
  foo.edgesIn.add(fooEdge)
  ideal.mainImporter.edgesOut.set('foo', fooEdge)
  const bar = new Node(
    { projectRoot, graph: ideal },
    joinDepIDTuple(['registry', '', 'bar@1.2.3']),
    {
      name: 'bar',
      version: '1.2.3',
      dependencies: { baz: '' },
    },
  )
  bar.optional = true
  const barEdge = new Edge('prod', Spec.parse('bar@'), foo, bar)
  bar.edgesIn.add(barEdge)
  foo.edgesOut.set('bar', barEdge)
  ideal.edges.add(barEdge)
  const baz = new Node(
    { projectRoot, graph: ideal },
    joinDepIDTuple(['registry', '', 'baz@1.2.3']),
    {
      name: 'baz',
      version: '1.2.3',
    },
  )
  baz.optional = true
  const bazEdge = new Edge('prod', Spec.parse('baz@'), bar, baz)
  baz.edgesIn.add(bazEdge)
  bar.edgesOut.set('baz', bazEdge)
  ideal.edges.add(bazEdge)
  const diff = new Diff(actual, ideal)
  t.equal(
    optionalFail(diff, foo),
    undefined,
    'does not provide an error handler if node is not optional',
  )
  if (!baz.isOptional()) {
    throw new Error('baz should be optional node')
  }

  const handler = optionalFail(diff, baz)
  t.type(
    handler,
    'function',
    'provides error handler for optional node',
  )
  handler()
  t.equal(
    diff.hadOptionalFailures,
    true,
    'diff records optional fails happened',
  )
  t.matchSnapshot(ideal)
  t.equal(ideal.nodes.get(bar.id), undefined)
  t.match(
    diff.nodes.delete,
    new Set([bar, baz]),
    'bar, baz moved to delete set',
  )
})
