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
) => {
  const promises: Promise<unknown>[] = []
  for (const edge of diff.edges.add) {
    const { to } = edge
    if (!to) continue
    const mani = to.manifest ?? packageJson.read(to.location)
    const seen = new Set<string>()
    promises.push(addEdge(edge, mani, scurry, remover, seen))
  }
  return promises
}
