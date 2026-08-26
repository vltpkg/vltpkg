import { parse } from '@vltpkg/semver'
import { canonicalIdentity, project } from './projection.ts'
import { extractRegions, mutationNodes } from './regions.ts'
import { GRAPH_DIFF_SCHEMA_VERSION, MISSING } from './types.ts'
import type { DepID } from '@vltpkg/dep-id'
import type {
  DiffGraph,
  GraphDiff,
  LockfileData,
  Mutation,
  MutationDetail,
  MutationKind,
  NodeField,
  NodeInfo,
  Summary,
} from './types.ts'

const NODE_FIELDS: NodeField[] = [
  'integrity',
  'resolved',
  'location',
  'platform',
  'bins',
  'dev',
  'optional',
]

const same = (a: unknown, b: unknown) =>
  a === b || JSON.stringify(a) === JSON.stringify(b)

const groupBy = <T>(items: Iterable<T>, key: (item: T) => string) => {
  const out = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const list = out.get(k)
    if (list) list.push(item)
    else out.set(k, [item])
  }
  return out
}

const byVersion = (a: NodeInfo, b: NodeInfo) => {
  const pa = a.version && parse(a.version)
  const pb = b.version && parse(b.version)
  if (!pa || !pb)
    return (a.version ?? '').localeCompare(b.version ?? '')
  return pa.compare(pb)
}

const direction = (from: NodeInfo, to: NodeInfo) => {
  const pf = from.version && parse(from.version)
  const pt = to.version && parse(to.version)
  if (!pf || !pt) return 'sidegrade' as const
  const cmp = pt.compare(pf)
  return (
    cmp > 0 ? ('upgrade' as const)
    : cmp < 0 ? ('downgrade' as const)
    : ('sidegrade' as const)
  )
}

/** Which component of the id moved, when the package itself did not. */
const identityReason = (from: NodeInfo, to: NodeInfo) =>
  from.registry !== to.registry ? ('registry' as const)
  : from.modifier !== to.modifier ? ('modifier' as const)
  : ('peer-set' as const)

export type DiffOptions = {
  /**
   * Compare `resolved` even when the two sides declare different
   * registries. Off by default: the lockfile stores `resolved` only when
   * it does not start with that side's own `options.registry`, so a
   * registry migration flips it on nearly every node and would bury the
   * real changes. The single `options-changed` mutation carries that fact
   * instead.
   *
   * ponytail: suppression rather than rehydration -- the true absolute
   * url needs the manifest, which the lockfile does not carry. Rehydrate
   * properly if `resolved` ever has to be compared across registries.
   */
  compareResolvedAcrossRegistries?: boolean
}

export const diffLockfiles = (
  base: LockfileData,
  head: LockfileData,
  options: DiffOptions = {},
): GraphDiff => {
  const b = project(base)
  const h = project(head)
  const mutations: Mutation[] = []
  let n = 0
  const add = (m: MutationDetail & { identityOnly?: boolean }) => {
    mutations.push({
      ...m,
      // written for every mutation, so consumers never have to treat an
      // absent key as "probably false"
      identityOnly: m.identityOnly ?? false,
      // filled in by extractRegions, once reachability is known
      alsoReachedBy: 0,
      id: `m${++n}`,
      directness: 'transitive',
    })
  }

  // 1. options. a registry migration is literally this, and reporting it
  //    once beats reporting it on every node.
  const optionFields = [
    ...new Set([
      ...Object.keys(b.options),
      ...Object.keys(h.options),
    ]),
  ]
    .filter(k => !same(b.options[k], h.options[k]))
    .sort()
  if (optionFields.length) {
    add({
      kind: 'options-changed',
      fields: optionFields,
      from: b.options,
      to: h.options,
    })
  }

  const registryChanged = !same(
    b.options.registry,
    h.options.registry,
  )
  const compareFields =
    registryChanged && !options.compareResolvedAcrossRegistries ?
      NODE_FIELDS.filter(f => f !== 'resolved')
    : NODE_FIELDS

  // 2. exact id matches: same node, possibly different payload
  const bOnly: NodeInfo[] = []
  const hOnly: NodeInfo[] = []
  for (const [id, from] of b.nodes) {
    const to = h.nodes.get(id)
    if (!to) {
      if (!from.importer) bOnly.push(from)
      continue
    }
    // platform is only persisted for optional nodes, so an optionality
    // flip loses it without the platform actually changing
    const fields = compareFields.filter(f =>
      f === 'platform' ?
        from.optional && to.optional && !same(from[f], to[f])
      : !same(from[f], to[f]),
    )
    if (fields.length) add({ kind: 'node-changed', from, to, fields })
  }
  for (const [id, to] of h.nodes) {
    if (!b.nodes.has(id) && !to.importer) hOnly.push(to)
  }

  // 3. canonical identity: same package, id moved (registry, peer set,
  //    modifier). never a bijection -- bucket and branch on cardinality.
  const bCanon = groupBy(bOnly, node => canonicalIdentity(node.id))
  const hCanon = groupBy(hOnly, node => canonicalIdentity(node.id))
  const bLeft: NodeInfo[] = []
  const hLeft: NodeInfo[] = []
  for (const [key, from] of bCanon) {
    const to = hCanon.get(key)
    if (!to) {
      bLeft.push(...from)
      continue
    }
    if (from.length === 1 && to.length === 1) {
      const [f] = from as [NodeInfo]
      const [t] = to as [NodeInfo]
      const fields = compareFields.filter(k => !same(f[k], t[k]))
      if (fields.length) {
        add({
          kind: 'node-changed',
          from: f,
          to: t,
          fields,
          identityOnly: false,
        })
      } else {
        add({
          kind: 'node-identity-changed',
          from: f,
          to: t,
          reason: identityReason(f, t),
          identityOnly: true,
        })
      }
    } else {
      const [first] = from as [NodeInfo]
      add({
        kind: 'peer-variants-regrouped',
        name: first.name,
        ...(first.version ? { version: first.version } : {}),
        ...(first.integrity ? { integrity: first.integrity } : {}),
        from: from.map(node => node.id),
        to: to.map(node => node.id),
        identityOnly: true,
      })
    }
  }
  for (const [key, to] of hCanon) {
    if (!bCanon.has(key)) hLeft.push(...to)
  }

  // 4. name-level correlation: a version actually moved
  const bName = groupBy(bLeft, node => node.name)
  const hName = groupBy(hLeft, node => node.name)
  for (const [name, from] of bName) {
    const to = hName.get(name)
    if (!to) {
      for (const node of from) add({ kind: 'node-removed', node })
      continue
    }
    // ponytail: positional pairing after a semver sort. good enough for
    // the N:M buckets real lockfiles produce; swap for a cost-matching
    // pass if the pairings ever read wrong.
    const f = [...from].sort(byVersion)
    const t = [...to].sort(byVersion)
    for (let i = 0; i < Math.max(f.length, t.length); i++) {
      const a = f[i]
      const z = t[i]
      if (a && z) {
        add({
          kind: 'package-resolved',
          name,
          from: a,
          to: z,
          direction: direction(a, z),
        })
      } else if (a) add({ kind: 'node-removed', node: a })
      else if (z) add({ kind: 'node-added', node: z })
    }
  }
  for (const [name, to] of hName) {
    if (!bName.has(name)) {
      for (const node of to) add({ kind: 'node-added', node })
    }
  }

  // 5. edges, keyed on the dependency slot they fill.
  //
  //    Only slots hanging off a node that exists unmoved on both sides
  //    are compared. When a node's own id moves -- a version bump, a peer
  //    reshuffle -- every edge beneath it changes key mechanically, and
  //    reporting those is double-counting: the node mutation already
  //    says it. On a real commit this is the difference between 948
  //    phantom removals and the 2 dependency slots that actually appeared.
  const stable = (id: DepID) => b.nodes.has(id) && h.nodes.has(id)

  //    A slot that follows a node we already reported moving is not news:
  //    "@babel/generator 7.29.7 -> 7.29.8" said it once, and repeating it
  //    for each of the five parents that depend on it buries the slots
  //    that genuinely changed. `dependents` in the projection is how a
  //    renderer answers "who points at this" without these.
  const explained = new Set<string>()
  for (const m of mutations) {
    if (
      m.kind === 'package-resolved' ||
      m.kind === 'node-identity-changed'
    ) {
      explained.add(`${m.from.id}\0${m.to.id}`)
    } else if (m.kind === 'peer-variants-regrouped') {
      for (const f of m.from) {
        for (const t of m.to) explained.add(`${f}\0${t}`)
      }
    }
  }

  for (const [key, from] of b.edges) {
    if (!stable(from.from)) continue
    const to = h.edges.get(key)
    if (!to) {
      add({ kind: 'edge-removed', edge: from })
      continue
    }
    if (from.to !== to.to) {
      if (explained.has(`${from.to}\0${to.to}`)) continue
      // retargeted at the same package and version is just the id moving
      const identityOnly =
        from.to !== MISSING &&
        to.to !== MISSING &&
        canonicalIdentity(from.to) === canonicalIdentity(to.to)
      add({ kind: 'edge-retargeted', from, to, identityOnly })
      continue
    }
    const fields = (['spec', 'type'] as const).filter(
      f => from[f] !== to[f],
    )
    if (fields.length) {
      add({ kind: 'edge-respecified', from, to, fields: [...fields] })
    }
  }
  for (const [key, edge] of h.edges) {
    if (stable(edge.from) && !b.edges.has(key)) {
      add({ kind: 'edge-added', edge })
    }
  }

  markDirectness(mutations, b, h)
  const regions = extractRegions(mutations, h, b)
  return {
    schemaVersion: GRAPH_DIFF_SCHEMA_VERSION,
    summary: summarize(mutations, b, h, regions.length),
    mutations,
    regions,
  }
}

/**
 * Direct means an importer depends on it straight away. Anything an
 * importer only reaches through another package is transitive.
 */
const markDirectness = (
  mutations: Mutation[],
  b: DiffGraph,
  h: DiffGraph,
) => {
  const direct = new Set<DepID>()
  for (const g of [b, h]) {
    for (const edge of g.edges.values()) {
      if (g.importers.has(edge.from) && edge.to !== MISSING) {
        direct.add(edge.to)
      }
    }
  }
  for (const m of mutations) {
    if (mutationNodes(m).some(id => direct.has(id))) {
      m.directness = 'direct'
    }
  }
}

const summarize = (
  mutations: Mutation[],
  b: DiffGraph,
  h: DiffGraph,
  regions: number,
): Summary => {
  const counts: Partial<Record<MutationKind, number>> = {}
  let identityOnly = 0
  for (const m of mutations) {
    counts[m.kind] = (counts[m.kind] ?? 0) + 1
    if (m.identityOnly) identityOnly++
  }
  return {
    nodes: {
      base: b.nodes.size - b.importers.size,
      head: h.nodes.size - h.importers.size,
    },
    edges: { base: b.edges.size, head: h.edges.size },
    counts,
    identityOnly,
    regions,
  }
}

/** True when anything at all changed, for `--exit-code`. */
export const hasChanges = (diff: GraphDiff) =>
  diff.mutations.length > 0
