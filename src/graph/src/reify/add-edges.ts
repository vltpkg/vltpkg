import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { mkdirSync } from 'node:fs'
import type { PathScurry } from 'path-scurry'
import type { Diff } from '../diff.ts'
import { addEdge } from './add-edge.ts'

export const addEdges = (
  diff: Diff,
  scurry: PathScurry,
  remover: RollbackRemove,
): (() => Promise<unknown>)[] => {
  const { sep } = scurry.cwd
  const actions: (() => Promise<unknown>)[] = []
  // a new store package's node_modules holds only its own dir, so
  // make the scope dirs its deps link into once, up front
  const scopes = new Set<string>()
  for (const edge of diff.edges.add) {
    const { from, to } = edge
    if (!to) continue
    const { name } = edge.spec
    const i = name.indexOf('/')
    if (i > 0 && diff.nodes.add.has(from) && from.inVltStore()) {
      const scope = name.substring(0, i)
      // its own scope dir is already there
      if (!from.name.startsWith(scope + '/')) {
        scopes.add(from.nodeModules(scurry) + sep + scope)
      }
    }
    const bins = to.bins
    actions.push(() => addEdge(edge, scurry, remover, bins))
  }
  for (const dir of scopes) mkdirSync(dir, { recursive: true })
  return actions
}
