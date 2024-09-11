import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { resolve } from 'path'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Diff } from '../../src/diff.js'
import { Edge } from '../../src/edge.js'
import { Node } from '../../src/node.js'

// verify that we delete the deleted edges, but skip the ones
// that are coming from something in the store being deleted,
// since all the links will go with the main DepID folder anyway

const deleted: Edge[] = []

const { deleteEdges } = await t.mockImport<
  typeof import('../../src/reify/delete-edges.js')
>('../../src/reify/delete-edges.js', {
  '../../src/reify/delete-edge.js': {
    deleteEdge: async (
      edge: Edge,
      _scurry: PathScurry,
      _remover: RollbackRemove,
    ) => deleted.push(edge),
  },
})

const projectRoot = t.testdirName
const fooNode = new Node(
  { projectRoot, importers: new Set() },
  ';;foo@1.2.3',
)
const barNode = new Node(
  { projectRoot, importers: new Set() },
  ';;bar@1.2.3',
)
const bazNode = new Node(
  { projectRoot, importers: new Set() },
  ';;baz@1.2.3',
)
const outNode = new Node(
  { projectRoot, importers: new Set() },
  'file;./outside',
)
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

await Promise.all(deleteEdges(diff, scurry, remover))

t.strictSame(new Set(deleted), new Set([bazbarEdge, outbarEdge]))
