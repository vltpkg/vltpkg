import { MISSING } from './types.ts'
import type { DepID } from '@vltpkg/dep-id'
import type {
  DiffGraph,
  EdgeInfo,
  Mutation,
  Region,
} from './types.ts'

/** Every node id a mutation is about, on either side. */
export const mutationNodes = (m: Mutation): DepID[] => {
  switch (m.kind) {
    case 'node-added':
    case 'node-removed':
      return [m.node.id]
    case 'node-changed':
    case 'node-identity-changed':
    case 'package-resolved':
      return [m.from.id, m.to.id]
    case 'peer-variants-regrouped':
      return [...m.from, ...m.to].map(node => node.id)
    case 'edge-added':
    case 'edge-removed':
      return edgeNodes(m.edge)
    case 'edge-retargeted':
    case 'edge-respecified':
      return [...edgeNodes(m.from), ...edgeNodes(m.to)]
    default:
      return []
  }
}

const edgeNodes = (e: EdgeInfo): DepID[] =>
  e.to === MISSING ? [e.from] : [e.from, e.to]

/**
 * The importers *closest* to `id`, walking reverse edges breadth-first
 * and stopping at the first depth that reaches any.
 *
 * Closest rather than all-reachable is the whole point. In a monorepo
 * nearly every workspace can reach nearly every package, so
 * all-reachable attributes one transitive bump to all 43 workspaces and
 * the regions stop meaning anything. The nearest importer is the one
 * that actually pulled the package in.
 */
const importersOf = (
  id: DepID,
  g: DiffGraph,
  memo: Map<DepID, DepID[]>,
) => {
  const hit = memo.get(id)
  if (hit) return hit
  const found = new Set<DepID>()
  const seen = new Set<DepID>([id])
  let level: DepID[] = [id]
  while (level.length && !found.size) {
    const next: DepID[] = []
    for (const cur of level) {
      for (const { from } of g.dependents.get(cur) ?? []) {
        if (seen.has(from)) continue
        seen.add(from)
        if (g.importers.has(from)) found.add(from)
        else next.push(from)
      }
    }
    level = next
  }
  const out = [...found].sort()
  memo.set(id, out)
  return out
}

/**
 * Regions partition the mutations by *who owns them*: the set of nearest
 * importers that pull the changed node in. A change only www/docs can
 * reach lands in a `www/docs` region; a change every workspace pulls in
 * through its shared toolchain lands in one shared region rather than
 * being repeated 43 times.
 *
 * Keying on the whole owner set, not on each owner, is what makes this a
 * partition -- every mutation appears in exactly one region, so region
 * counts sum to the total and a reader can trust them.
 *
 * ponytail: nearest-importer ownership, not connected components. In a
 * monorepo the components collapse into one blob (everything shares
 * typescript). Revisit if regions ever need to be finer than this.
 */
export const extractRegions = (
  mutations: Mutation[],
  head: DiffGraph,
  base: DiffGraph,
): Region[] => {
  const memo = new Map<DepID, DepID[]>()
  // owner-set key -> { importers, node id -> mutation ids }
  const groups = new Map<
    string,
    {
      importers: DepID[]
      nodes: Map<DepID, string[]>
      mutationIds: Set<string>
    }
  >()

  const ownersOf = (node: DepID) => {
    // a removed node is only reachable on the base side
    const g = head.nodes.has(node) ? head : base
    return g.importers.has(node) ? [node] : importersOf(node, g, memo)
  }

  for (const m of mutations) {
    // one mutation can touch nodes with different owners (an edge
    // retarget, a version bump); the union owns it
    const importers = [
      ...new Set(mutationNodes(m).flatMap(ownersOf)),
    ].sort()
    const key = importers.join('\0')
    let group = groups.get(key)
    if (!group) {
      groups.set(
        key,
        (group = {
          importers,
          nodes: new Map(),
          mutationIds: new Set(),
        }),
      )
    }
    // tracked directly, not derived from `nodes`: an options change is
    // about the lockfile itself and names no node at all
    group.mutationIds.add(m.id)
    for (const node of mutationNodes(m)) {
      const ids = group.nodes.get(node)
      if (ids) {
        if (!ids.includes(m.id)) ids.push(m.id)
      } else group.nodes.set(node, [m.id])
    }
  }

  const nameOf = (id: DepID) =>
    /* c8 ignore next - an importer always comes out of one of the graphs */
    (head.nodes.get(id) ?? base.nodes.get(id))?.name ?? id

  return [...groups.values()]
    .map(({ importers, nodes, mutationIds: ids }): Region => {
      const owned = new Set<DepID>(importers)
      const [first, ...rest] = importers
      return {
        id: importers.join(',') || 'unreachable',
        label:
          !first ? 'unreachable'
          : rest.length ? `shared by ${importers.length} workspaces`
          : nameOf(first),
        importers,
        nodes: [...nodes].map(([id, mutationIds]) => ({
          id,
          role: owned.has(id) ? 'context' : 'mutated',
          mutationIds,
        })),
        mutationIds: [...ids],
      }
    })
    .sort(
      (a, z) =>
        z.mutationIds.length - a.mutationIds.length ||
        a.label.localeCompare(z.label),
    )
}
