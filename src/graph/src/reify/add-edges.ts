import type { PackageJson } from '@vltpkg/package-json'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.js'
import { addEdge } from './add-edge.js'

export const addEdges = (
  diff: Diff,
  packageJson: PackageJson,
  scurry: PathScurry,
  remover: RollbackRemove,
): Promise<unknown>[] => {
  const actions: Promise<unknown>[] = []
  for (const edge of diff.edges.add) {
    const { to } = edge
    if (!to) continue
    const mani = to.manifest ?? packageJson.read(to.location)
    actions.push(addEdge(edge, mani, scurry, remover))
  }
  return actions
}
