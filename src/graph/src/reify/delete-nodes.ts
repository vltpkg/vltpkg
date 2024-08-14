import { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import { Diff } from '../diff.js'

export const deleteNodes = (
  diff: Diff,
  remover: RollbackRemove,
  scurry: PathScurry,
) => {
  const store = scurry.resolve('node_modules/.vlt')
  const rmPromises: Promise<unknown>[] = []
  for (const node of diff.nodes.delete) {
    // do not delete workspaces or link targets
    if (!node.inVltStore()) continue
    rmPromises.push(remover.rm(scurry.resolve(store, node.id)))
  }
  return rmPromises
}