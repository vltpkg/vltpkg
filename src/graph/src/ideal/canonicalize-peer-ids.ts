import { joinDepIDTuple, joinExtra, splitDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { createHash } from 'node:crypto'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'

const NUL = '\0'
const NL = '\n'
const MISSING = 'MISSING'
const PEER_PREFIX = 'peer.'

export type CanonicalizePeerIdsOptions = {
  digest?: (input: string, length: number) => string
}

export type PeerStoreMove = {
  node: Node
  from: DepID
  /** absent = merged-away copy, discard its dir */
  to?: DepID
}

export const peerEnvDigest = (input: string, length = 16): string =>
  createHash('sha256').update(input).digest('hex').slice(0, length)

export const byteCompare = (a: string, b: string): number =>
  a < b ? -1
  : a > b ? 1
  : 0

const canCarryPeerSuffix = (node: Node): boolean => {
  if (node.importer) return false
  const type = splitDepID(node.id)[0]
  return type !== 'file' && type !== 'workspace'
}

const hasPeerDependencies = (node: Node, graph: Graph): boolean => {
  const mani = node.manifest ?? graph.manifests.get(node.id)
  return !!(
    mani?.peerDependencies &&
    Object.keys(mani.peerDependencies).length > 0
  )
}

const hasPeerOutEdge = (node: Node): boolean => {
  for (const edge of node.edgesOut.values()) {
    if (edge.type === 'peer' || edge.type === 'peerOptional') {
      return true
    }
  }
  return false
}

export const isPeerScoped = (node: Node, graph: Graph): boolean => {
  if (!canCarryPeerSuffix(node)) return false
  return (
    !!node.peerSetHash ||
    hasPeerDependencies(node, graph) ||
    hasPeerOutEdge(node)
  )
}

export const serializeNodeEnv = (
  node: Node,
  opts: {
    resolvedIds?: Map<Node, DepID>
    intraSccIndex?: Map<Node, number>
  } = {},
): string => {
  const { resolvedIds, intraSccIndex } = opts
  const entries: string[] = []
  for (const edge of node.edgesOut.values()) {
    let ref: string
    if (!edge.to) {
      ref = MISSING
    } else if (intraSccIndex?.has(edge.to)) {
      const idx = intraSccIndex.get(edge.to)
      /* c8 ignore next */
      ref = idx === undefined ? MISSING : `#${idx}`
    } else {
      ref = resolvedIds?.get(edge.to) ?? edge.to.id
    }
    entries.push(`${edge.name}${NUL}${edge.type}${NUL}${ref}`)
  }
  entries.sort(byteCompare)
  return entries.join(NL)
}

const withPeerSuffix = (node: Node, peerSetHash: string): DepID => {
  const extra = joinExtra({
    modifier: node.modifier,
    peerSetHash,
  })
  const parsed = splitDepID(node.id)
  switch (parsed[0]) {
    case 'registry':
      return joinDepIDTuple(['registry', parsed[1], parsed[2], extra])
    case 'git':
      return joinDepIDTuple(['git', parsed[1], parsed[2], extra])
    case 'remote':
      return joinDepIDTuple(['remote', parsed[1], extra])
    /* c8 ignore next 2 */
    default:
      return node.id
  }
}

/**
 * The node's identity minus only its peer component. `baseDepID()` also
 * drops the modifier, and intra-SCC targets serialize positionally, so
 * with a bare base a cycle member's modifier would leave no trace in the
 * cycle's identity and two cycles differing only by it would merge.
 */
const peerlessDepID = (node: Node): DepID => withPeerSuffix(node, '')

/**
 * One member's contribution to an SCC's identity. A singleton and a
 * one-class SCC must produce the same string, or collapsing a cycle
 * renames the survivor on the next pass.
 */
const unitEntry = (
  node: Node,
  opts: {
    resolvedIds?: Map<Node, DepID>
    intraSccIndex?: Map<Node, number>
  },
): string =>
  `${peerlessDepID(node)}${NL}${serializeNodeEnv(node, opts)}`

const tarjan = (nodes: Node[], adj: Map<Node, Node[]>): Node[][] => {
  let index = 0
  const indices = new Map<Node, number>()
  const lowlink = new Map<Node, number>()
  const onStack = new Set<Node>()
  const stack: Node[] = []
  const sccs: Node[][] = []

  const strongconnect = (v: Node) => {
    indices.set(v, index)
    lowlink.set(v, index)
    index++
    stack.push(v)
    onStack.add(v)

    /* c8 ignore next */
    const neighbors = adj.get(v) ?? []
    for (const w of neighbors) {
      if (!indices.has(w)) {
        strongconnect(w)
        const lv = lowlink.get(v)
        const lw = lowlink.get(w)
        if (lv !== undefined && lw !== undefined && lw < lv) {
          lowlink.set(v, lw)
        }
      } else if (onStack.has(w)) {
        const lv = lowlink.get(v)
        const iw = indices.get(w)
        if (lv !== undefined && iw !== undefined && iw < lv) {
          lowlink.set(v, iw)
        }
      }
    }

    if (lowlink.get(v) === indices.get(v)) {
      const scc: Node[] = []
      for (;;) {
        const w = stack.pop()
        /* c8 ignore next */
        if (!w) break
        onStack.delete(w)
        scc.push(w)
        if (w === v) break
      }
      sccs.push(scc)
    }
  }

  for (const v of nodes) {
    if (!indices.has(v)) strongconnect(v)
  }
  return sccs
}

const hasSelfEdge = (node: Node): boolean => {
  for (const edge of node.edgesOut.values()) {
    if (edge.to === node) return true
  }
  return false
}

const sccEdgeRef = (
  edgeTo: Node | undefined,
  sccSet: Set<Node>,
  color: Map<Node, string>,
  resolvedIds: Map<Node, DepID>,
): string => {
  if (!edgeTo) return MISSING
  if (sccSet.has(edgeTo)) {
    /* c8 ignore next */
    return color.get(edgeTo) ?? MISSING
  }
  return resolvedIds.get(edgeTo) ?? edgeTo.id
}

const serializeWithColors = (
  node: Node,
  sccSet: Set<Node>,
  color: Map<Node, string>,
  resolvedIds: Map<Node, DepID>,
): string => {
  const entries: string[] = []
  for (const edge of node.edgesOut.values()) {
    entries.push(
      `${edge.name}${NUL}${edge.type}${NUL}${sccEdgeRef(edge.to, sccSet, color, resolvedIds)}`,
    )
  }
  entries.sort(byteCompare)
  return entries.join(NL)
}

const mapGet = <K>(m: Map<K, string>, key: K): string => {
  const v = m.get(key)
  /* c8 ignore next */
  return v ?? ''
}

/**
 * Weisfeiler–Lehman color refinement to a partition fixpoint, then a
 * canonical member order. Colors are dense ranks so the loop can
 * stabilize; positional `#idx` refs are assigned to color classes.
 */
const refineSccOrder = (
  scc: Node[],
  resolvedIds: Map<Node, DepID>,
): { order: Node[]; colors: Map<Node, string> } => {
  const sccSet = new Set(scc)
  const bases = [...new Set(scc.map(peerlessDepID))].sort(byteCompare)
  const initRank = new Map(bases.map((b, i) => [b, String(i)]))
  let color = new Map<Node, string>(
    scc.map(n => [n, mapGet(initRank, peerlessDepID(n))]),
  )

  // classic WL: each signature includes the node's own current color so
  // refinement is monotone (the partition only ever gets finer), and the
  // loop stops when the number of classes stops growing rather than when
  // rank labels are literally identical, so it terminates in at most
  // `scc.length` rounds even when labels permute on a stable partition
  let classCount = new Set(color.values()).size
  for (;;) {
    const rows = scc.map(n => ({
      n,
      key: `${peerlessDepID(n)}${NUL}${mapGet(color, n)}${NUL}${serializeWithColors(n, sccSet, color, resolvedIds)}`,
    }))
    const uniq = [...new Set(rows.map(r => r.key))].sort(byteCompare)
    const rank = new Map(uniq.map((k, i) => [k, String(i)]))
    color = new Map<Node, string>(
      rows.map(r => [r.n, mapGet(rank, r.key)]),
    )
    if (uniq.length === classCount) break
    classCount = uniq.length
  }

  const order = [...scc].sort(
    (a, b) =>
      byteCompare(peerlessDepID(a), peerlessDepID(b)) ||
      byteCompare(mapGet(color, a), mapGet(color, b)) ||
      byteCompare(a.id, b.id),
  )
  return { order, colors: color }
}

const colorClassKey = (node: Node, colors: Map<Node, string>) =>
  `${peerlessDepID(node)}${NUL}${mapGet(colors, node)}`

type Assignment = {
  node: Node
  ser: string
  suffix: string
  newId: DepID
}

const mergeNode = (graph: Graph, winner: Node, loser: Node) => {
  winner.dev &&= loser.dev
  winner.optional &&= loser.optional

  // the loser may be the copy carrying lockfile/registry metadata or the
  // manifest; preserve anything the winner is missing before deletion
  winner.integrity ??= loser.integrity
  winner.resolved ??= loser.resolved
  if (
    loser.resolvedFromLockfile &&
    winner.integrity &&
    winner.resolved
  ) {
    winner.resolvedFromLockfile = true
  }
  if (!winner.manifest && loser.manifest) {
    winner.manifest = loser.manifest
    graph.manifests.set(winner.id, loser.manifest)
  }

  for (const edge of loser.edgesIn) {
    edge.to = winner
    winner.edgesIn.add(edge)
  }
  loser.edgesIn.clear()

  for (const edge of loser.edgesOut.values()) {
    graph.edges.delete(edge)
    edge.to?.edgesIn.delete(edge)
  }
  loser.edgesOut.clear()

  const nbn = graph.nodesByName.get(loser.name)
  if (nbn) {
    nbn.delete(loser)
    if (nbn.size === 0) graph.nodesByName.delete(loser.name)
  }

  const revs = graph.resolutionsReverse.get(loser)
  if (revs) {
    for (const r of revs) graph.resolutions.delete(r)
    graph.resolutionsReverse.delete(loser)
  }
}

const applyAssignments = (
  graph: Graph,
  keep: Assignment[],
  losers: Map<Node, Node>,
): PeerStoreMove[] => {
  const newKeys = new Map<DepID, Node>()
  for (const a of keep) newKeys.set(a.newId, a.node)

  for (const a of keep) {
    if (a.node.id !== a.newId && !newKeys.has(a.node.id)) {
      graph.nodes.delete(a.node.id)
      graph.manifests.delete(a.node.id)
    }
  }
  for (const loser of losers.keys()) {
    graph.nodes.delete(loser.id)
    graph.manifests.delete(loser.id)
  }

  const moves: PeerStoreMove[] = []
  for (const a of keep) {
    if (a.node.id !== a.newId) {
      const from = a.node.id
      a.node.setPeerIdentity(a.newId, a.suffix)
      if (a.node.extracted) {
        moves.push({ node: a.node, from, to: a.newId })
      }
    } else {
      a.node.peerSetHash = a.suffix
    }
  }
  for (const a of keep) {
    graph.nodes.set(a.newId, a.node)
    if (a.node.manifest) {
      graph.manifests.set(a.newId, a.node.manifest)
    }
  }

  for (const [loser, winner] of losers) {
    if (loser.extracted) {
      moves.push({ node: loser, from: loser.id })
    }
    mergeNode(graph, winner, loser)
  }

  const names = new Set<string>()
  for (const a of keep) names.add(a.node.name)
  for (const loser of losers.keys()) names.add(loser.name)
  for (const name of names) {
    const nbn = graph.nodesByName.get(name)
    if (!nbn) continue
    graph.nodesByName.set(
      name,
      new Set([...nbn].sort((a, b) => a.id.localeCompare(b.id))),
    )
  }

  graph.resolutions.clear()
  graph.resolutionsReverse.clear()

  if (losers.size > 0) graph.gc()
  graph.sortNodes()
  return moves
}

/**
 * Replace provisional / legacy `peer.<N>` DepID suffixes with a content
 * hash of each node's resolved out-edge set. Called after `graph.gc()`.
 */
export const canonicalizePeerIds = (
  graph: Graph,
  options: CanonicalizePeerIdsOptions = {},
): PeerStoreMove[] => {
  const digest = options.digest ?? peerEnvDigest
  const scoped = [...graph.nodes.values()]
    .filter(n => isPeerScoped(n, graph))
    .sort((a, b) => byteCompare(a.id, b.id))
  if (!scoped.length) return []

  const scopedSet = new Set(scoped)
  const adj = new Map<Node, Node[]>()
  for (const node of scoped) {
    const next: Node[] = []
    const seen = new Set<Node>()
    for (const edge of node.edgesOut.values()) {
      const to = edge.to
      if (!to || !scopedSet.has(to) || seen.has(to)) continue
      seen.add(to)
      next.push(to)
    }
    next.sort((a, b) => byteCompare(a.id, b.id))
    adj.set(node, next)
  }

  const resolvedIds = new Map<Node, DepID>()
  const keep: Assignment[] = []
  const byNewId = new Map<DepID, Assignment>()
  const losers = new Map<Node, Node>()

  const takeSuffix = (
    node: Node,
    ser: string,
    hex: string,
    roleIdx: number,
    roleCount: number,
  ) => {
    const makeSuffix = (h: string) =>
      roleCount > 1 ?
        `${PEER_PREFIX}${h}.${roleIdx}`
      : `${PEER_PREFIX}${h}`
    let suffix = makeSuffix(hex)
    let newId = withPeerSuffix(node, suffix)
    let occupant = byNewId.get(newId)
    if (occupant && occupant.ser !== ser) {
      suffix = makeSuffix(digest(ser, 32))
      newId = withPeerSuffix(node, suffix)
      occupant = byNewId.get(newId)
      /* c8 ignore start */
      if (occupant && occupant.ser !== ser) {
        suffix = `${suffix}.x`
        newId = withPeerSuffix(node, suffix)
        occupant = undefined
      }
      /* c8 ignore stop */
    }
    if (occupant?.ser === ser) {
      losers.set(node, occupant.node)
      resolvedIds.set(node, occupant.newId)
      return
    }
    const assigned: Assignment = { node, ser, suffix, newId }
    byNewId.set(newId, assigned)
    keep.push(assigned)
    resolvedIds.set(node, newId)
  }

  for (const scc of tarjan(scoped, adj)) {
    if (scc.length === 1 && scc[0]) {
      const node = scc[0]
      const intraSccIndex =
        hasSelfEdge(node) ? new Map([[node, 0]]) : undefined
      const ser = unitEntry(node, { resolvedIds, intraSccIndex })
      takeSuffix(node, ser, digest(ser, 16), 0, 1)
      continue
    }

    const { order, colors } = refineSccOrder(scc, resolvedIds)
    const seenClass = new Set<string>()
    const reps: Node[] = []
    for (const n of order) {
      const key = colorClassKey(n, colors)
      if (seenClass.has(key)) continue
      seenClass.add(key)
      reps.push(n)
    }
    const classIdx = new Map<string, number>()
    for (const [i, n] of reps.entries()) {
      classIdx.set(colorClassKey(n, colors), i)
    }
    const intraSccIndex = new Map<Node, number>()
    for (const n of order) {
      intraSccIndex.set(
        n,
        /* c8 ignore next */
        classIdx.get(colorClassKey(n, colors)) ?? 0,
      )
    }

    const unit = reps
      .map(n => unitEntry(n, { resolvedIds, intraSccIndex }))
      .join(NL)
    const hex = digest(unit, 16)

    const roleIdx = new Map<string, number>()
    const rolesPerBase = new Map<string, number>()
    for (const n of reps) {
      const base = peerlessDepID(n)
      const key = colorClassKey(n, colors)
      if (!roleIdx.has(key)) {
        const next = rolesPerBase.get(base) ?? 0
        roleIdx.set(key, next)
        rolesPerBase.set(base, next + 1)
      }
    }

    for (const n of order) {
      const key = colorClassKey(n, colors)
      /* c8 ignore next */
      const idx = roleIdx.get(key) ?? 0
      /* c8 ignore next */
      const count = rolesPerBase.get(peerlessDepID(n)) ?? 1
      takeSuffix(n, unit, hex, idx, count)
    }
  }

  return applyAssignments(graph, keep, losers)
}
