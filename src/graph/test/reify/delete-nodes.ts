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

const diff = {
  nodes: {
    delete: new Set([
      // not in vlt store
      { name: 'name', inVltStore: inVltStoreFalse, edgesIn: [] },
      // this one gets added
      {
        id: joinDepIDTuple(['registry', '', 'foo@1.2.3']),
        inVltStore: inVltStoreTrue,
        location:
          './node_modules/.vlt/' +
          joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
          '/node_modules/foo',
        name: 'foo',
        edgesIn: [mockEdge],
      },
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
