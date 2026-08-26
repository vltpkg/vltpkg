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
      return [...m.from, ...m.to]
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

export type Reach = {
  /** importers at the shallowest depth that reaches `id` at all */
  nearest: DepID[]
  /** every importer that reaches it, nearest included */
  all: DepID[]
  /**
   * The last node before an importer on the way up: the direct
   * dependency this one hangs under. Undefined when the node is itself
   * a direct dependency, or nothing reaches it.
   */
  via?: DepID
}

/**
 * Walk reverse edges breadth-first, recording both the importers at the
 * first depth that reaches `id` and every importer that reaches it.
 *
 * Regions key on `nearest`, because in a monorepo nearly every workspace
 * can reach nearly every package and grouping on all-reachable collapses
 * the regions into one useless blob. But nearest alone lies by omission:
 * `yargs` is two hops from www/docs via @astrojs/check and three from
 * every workspace via c8, so a region keyed on the nearest would report
 * the bump as www/docs-only. `all` is what lets a region say "and 41
 * others" instead.
 */
const importersOf = (
  id: DepID,
  g: DiffGraph,
  memo: Map<DepID, Reach>,
): Reach => {
  const hit = memo.get(id)
  if (hit) return hit
  const all = new Set<DepID>()
  let nearest: Set<DepID> | undefined
  let via: DepID | undefined
  const seen = new Set<DepID>([id])
  let level: DepID[] = [id]
  while (level.length) {
    const next: DepID[] = []
    const here = new Set<DepID>()
    for (const cur of level) {
      for (const { from } of g.dependents.get(cur) ?? []) {
        if (seen.has(from)) continue
        seen.add(from)
        if (g.importers.has(from)) {
          here.add(from)
          all.add(from)
          // `cur` sits one hop below an importer, so it is the direct
          // dependency this walk came up through. When `cur` is the
          // node we started from, that node is itself direct and has
          // no parent to hang under.
          if (!via && cur !== id) via = cur
        } else next.push(from)
      }
    }
    if (!nearest && here.size) nearest = here
    level = next
  }
  const out = {
    nearest: [...(nearest ?? [])].sort(),
    all: [...all].sort(),
    ...(via ? { via } : {}),
  }
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
  const memo = new Map<DepID, Reach>()
  // owner-set key -> { importers, node id -> mutation ids }
  const groups = new Map<
    string,
    {
      importers: DepID[]
      nodes: Map<DepID, string[]>
      mutationIds: Set<string>
    }
  >()

  const ownersOf = (node: DepID): Reach => {
    // a removed node is only reachable on the base side
    const g = head.nodes.has(node) ? head : base
    return g.importers.has(node) ?
        { nearest: [node], all: [node] }
      : importersOf(node, g, memo)
  }

  const nameOfNode = (id: DepID) =>
    (head.nodes.get(id) ?? base.nodes.get(id))?.name

  /** the direct dependency a mutation hangs under, if any */
  const viaOf = (m: Mutation) => {
    for (const node of mutationNodes(m)) {
      const id = ownersOf(node).via
      const name = id && nameOfNode(id)
      if (id && name) return { id, name }
    }
    return undefined
  }

  for (const m of mutations) {
    // one mutation can touch nodes with different owners (an edge
    // retarget, a version bump); the union owns it
    const reach = mutationNodes(m).map(ownersOf)
    const importers = [
      ...new Set(reach.flatMap(r => r.nearest)),
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
    // counted per mutation, not per region: unioning across a region's
    // whole mutation list would just say "something in here is shared",
    // which is true of every large region and tells the reader nothing
    const also = new Set<DepID>()
    for (const r of reach) {
      for (const id of r.all) {
        if (!importers.includes(id)) also.add(id)
      }
    }
    m.alsoReachedBy = also.size
    const via = viaOf(m)
    if (via) m.via = via
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
