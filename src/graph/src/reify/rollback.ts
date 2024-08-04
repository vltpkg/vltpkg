import { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import { Diff } from '../diff.js'
import { deleteEdge } from './delete-edge.js'

export const rollback = async (
  remover: RollbackRemove,
  diff: Diff,
  scurry: PathScurry,
) => {
  const promises: Promise<unknown>[] = []
  const store = scurry.resolve('node_modules/.vlt')

  // remove everything the diff tried to add
  const backRoller = new RollbackRemove()
  for (const node of diff.nodes.add) {
    if (!node.inVltStore()) continue
    const path = scurry.resolve(store, node.id)
    /* c8 ignore next */
    promises.push(backRoller.rm(path).catch(() => {}))
  }
  for (const edge of diff.edges.add) {
    promises.push(deleteEdge(edge, scurry, backRoller))
  }

  /* c8 ignore next */
  await Promise.all(promises).catch(() => {})

  backRoller.confirm()

  /* c8 ignore next */
  await remover.rollback().catch(() => {})
}
