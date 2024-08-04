import { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Diff } from '../../src/diff.js'
import { Edge } from '../../src/edge.js'

const diff = {
  nodes: {
    add: new Set([
      { inVltStore: () => false },
      { inVltStore: () => true, id: ';;foo@1.2.3' },
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
  typeof import('../../src/reify/rollback.js')
>('../../src/reify/rollback.js', {
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
    scurry.resolve('node_modules/.vlt/;;foo@1.2.3'),
  ])
})
