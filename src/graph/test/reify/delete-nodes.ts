import { joinDepIDTuple } from '@vltpkg/dep-id'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { Diff } from '../../src/diff.js'
import { deleteNodes } from '../../src/reify/delete-nodes.js'

const removed: string[] = []
const mockRemover = {
  rm: async (path: string) => removed.push(path),
} as unknown as RollbackRemove

const inVltStoreFalse = () => false
const inVltStoreTrue = () => true

const diff = {
  nodes: {
    delete: new Set([
      // not in vlt store
      { name: 'name', inVltStore: inVltStoreFalse },
      // this one gets added
      {
        id: joinDepIDTuple(['registry', '', 'foo@1.2.3']),
        inVltStore: inVltStoreTrue,
        location:
          './node_modules/.vlt/' +
          joinDepIDTuple(['registry', '', 'foo@1.2.3']) +
          '/node_modules/foo',
        name: 'foo',
      },
    ]),
  },
} as unknown as Diff

const scurry = new PathScurry(t.testdirName)

await Promise.all(
  deleteNodes(diff, mockRemover, scurry).map(x => x()),
)

t.strictSame(removed, [
  scurry.resolve(
    'node_modules/.vlt/' +
      joinDepIDTuple(['registry', '', 'foo@1.2.3']),
  ),
])
