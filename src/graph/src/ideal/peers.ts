// helpers for managing peer dependency resolution
// during the ideal graph building process.

import { intersects } from '@vltpkg/semver'
import { satisfies } from '@vltpkg/satisfies'
import { Spec } from '@vltpkg/spec'
import { getDependencies, shorten } from '../dependencies.ts'
import { compareByType, getOrderedDependencies } from './sorting.ts'
import type {
  ProcessPlacementResultEntry,
  PeerContext,
  PeerContextEntry,
  PeerContextEntryInput,
  ProcessPlacementResult,
} from './types.ts'
import type { SpecOptions } from '@vltpkg/spec'
import { longDependencyTypes } from '@vltpkg/types'
import type {
  DependencySaveType,
  DependencyTypeLong,
  Manifest,
} from '@vltpkg/types'
import type { Monorepo } from '@vltpkg/workspaces'
import type { Dependency } from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'

/**
 * Result of checking if an existing node's peer edges are compatible
 * with a new parent's context. The `forkEntry` property is optional
 * and will only be present if the node's peer edges are incompatible.
 */
type PeerEdgeCompatResult = {
  compatible: boolean
  /** When incompatible, entry to add to forked context (target always present) */
  forkEntry?: PeerContextEntryInput & { target: Node }
}

/**
 * Check if a node satisfies a spec within a given context.
 *
 * Wraps the common `satisfies()` call pattern used throughout peer dependency
 * resolution. The satisfaction check requires:
 * - `node.id`: The DepID of the candidate node
 * - `spec`: The spec to satisfy (e.g., `^18.0.0`)
 * - `fromNode.location`: Where the dependency is declared (affects file: specs)
 * - `projectRoot`: For resolving workspace specs
 * - `monorepo`: For workspace-aware resolution
 */
const nodeSatisfiesSpec = (
  node: Node,
  spec: Spec,
  fromNode: Node,
  graph: Graph,
): boolean =>
  satisfies(
    node.id,
    spec,
    fromNode.location,
    fromNode.projectRoot,
    graph.monorepo,
  )

/**
 * Parse a spec with registry options from a parent node context.
 *
 * Inherits registry configuration from `graph.mainImporter.options` to ensure
 * consistent scope-registry and custom registry mappings. The `fromNode.registry`
 * override allows scoped packages to use their configured registry.
 */
const parseSpec = (
  name: string,
  bareSpec: string,
  fromNode: Node,
  graph: Graph,
): Spec =>
  Spec.parse(name, bareSpec, {
    ...graph.mainImporter.options,
    registry: fromNode.registry,
  })

/**
 * Generate a unique cache key for a peer context fork operation.
 *
 * Format: `{baseIndex}::{sortedEntrySignatures}`
 * - `baseIndex`: The parent context's index (0 for initial context)
 * - Entry signature: `{name}|{type}|{targetId}|{spec}` sorted alphabetically
 *
 * This enables caching identical fork operations to avoid creating duplicate
 * peer contexts when the same entries would be added to the same base context.
 */
const getForkKey = (
  peerContext: PeerContext,
  entries: PeerContextEntryInput[],
) => {
  const base = peerContext.index ?? 0
  const sig = entries
    .map(
      e =>
        `${e.spec.final.name}|${e.type}|${e.target?.id ?? '∅'}|${e.spec}`,
    )
    .sort()
    .join(';')
  return `${base}::${sig}`
}

/**
 * Check if parent declares a dep for peerName that the context target doesn't satisfy.
 * If so, the context entry isn't applicable - return true to ignore the mismatch.
 *
 * This prevents cross-importer peer context leakage. Example scenario:
 * - Root importer has `react@^18` in peer context
 * - Workspace A declares `react@^19` as a dependency
 * - When checking compatibility for Workspace A's deps, the `react@^18` context
 *   entry shouldn't force a fork because Workspace A will resolve its own react
 *
 * The logic: if parent declares peerName and the context target doesn't satisfy
 * parent's declared spec, the context entry won't be used anyway, so ignore it.
 */
const shouldIgnoreContextMismatch = (
  peerName: string,
  contextTarget: Node,
  fromNode: Node,
  graph: Graph,
): boolean => {
  const parentManifest = fromNode.manifest
  /* c8 ignore next - edge case: fromNode always has manifest in practice */
  if (!parentManifest) return false

  // Search all dependency types for a declaration of peerName
  for (const depType of longDependencyTypes) {
    const declared = parentManifest[depType]?.[peerName]
    if (!declared) continue

    // Parent declares this package - check if context target satisfies it
    const parentSpec = parseSpec(peerName, declared, fromNode, graph)
    // If context target doesn't satisfy parent's spec, ignore the mismatch
    // because parent will resolve its own version anyway
    return !nodeSatisfiesSpec(
      contextTarget,
      parentSpec,
      fromNode,
      graph,
    )
  }
  return false
}

/**
 * Build incompatible result if target satisfies the peer spec.
 *
 * Returns an incompatible result only when the target node actually satisfies
 * the peer spec. This matters because:
 * - If target satisfies the spec, it's a valid alternative that conflicts with
 *   the existing node's peer edge target
 * - If target doesn't satisfy the spec, it's not a valid peer resolution, so
 *   there's no conflict to report
 *
 * The returned `forkEntry` contains the conflicting spec and target, which will
 * be used to create a forked peer context with the alternative resolution.
 */
const buildIncompatibleResult = (
  target: Node,
  peerSpec: Spec,
  type: DependencySaveType,
  fromNode: Node,
  graph: Graph,
): PeerEdgeCompatResult | undefined => {
  if (nodeSatisfiesSpec(target, peerSpec, fromNode, graph)) {
    return {
      compatible: false,
      forkEntry: { spec: peerSpec, target, type },
    }
  }
  return undefined
}

/**
 * Check if an existing node's peer edges would still resolve to the same
 * targets from a new parent's context. Returns incompatible info if any
 * peer would resolve differently, meaning the node should NOT be reused.
 *
 * This is crucial for avoiding incorrect node reuse that would break peer
 * dependency contracts. Three sources of conflict are checked:
 *
 * 1. **Peer context entries**: The global peer context may have resolved a
 *    different version of a peer dependency than what the existing node expects.
 *
 * 2. **Already-placed siblings**: The parent node may already have an edge to
 *    a different version of the peer dependency.
 *
 * 3. **Not-yet-placed siblings**: The parent's manifest declares a dependency
 *    on the same package, and there's a graph node that would satisfy it but
 *    differs from what the existing node expects.
 */
export const checkPeerEdgesCompatible = (
  existingNode: Node,
  fromNode: Node,
  peerContext: PeerContext,
  graph: Graph,
): PeerEdgeCompatResult => {
  const peerDeps = existingNode.manifest?.peerDependencies
  // No peer deps = always compatible
  if (!peerDeps || Object.keys(peerDeps).length === 0) {
    return { compatible: true }
  }

  for (const [peerName, peerBareSpec] of Object.entries(peerDeps)) {
    const existingEdge = existingNode.edgesOut.get(peerName)

    // CHECK 0: Reject reuse if peer edge doesn't exist yet (node unprocessed).
    // Cannot verify compatibility since peer resolution depends on original
    // placement context, which may differ from current parent's context.
    // Note: Dangling edges (edge exists, no target) are handled separately below.
    // This conservative check prevents incorrect reuse when placement order varies.
    if (existingEdge === undefined) {
      return { compatible: false }
    }

    // Dangling peer edge (edge exists but unresolved) - skip, nothing to conflict with
    if (!existingEdge.to) continue

    const peerSpec = parseSpec(
      peerName,
      peerBareSpec,
      fromNode,
      graph,
    )

    // CHECK 1: Does peer context have a different target for this peer?
    const contextEntry = peerContext.get(peerName)
    if (
      contextEntry?.target &&
      contextEntry.target.id !== existingEdge.to.id &&
      !shouldIgnoreContextMismatch(
        peerName,
        contextEntry.target,
        fromNode,
        graph,
      )
    ) {
      // FIX: If existing edge target still satisfies the peer spec, no real conflict.
      // The existing resolution is still valid even if context has a different target.
      // This ensures idempotency when loading from lockfile where peer contexts
      // are rebuilt fresh but existing nodes have valid peer resolutions.
      if (nodeSatisfiesSpec(existingEdge.to, peerSpec, fromNode, graph)) {
        continue // Existing target still valid, no conflict
      }
      const result = buildIncompatibleResult(
        contextEntry.target,
        peerSpec,
        contextEntry.type,
        fromNode,
        graph,
      )
      if (result) return result
    }

    // CHECK 2: Does parent already have an edge to a different version?
    const siblingEdge = fromNode.edgesOut.get(peerName)
    if (siblingEdge?.to && siblingEdge.to.id !== existingEdge.to.id) {
      // FIX: If existing edge target still satisfies the peer spec, no real conflict.
      // Both sibling and existing targets may be valid - prefer keeping existing.
      if (nodeSatisfiesSpec(existingEdge.to, peerSpec, fromNode, graph)) {
        continue // Existing target still valid, no conflict
      }
      const result = buildIncompatibleResult(
        siblingEdge.to,
        peerSpec,
        siblingEdge.type,
        fromNode,
        graph,
      )
      if (result) return result
    }

    // CHECK 3: Does parent's manifest declare this peer, with a different
    // satisfying node already in the graph?
    const manifest = fromNode.manifest
    let declared: string | undefined
    let declaredType: DependencyTypeLong | undefined

    if (manifest) {
      for (const depType of longDependencyTypes) {
        const deps = manifest[depType]
        if (
          deps &&
          typeof deps === 'object' &&
          !Array.isArray(deps) &&
          peerName in deps
        ) {
          declared = deps[peerName]
          declaredType = depType
          break
        }
      }
    }

    if (declared && declaredType) {
      const parentSpec = parseSpec(
        peerName,
        declared,
        fromNode,
        graph,
      )
      // FIX: If existing edge target already satisfies parent's declared spec,
      // there's no conflict - the parent can use the same node as the existing
      // peer edge. Only search for alternatives if existing target is incompatible.
      if (nodeSatisfiesSpec(existingEdge.to, parentSpec, fromNode, graph)) {
        continue // Existing target works for parent too, no conflict
      }
      for (const candidateNode of graph.nodes.values()) {
        if (
          candidateNode.name === peerName &&
          candidateNode.id !== existingEdge.to.id &&
          nodeSatisfiesSpec(
            candidateNode,
            parentSpec,
            fromNode,
            graph,
          ) &&
          nodeSatisfiesSpec(candidateNode, peerSpec, fromNode, graph)
        ) {
          return {
            compatible: false,
            forkEntry: {
              spec: peerSpec,
              target: candidateNode,
              type: shorten(declaredType),
            },
          }
        }
      }
    }
  }

  return { compatible: true }
}

/**
 * Retrieve a unique hash value for a given peer context set.
 */
export const retrievePeerContextHash = (
  peerContext: PeerContext | undefined,
): string | undefined => {
  // skips creating the initial peer context ref
  if (!peerContext?.index) return undefined

  return `peer.${peerContext.index}`
}

/**
 * Checks if a given spec is compatible with the specs already
 * assigned to a peer context entry.
 *
 * Returns true if INCOMPATIBLE, false if compatible.
 *
 * Compatibility rules:
 * - **Registry specs**: Uses semver range intersection. `^18.0.0` and `^18.2.0`
 *   intersect (compatible), but `^18.0.0` and `^19.0.0` don't (incompatible).
 * - **Non-registry specs** (git, file, etc.): Requires exact bareSpec match.
 *   `github:foo/bar#v1` only matches itself.
 *
 * This is used to determine when peer context forking is needed - if specs
 * are incompatible, a new peer context must be created.
 */
export const incompatibleSpecs = (
  spec: Spec,
  entry: PeerContextEntry,
): boolean => {
  if (entry.specs.size > 0) {
    for (const s_ of entry.specs) {
      const s = s_.final
      if (
        // Registry types: check semver range intersection
        (spec.type === 'registry' &&
          (!spec.range ||
            !s.range ||
            !intersects(spec.range, s.range))) ||
        // Non-registry types: require exact bareSpec match
        (spec.type !== 'registry' && spec.bareSpec !== s.bareSpec)
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * Sort peer context entry inputs for deterministic processing.
 * Orders: non-peer dependencies first, then peer dependencies, alphabetically by name.
 */
export const getOrderedPeerContextEntries = (
  entries: PeerContextEntryInput[],
): PeerContextEntryInput[] => [...entries].sort(compareByType)

/*
 * Checks if there are any conflicting versions for a given dependency
 * to be added to a peer context set which will require forking.
 *
 * Returns true if forking is needed, false otherwise.
 */
export const checkEntriesToPeerContext = (
  peerContext: PeerContext,
  entries: PeerContextEntryInput[],
): boolean => {
  // check on compatibility of new entries
  for (const { spec, target } of entries) {
    const name = target?.name ?? spec.final.name

    // skip any inactive entry
    const entry = peerContext.get(name)
    if (!entry?.active) continue

    // validate if the provided spec is compatible with existing specs
    if (incompatibleSpecs(spec.final, entry)) {
      return true
    }
  }

  return false
}

/**
 * Add or update dependencies in a given peer context making sure to check
 * for compatibility with existing dependencies already resolved by a given
 * peer context set. Extra info such as a target or dependent nodes is
 * optional.
 *
 * Returns true if forking is needed, false otherwise.
 */
export const addEntriesToPeerContext = (
  peerContext: PeerContext,
  entries: PeerContextEntryInput[],
  fromNode: Node,
  monorepo?: Monorepo,
): boolean => {
  // pre check for conflicts before processing
  if (checkEntriesToPeerContext(peerContext, entries)) return true

  for (const { dependent, spec, target, type } of entries) {
    const name = target?.name ?? spec.final.name
    let entry = peerContext.get(name)

    // create new entry if none exists
    if (!entry) {
      entry = {
        active: true,
        specs: new Set([spec]),
        target,
        type,
        contextDependents: new Set(),
      }
      peerContext.set(name, entry)
      if (dependent) entry.contextDependents.add(dependent)
      continue
    }

    // check for sibling dep conflicts
    if (incompatibleSpecs(spec.final, entry)) return true

    // update target if compatible with all specs
    if (
      target &&
      [...entry.specs].every(s =>
        satisfies(
          target.id,
          s,
          fromNode.location,
          fromNode.projectRoot,
          monorepo,
        ),
      )
    ) {
      if (
        target.id !== entry.target?.id &&
        target.version !== entry.target?.version
      ) {
        // update dependents to point to new target
        for (const dep of entry.contextDependents) {
          const edge = dep.edgesOut.get(name)
          if (edge?.to && edge.to !== target) {
            edge.to.edgesIn.delete(edge)
            edge.to = target
            target.edgesIn.add(edge)
          }
        }
        entry.target = target
      }
      entry.target ??= target
    }

    entry.specs.add(spec)
    if (dependent) entry.contextDependents.add(dependent)
  }

  return false
}

/**
 * Create and returns a forked copy of a given peer context set.
 */
export const forkPeerContext = (
  graph: Graph,
  peerContext: PeerContext,
  entries: PeerContextEntryInput[],
): PeerContext => {
  const forkKey = getForkKey(peerContext, entries)
  const cached = graph.peerContextForkCache.get(forkKey)
  if (cached) {
    return cached
  }

  // create a new peer context set
  const nextPeerContext: PeerContext = new Map()
  nextPeerContext.index = graph.nextPeerContextIndex()
  // register it in the graph
  graph.peerContexts[nextPeerContext.index] = nextPeerContext
  graph.peerContextForkCache.set(forkKey, nextPeerContext)

  // copy existing entries marking them as inactive, it's also important
  // to note that specs and contextDependents are new objects so that changes
  // to those in the new context do not affect the previous one
  for (const [name, entry] of peerContext.entries()) {
    nextPeerContext.set(name, {
      active: false,
      specs: new Set(entry.specs),
      target: undefined,
      type: entry.type,
      contextDependents: new Set(entry.contextDependents),
    })
  }

  // add the new entries to this peer context set, marking them as active
  // these are the entries that were incompatible with the previous context set
  for (const entry of entries) {
    const { dependent, spec, target, type } = entry
    const name = target?.name /* c8 ignore next */ ?? spec.final.name
    const newEntry = {
      active: true,
      specs: new Set([spec]),
      target,
      type,
      contextDependents:
        dependent ? new Set([dependent]) : new Set<Node>(),
    }
    nextPeerContext.set(name, newEntry)
  }

  return nextPeerContext
}

/**
 * Find a peer from queued entries' peer edge closure using BFS.
 *
 * This handles peer dependency cycles like `@isaacs/peer-dep-cycle-a/b/c` where:
 * - A depends on B (peer)
 * - B depends on C (peer)
 * - C depends on A (peer)
 *
 * The BFS explores:
 * 1. Start nodes: All resolved targets from `queuedEntries` (sibling deps)
 * 2. For each node, check if it has an edge to `name` that satisfies `peerSpec`
 * 3. If not found, follow peer edges to explore their peer edges (up to depth 3)
 *
 * Prefers "local" providers (found via sibling's peer edges) over global context.
 */
const findFromPeerClosure = (
  name: string,
  peerSpec: Spec,
  queuedEntries: PeerContextEntryInput[],
  fromNode: Node,
  graph: Graph,
): Node | undefined => {
  // Start BFS from all resolved sibling targets
  const start = queuedEntries
    .map(e => e.target)
    .filter((n): n is Node => !!n)
  const seen = new Set<string>()
  const q: { n: Node; depth: number }[] = start.map(n => ({
    n,
    depth: 0,
  }))

  while (q.length) {
    const cur = q.shift()
    if (!cur || seen.has(cur.n.id)) continue
    seen.add(cur.n.id)

    // Check if this node has an edge to the peer we're looking for
    const edge = cur.n.edgesOut.get(name)
    if (
      edge?.to &&
      nodeSatisfiesSpec(edge.to, peerSpec, fromNode, graph)
    ) {
      return edge.to
    }

    // Follow peer edges only (not regular deps) to stay in peer closure
    for (const e of cur.n.edgesOut.values()) {
      if ((e.type === 'peer' || e.type === 'peerOptional') && e.to) {
        q.push({ n: e.to, depth: cur.depth + 1 })
      }
    }
  }
  return undefined
}

/**
 * Starts the peer dependency placement process
 * for a given node being processed and placed.
 */
export const startPeerPlacement = (
  peerContext: PeerContext,
  manifest: Manifest,
  fromNode: Node,
  options: SpecOptions,
) => {
  // queue entries so that they can be added at the end of the placement
  // process, use a map to ensure deduplication between read json dep
  // values and the resolved edges in the graph
  const queueMap = new Map<string, PeerContextEntryInput>()
  let peerSetHash: string | undefined

  if (
    manifest.peerDependencies &&
    Object.keys(manifest.peerDependencies).length > 0
  ) {
    // generates a peer context set hash for nodes that
    // have peer dependencies to be resolved
    peerSetHash = retrievePeerContextHash(peerContext)

    // get any potential sibling dependency from the
    // parent node that might have not been parsed yet
    const siblingDeps = getDependencies(fromNode, {
      ...options,
      registry: fromNode.registry,
    })
    for (const [depName, dep] of siblingDeps) {
      queueMap.set(depName, dep)
    }

    // collect the already parsed nodes and add those to the
    // list of entries to be added to the peer context set
    for (const edge of fromNode.edgesOut.values()) {
      queueMap.set(edge.name, {
        spec: edge.spec,
        target: edge.to,
        type: edge.type,
      })
    }
  }

  return {
    peerSetHash,
    // Sort queuedEntries for deterministic order
    queuedEntries: getOrderedPeerContextEntries([
      ...queueMap.values(),
    ]),
  }
}

/**
 * Ends the peer dependency placement process, returning the functions that
 * are going to be used to update the peer context set, forking when needed
 * and resolving peer dependencies if possible.
 *
 * Returns two deferred functions:
 * - `putEntries()`: Adds entries to peer context; returns fork entries if conflict
 * - `resolvePeerDeps()`: Resolves peer deps from context/siblings or adds to nextDeps
 *
 * These are deferred (not executed immediately) so that all siblings at a level
 * can be processed before peer context updates, enabling context reuse optimization.
 */
export const endPeerPlacement = (
  peerContext: PeerContext,
  nextDeps: Dependency[],
  nextPeerDeps: Map<string, Dependency> & { id?: number },
  graph: Graph,
  spec: Spec,
  fromNode: Node,
  node: Node,
  type: DependencySaveType,
  queuedEntries: PeerContextEntryInput[],
) => ({
  /**
   * Add the new entries to the current peer context set.
   *
   * Two sets of entries are checked:
   * - `prevEntries`: Parent's queued entries + self-reference
   * - `nextEntries`: This node's deps + peer deps (with node as dependent)
   *
   * If either conflicts with the current context, returns ALL entries to be
   * added to a forked context (prevEntries last for priority).
   *
   * Returns `undefined` if no fork needed (entries added directly to context).
   */
  putEntries: () => {
    // add queued entries from this node parents along
    // with a self-ref to the current peer context set
    const prevEntries = [
      ...queuedEntries,
      /* ref itself */ {
        spec,
        target: node,
        type,
      },
    ]

    const nextEntries = [
      ...nextDeps.map(dep => ({ ...dep, dependent: node })),
      ...[...nextPeerDeps.values()].map(dep => ({
        ...dep,
        dependent: node,
      })),
    ]

    const conflictPrev = checkEntriesToPeerContext(
      peerContext,
      prevEntries,
    )
    const conflictNext =
      nextEntries.length > 0 &&
      checkEntriesToPeerContext(peerContext, nextEntries)

    if (conflictPrev || conflictNext) {
      // returns all entries that need to be added to a forked context
      // giving priority to parent entries (prevEntries) by placing them last
      return [...nextEntries, ...prevEntries]
    }

    addEntriesToPeerContext(
      peerContext,
      prevEntries,
      fromNode,
      graph.monorepo,
    )

    if (nextEntries.length > 0) {
      addEntriesToPeerContext(
        peerContext,
        nextEntries,
        node,
        graph.monorepo,
      )
    }

    return undefined
  },

  /**
   * Try to resolve peer dependencies using already seen target
   * values from the current peer context set.
   *
   * Resolution priority (highest to lowest):
   * 1. Sibling deps from parent (workspace direct deps take priority)
   * 2. Peer-edge closure of sibling targets (handles peer cycles)
   * 3. Global peer context set entries
   * 4. Add to nextDeps for normal resolution (or create dangling edge for optional)
   */
  resolvePeerDeps: () => {
    for (const nextDep of nextPeerDeps.values()) {
      const { spec, type } = nextDep
      /* c8 ignore next - only peer types reach here by design */
      if (type !== 'peer' && type !== 'peerOptional') continue

      const name = spec.final.name

      // PRIORITY 1: Sibling deps from parent
      // These take priority because workspace's direct deps should win over
      // versions from other workspaces that may be in the peer context
      const siblingEntry = queuedEntries.find(
        e => (e.target?.name ?? e.spec.final.name) === name,
      )
      const siblingTarget =
        siblingEntry?.target ?? fromNode.edgesOut.get(name)?.to

      if (
        siblingTarget &&
        nodeSatisfiesSpec(siblingTarget, spec, fromNode, graph)
      ) {
        // Override existing edge if pointing elsewhere (sibling must win)
        const existingEdge = node.edgesOut.get(name)
        if (existingEdge?.to && existingEdge.to !== siblingTarget) {
          existingEdge.to.edgesIn.delete(existingEdge)
          existingEdge.to = siblingTarget
          siblingTarget.edgesIn.add(existingEdge)
        } else if (!existingEdge) {
          graph.addEdge(type, spec, node, siblingTarget)
        }
        continue
      }

      // PRIORITY 2: Peer-edge closure of sibling targets
      // Handles cycles like A->B(peer)->C(peer)->A(peer)
      const localPeer = findFromPeerClosure(
        name,
        spec,
        queuedEntries,
        fromNode,
        graph,
      )
      if (localPeer && !node.edgesOut.has(name)) {
        graph.addEdge(type, spec, node, localPeer)
        continue
      }

      // PRIORITY 3: Global peer context set
      const entry = peerContext.get(name)
      if (
        !node.edgesOut.has(name) &&
        entry?.target &&
        nodeSatisfiesSpec(entry.target, spec, fromNode, graph)
      ) {
        graph.addEdge(type, spec, node, entry.target)
        entry.specs.add(spec.final)
        continue
      }

      // PRIORITY 4: Fallback - add to nextDeps or create dangling edge
      if (type === 'peerOptional') {
        // Optional peers that can't be resolved get a dangling edge
        graph.addEdge(type, spec, node)
      } else if (
        siblingEntry &&
        siblingEntry.spec.bareSpec !== spec.bareSpec
      ) {
        // Sibling has a more specific spec - use it for resolution
        nextDeps.push({ ...nextDep, spec: siblingEntry.spec })
      } else {
        // Add to next deps for normal resolution in upcoming levels
        nextDeps.push(nextDep)
      }
    }
  },
})

/**
 * Given an array of processed results for the current level dependencies
 * being placed in the currently building ideal graph, traverse its direct
 * dependencies and track peer dependencies in their appropriate peer context
 * sets, forking as needed and resolving peer dependencies using suitable
 * nodes already present in the graph if possible.
 *
 * This is the core peer context management algorithm, executed after each
 * BFS level. It runs in three phases:
 *
 * **Phase 1: Collect fork requirements**
 * Call `putEntries()` on each child dep to add entries to peer context.
 * Collect which children need forked contexts (due to conflicts).
 *
 * **Phase 2: Fork or reuse contexts**
 * For children needing forks, try to reuse a sibling's forked context if
 * compatible. This optimization reduces the number of peer contexts created.
 *
 * **Phase 3: Resolve peer deps**
 * With contexts finalized, call `resolvePeerDeps()` to create edges for
 * peers that can be satisfied from context/siblings, or add them to nextDeps.
 *
 * All operations are sorted by `node.id` for deterministic, reproducible builds.
 */
export const postPlacementPeerCheck = (
  graph: Graph,
  sortedLevelResults: ProcessPlacementResult[],
) => {
  for (const childDepsToProcess of sortedLevelResults) {
    // Sort by node.id for deterministic processing order
    const sortedChildDeps = [...childDepsToProcess].sort((a, b) =>
      a.node.id.localeCompare(b.node.id, 'en'),
    )

    // PHASE 1: Collect which children need forked contexts
    const needsForking = new Map<
      ProcessPlacementResultEntry,
      PeerContextEntryInput[]
    >()
    for (const childDep of sortedChildDeps) {
      const needsFork = childDep.updateContext.putEntries()
      if (needsFork) {
        needsForking.set(childDep, needsFork)
      }
    }

    // Sort forking entries for deterministic fork order
    const sortedNeedsForkingEntries = [
      ...needsForking.entries(),
    ].sort(([a], [b]) => a.node.id.localeCompare(b.node.id, 'en'))

    // PHASE 2: Fork or reuse sibling contexts
    // Track previous context for potential reuse by next sibling
    let prevContext
    for (const [childDep, nextEntries] of sortedNeedsForkingEntries) {
      // Optimization: try to reuse previous sibling's forked context
      // if its entries are compatible with this child's entries
      if (
        prevContext &&
        !checkEntriesToPeerContext(prevContext, nextEntries)
      ) {
        addEntriesToPeerContext(
          prevContext,
          nextEntries,
          childDep.node,
          graph.monorepo,
        )
        childDep.peerContext = prevContext
        continue
      }

      // Can't reuse - create a new forked context
      childDep.peerContext = forkPeerContext(
        graph,
        childDep.peerContext,
        nextEntries,
      )
      prevContext = childDep.peerContext
    }

    // PHASE 3: Resolve peer deps with finalized contexts
    for (const childDep of sortedChildDeps) {
      childDep.updateContext.resolvePeerDeps()
      // Re-order deps for deterministic next-level processing
      childDep.deps = getOrderedDependencies(childDep.deps)
    }
  }
}
