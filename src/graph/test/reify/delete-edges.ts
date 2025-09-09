import { joinDepIDTuple } from '@vltpkg/dep-id'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'
import { Edge } from '../../src/edge.ts'
import { Node } from '../../src/node.ts'
import type { GraphLike } from '@vltpkg/types'

// verify that we delete the deleted edges, but skip the ones
// that are coming from something in the store being deleted,
// since all the links will go with the main DepID folder anyway

const deleted: Edge[] = []

const { deleteEdges } = await t.mockImport<
  typeof import('../../src/reify/delete-edges.ts')
>('../../src/reify/delete-edges.ts', {
  '../../src/reify/delete-edge.ts': {
    deleteEdge: async (
      edge: Edge,
      _scurry: PathScurry,
      _remover: RollbackRemove,
    ) => deleted.push(edge),
  },
})

const projectRoot = t.testdirName
const opts = {
  projectRoot,
  graph: {} as GraphLike,
}
const fooNode = new Node(
  opts,
  joinDepIDTuple(['registry', '', 'foo@1.2.3']),
)
const barNode = new Node(
  opts,
  joinDepIDTuple(['registry', '', 'bar@1.2.3']),
)
const bazNode = new Node(
  opts,
  joinDepIDTuple(['registry', '', 'baz@1.2.3']),
)
const outNode = new Node(opts, joinDepIDTuple(['file', './outside']))
outNode.location = resolve(projectRoot, 'outside')
const foobarEdge = new Edge(
  'prod',
  Spec.parse('bar@*'),
  fooNode,
  barNode,
)
const bazbarEdge = new Edge(
  'prod',
  Spec.parse('bar@*'),
  bazNode,
  barNode,
)
const outbarEdge = new Edge(
  'prod',
  Spec.parse('bar@*'),
  outNode,
  barNode,
)

const diff = {
  nodes: {
    delete: new Set([fooNode, barNode, outNode]),
  },
  edges: {
    delete: new Set([foobarEdge, bazbarEdge, outbarEdge]),
  },
} as unknown as Diff

const scurry = new PathScurry(projectRoot)
const remover = new RollbackRemove()

await Promise.all(deleteEdges(diff, scurry, remover).map(x => x()))

t.strictSame(new Set(deleted), new Set([bazbarEdge, outbarEdge]))
