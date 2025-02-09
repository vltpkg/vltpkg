import { joinDepIDTuple } from '@vltpkg/dep-id'
import { type RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { type Diff } from '../../src/diff.ts'
import { type Edge } from '../../src/edge.ts'

const fooId = joinDepIDTuple(['registry', '', 'foo@1.2.3'])
const diff = {
  nodes: {
    add: new Set([
      { inVltStore: () => false },
      { inVltStore: () => true, id: fooId },
    ]),
  },
  edges: { add: new Set([{ deleteThisEdge: true }]) },
} as unknown as Diff

const removed: string[] = []

class MockRollbackRemove {
  async rm(path: string) {
    removed.push(path)
  }
  async rollback() {}
  confirm() {}
}

const deletedEdges: Edge[] = []

const { rollback } = await t.mockImport<
  typeof import('../../src/reify/rollback.ts')
>('../../src/reify/rollback.ts', {
  '@vltpkg/rollback-remove': {
    RollbackRemove: MockRollbackRemove,
  },
  '../../src/reify/delete-edge.js': {
    deleteEdge: (edge: Edge) => {
      deletedEdges.push(edge)
    },
  },
})

const scurry = new PathScurry(t.testdirName)

t.test('rollback that works', async t => {
  await rollback(
    new MockRollbackRemove() as unknown as RollbackRemove,
    diff,
    scurry,
  )
  t.strictSame(deletedEdges, [{ deleteThisEdge: true }])
  t.strictSame(removed, [
    scurry.resolve(
      'node_modules/.vlt/' +
        joinDepIDTuple(['registry', '', 'foo@1.2.3']),
    ),
  ])
})
