import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import { addEdge } from './add-edge.ts'

export const addEdges = (
  diff: Diff,
  scurry: PathScurry,
  remover: RollbackRemove,
): Promise<unknown>[] => {
  const actions: Promise<unknown>[] = []
  for (const edge of diff.edges.add) {
    const { to } = edge
    if (!to) continue
    actions.push(addEdge(edge, scurry, remover, to.bins))
  }
  return actions
}
