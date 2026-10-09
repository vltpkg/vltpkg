import { resolve } from 'node:path'
import { graphRunSync } from '@vltpkg/graph-run'
import type { Monorepo, Workspace } from '@vltpkg/workspaces'

/**
 * Reorder `--scope` target locations so each workspace follows the
 * workspaces it depends on (directly or via unmatched workspaces),
 * matching --workspace/--recursive. Stable: unrelated workspaces keep
 * query order; cycles are broken deterministically. Non-workspace
 * locations (root, installed deps) keep their index. Accepts absolute
 * or projectRoot-relative locations; returns the original strings.
 */
export const sortScopeLocations = (
  locations: string[],
  monorepo?: Monorepo,
): string[] => {
  if (!monorepo || locations.length < 2) return locations
  // resolve first: workspaces are also keyed by name and rel path
  const wsAt = (loc: string) =>
    monorepo.get(resolve(monorepo.projectRoot, loc))
  const slots = locations.map(loc => [loc, wsAt(loc)] as const)
  const locOf = new Map<Workspace, string>()
  for (const [loc, ws] of slots) {
    if (ws && !locOf.has(ws)) locOf.set(ws, loc)
  }
  const [first, ...rest] = locOf.keys()
  if (!first || !rest.length) return locations

  // matched deps, walking through unmatched workspaces
  const getDeps = (ws: Workspace) => {
    const found: Workspace[] = []
    const seen = new Set([ws])
    const queue = monorepo.getDeps(ws)
    for (const dep of queue) {
      if (seen.has(dep)) continue
      seen.add(dep)
      if (locOf.has(dep)) found.push(dep)
      else queue.push(...monorepo.getDeps(dep))
    }
    return found
  }

  // DFS post-order: deps first, ties in query order
  const sorted = graphRunSync<Workspace, void>({
    graph: [first, ...rest],
    getDeps,
    visit: () => {},
  }).keys()

  const placed = new Set<Workspace>()
  return slots.map(([loc, ws]) => {
    if (!ws || placed.has(ws)) return loc
    placed.add(ws)
    const next = sorted.next().value
    /* c8 ignore next - same count as placed slots */
    return (next && locOf.get(next)) ?? loc
  })
}
