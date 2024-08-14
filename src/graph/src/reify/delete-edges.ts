import { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import { Diff } from '../diff.js'
import { deleteEdge } from './delete-edge.js'

export const deleteEdges = (
  diff: Diff,
  scurry: PathScurry,
  remover: RollbackRemove,
) => {
  const promises: Promise<unknown>[] = []
  for (const edge of diff.edges.delete) {
    // if the edge.from is a deleted node in the store, no need
    // the entire dir will be removed in a later step.
    if (diff.nodes.delete.has(edge.from) && edge.from.inVltStore()) {
      continue
    }
    promises.push(deleteEdge(edge, scurry, remover))
  }
  return promises
}