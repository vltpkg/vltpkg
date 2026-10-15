import type { DepID } from '@vltpkg/dep-id'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import { deleteEdge } from './delete-edge.ts'

export const deleteNodes = (
  diff: Diff,
  remover: RollbackRemove,
  scurry: PathScurry,
  keep?: ReadonlySet<DepID>,
): Promise<unknown>[] => {
  const store = scurry.resolve('node_modules/.vlt')
  const { sep } = scurry.cwd
  const rmActions: Promise<unknown>[] = []
  for (const node of diff.nodes.delete) {
    // do not delete workspaces or link targets
    if (!node.inVltStore()) continue
    if (!keep?.has(node.id)) {
      rmActions.push(remover.rm(store + sep + node.id))
    }
    for (const edge of node.edgesIn) {
      rmActions.push(deleteEdge(edge, scurry, remover))
    }
  }
  return rmActions
}
