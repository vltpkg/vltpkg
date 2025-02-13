import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import {
  type Manifest,
  type DependencyTypeShort,
} from '@vltpkg/types'
import t from 'tap'
import { Edge } from '../src/edge.ts'
import { Graph } from '../src/graph.ts'
import { type Node } from '../src/node.ts'
import {
  findOptionalSubgraph,
  removeOptionalSubgraph,
} from '../src/remove-optional-subgraph.ts'

const pp = (
  graph: Graph,
  fromNode: Node,
  depType: DependencyTypeShort,
  spec: Spec,
  manifest?: Manifest,
): Node => {
  const node = graph.placePackage(fromNode, depType, spec, manifest)
  if (!node) throw new Error('failed to place package')
  return node
}

t.test('remove optional nodes starting from a given spot', t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    mainManifest: {
      version: '1.2.3',
      name: 'my-project',
      dependencies: { foo: '' },
    },
  })
  const fooNode = graph.addNode(
    undefined,
    {
      name: 'foo',
      version: '1.0.0',
      optionalDependencies: { bar: '' },
    },
    Spec.parse('foo@'),
  )
  const barNode = pp(graph, fooNode, 'optional', Spec.parse('bar@'), {
    name: 'bar',
    version: '1.2.3',
    dependencies: {
      x: '',
      y: '',
    },
  })

  const xNode = pp(graph, barNode, 'prod', Spec.parse('x@'), {
    name: 'x',
    version: '1.2.3',
    dependencies: {
      z: '',
    },
  })
  const zNode = pp(graph, xNode, 'prod', Spec.parse('z@'), {
    name: 'z',
    version: '1.2.3',
  })
  const yNode = pp(graph, barNode, 'prod', Spec.parse('y@'), {
    name: 'y',
    version: '1.2.3',
    dependencies: {
      z: '',
    },
  })
  const yzEdge = new Edge('prod', Spec.parse('z@'), yNode, zNode)
  yNode.edgesOut.set('z', yzEdge)
  zNode.edgesIn.add(yzEdge)
  graph.edges.add(yzEdge)

  if (!xNode.isOptional()) throw new Error('xNode should be optional')
  if (!yNode.isOptional()) throw new Error('yNode should be optional')
  if (!zNode.isOptional()) throw new Error('zNode should be optional')

  t.strictSame(
    [...findOptionalSubgraph(yNode)].map(n => n.id),
    [yNode.id, barNode.id],
  )
  t.strictSame(
    [...findOptionalSubgraph(zNode)].map(n => n.id),
    [zNode.id, xNode.id, barNode.id, yNode.id],
  )
  const removed = removeOptionalSubgraph(graph, xNode)
  t.strictSame(
    [...removed].map(({ id }) => id),
    [
      joinDepIDTuple(['registry', '', 'x@1.2.3']),
      joinDepIDTuple(['registry', '', 'bar@1.2.3']),
    ],
  )
  for (const node of removed) {
    t.equal(graph.nodes.get(node.id), undefined, 'node was removed')
  }

  t.end()
})
