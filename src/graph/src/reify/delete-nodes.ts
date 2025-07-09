import { baseDepID } from '@vltpkg/dep-id'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import { deleteEdge } from './delete-edge.ts'

export const deleteNodes = (
  diff: Diff,
  remover: RollbackRemove,
  scurry: PathScurry,
): Promise<unknown>[] => {
  const store = scurry.resolve('node_modules/.vlt')
  const rmActions: Promise<unknown>[] = []
  for (const node of diff.nodes.delete) {
    // do not delete workspaces or link targets
    if (!node.inVltStore()) continue
    rmActions.push(remover.rm(scurry.resolve(store, baseDepID(node.id))))
    for (const edge of node.edgesIn) {
      rmActions.push(deleteEdge(edge, scurry, remover))
    }
  }
  return rmActions
}
