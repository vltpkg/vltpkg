import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Diff } from '../../src/diff.ts'
import type { Edge } from '../../src/edge.ts'

const fooId = joinDepIDTuple(['registry', '', 'foo@1.2.3'])
const gitId = joinDepIDTuple(['git', 'github:a/b', 'main'])
const gitLoc = `./node_modules/.vlt/${gitId}/node_modules/b`
const idleId = joinDepIDTuple(['git', 'github:a/c', 'main'])
const idleLoc = `./node_modules/.vlt/${idleId}/node_modules/c`
const diff = {
  from: {
    nodes: new Map([
      [gitId, { inVltStore: (): boolean => true }],
      [idleId, { inVltStore: (): boolean => true }],
    ]),
  },
  nodes: {
    add: new Set([
      { inVltStore: (): boolean => false },
      {
        inVltStore: (): boolean => true,
        id: fooId,
      },
      // a moved git pin, re-extracted in place
      {
        inVltStore: (): boolean => true,
        id: gitId,
        extracted: true,
        resolvedLocation: (s: PathScurry) => s.resolve(gitLoc),
      },
      // never extracted: its old dir stays
      {
        inVltStore: (): boolean => true,
        id: idleId,
        extracted: false,
        resolvedLocation: (s: PathScurry) => s.resolve(idleLoc),
      },
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
  '../../src/reify/delete-edge.ts': {
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
    scurry.resolve(gitLoc),
  ])
})
