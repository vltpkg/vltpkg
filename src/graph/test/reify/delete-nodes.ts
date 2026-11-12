import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'

const removed: string[] = []
const mockRemover = {
  rm: async (path: string) => removed.push(path),
} as unknown as RollbackRemove

const edgesDeleted: unknown[] = []
const mockEdgeDeleter = async (edge: unknown) =>
  edgesDeleted.push(edge)

const { deleteNodes } = await t.mockImport<
  typeof import('../../src/reify/delete-nodes.ts')
>('../../src/reify/delete-nodes.ts', {
  '../../src/reify/delete-edge.ts': { deleteEdge: mockEdgeDeleter },
})

const inVltStoreFalse = () => false
const inVltStoreTrue = () => true

const mockEdge = {}

// on disk from an earlier install
const foo = {
  id: joinDepIDTuple(['registry', '', 'foo@1.2.3']),
  inVltStore: inVltStoreTrue,
  location:
    './node_modules/.vlt/' +
    joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
    '/node_modules/foo',
  name: 'foo',
  edgesIn: [mockEdge],
}

const diff = {
  from: { nodes: new Map([[foo.id, foo]]) },
  nodes: {
    add: new Set(),
    delete: new Set([
      // not in vlt store
      { name: 'name', inVltStore: inVltStoreFalse, edgesIn: [] },
      // this one gets added
      foo,
    ]),
  },
} as unknown as Diff

const scurry = new PathScurry(t.testdirName)

await Promise.all(deleteNodes(diff, mockRemover, scurry))

t.strictSame(removed, [
  scurry.resolve(
    'node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'foo@1.2.3']),
  ),
])

t.equal(edgesDeleted[0], mockEdge, 'deleted incoming edge')

t.test('keep', async t => {
  const id = joinDepIDTuple(['registry', '', 'foo@1.2.3'])
  removed.length = 0
  edgesDeleted.length = 0
  await Promise.all(
    deleteNodes(diff, mockRemover, scurry, new Set([id])),
  )
  t.strictSame(removed, [], 'store dir kept')
  t.equal(edgesDeleted[0], mockEdge, 'edge still deleted')
  await Promise.all(
    deleteNodes(
      diff,
      mockRemover,
      scurry,
      new Set([joinDepIDTuple(['registry', '', 'bar@1.0.0'])]),
    ),
  )
  t.equal(removed.length, 1, 'others removed')
})

t.test('never placed', async t => {
  const id = joinDepIDTuple(['registry', '', 'opt@1.0.0'])
  const edge = {}
  const node = (extracted: boolean, inVltStore = inVltStoreTrue) => ({
    id,
    name: 'opt',
    extracted,
    inVltStore,
    edgesIn: [edge],
  })
  const del = async (n: unknown, old?: unknown) => {
    removed.length = 0
    edgesDeleted.length = 0
    await Promise.all(
      deleteNodes(
        {
          from: { nodes: new Map(old ? [[id, old]] : []) },
          nodes: { add: new Set(), delete: new Set([n]) },
        } as unknown as Diff,
        mockRemover,
        scurry,
      ),
    )
    return { removed: [...removed], edges: [...edgesDeleted] }
  }
  const dir = scurry.resolve('node_modules/.vlt/' + id)
  t.strictSame(
    await del(node(false)),
    { removed: [], edges: [] },
    'pruned before extraction: nothing to remove',
  )
  t.strictSame(
    await del(node(true)),
    { removed: [dir], edges: [edge] },
    'extraction started',
  )
  t.strictSame(
    await del(node(false), node(false)),
    { removed: [dir], edges: [edge] },
    'same id in the store from an earlier install',
  )
  t.strictSame(
    await del(node(false), node(false, inVltStoreFalse)),
    { removed: [], edges: [] },
    'same id outside the store',
  )
})

t.test('re-extracted in place under another name', async t => {
  const id = joinDepIDTuple(['git', 'github:a/b', 'main'])
  const node = (name: string, inVltStore = inVltStoreTrue) => ({
    id,
    inVltStore,
    resolvedLocation: (s: PathScurry) =>
      s.resolve(`node_modules/.vlt/${id}/node_modules/${name}`),
  })
  removed.length = 0
  const del = (from: unknown, to: unknown) =>
    Promise.all(
      deleteNodes(
        {
          from: { nodes: new Map([[id, from]]) },
          nodes: { add: new Set([to]), delete: new Set() },
        } as unknown as Diff,
        mockRemover,
        scurry,
      ),
    )
  await del(node('b'), node('c'))
  t.strictSame(
    removed,
    [scurry.resolve(`node_modules/.vlt/${id}/node_modules/b`)],
    'old package dir removed',
  )
  removed.length = 0
  await del(node('b'), node('b'))
  await del(undefined, node('b'))
  await del(node('b', inVltStoreFalse), node('c'))
  await del(node('b'), node('c', inVltStoreFalse))
  t.strictSame(removed, [], 'same dir, new, or not in the store')
})
