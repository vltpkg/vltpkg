import { type PackageJson } from '@vltpkg/package-json'
import { type RollbackRemove } from '@vltpkg/rollback-remove'
import { type PathScurry } from 'path-scurry'
import { type Diff } from '../diff.ts'
import { addEdge } from './add-edge.ts'

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
    const mani =
      to.manifest ?? packageJson.read(to.resolvedLocation(scurry))
    actions.push(addEdge(edge, mani, scurry, remover))
  }
  return actions
}
