import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import { deleteEdge } from './delete-edge.ts'

export const deleteEdges = (
  diff: Diff,
  scurry: PathScurry,
  remover: RollbackRemove,
): (() => Promise<unknown>)[] => {
  const promises: (() => Promise<unknown>)[] = []
  for (const edge of diff.edges.delete) {
    // if the edge.from is a deleted node in the store, no need
    // the entire dir will be removed in a later step.
    if (diff.nodes.delete.has(edge.from) && edge.from.inVltStore()) {
      continue
    }
    promises.push(() => deleteEdge(edge, scurry, remover))
  }
  return promises
}
