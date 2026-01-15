// helpers for managing peer dependency resolution
// during the ideal graph building process.

import { intersects } from '@vltpkg/semver'
import { satisfies } from '@vltpkg/satisfies'
import { Spec } from '@vltpkg/spec'
import { getDependencies, shorten } from '../dependencies.ts'
import { getOrderedDependencies } from './get-ordered-dependencies.ts'
import type {
  ProcessPlacementResultEntry,
  PeerContext,
  PeerContextEntry,
  PeerContextEntryInput,
  ProcessPlacementResult,
} from './types.ts'
import type { SpecOptions } from '@vltpkg/spec'
import { longDependencyTypes } from '@vltpkg/types'
import type { DependencySaveType, Manifest } from '@vltpkg/types'
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
  /** When incompatible, entry to add to forked context */
  forkEntry?: {
    spec: Spec
    target: Node
    type: DependencySaveType
  }
}

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
 * Check if an existing node's peer edges would still resolve to the same
 * targets from a new parent's context. Returns incompatible info if any
 * peer would resolve differently, meaning the node should NOT be reused.
 */
export const checkPeerEdgesCompatible = (
  existingNode: Node,
  fromNode: Node,
  peerContext: PeerContext,
  graph: Graph,
): PeerEdgeCompatResult => {
  // No peer deps means always compatible
  if (
    !existingNode.manifest?.peerDependencies ||
    Object.keys(existingNode.manifest.peerDependencies).length === 0
  )
    return { compatible: true }

  const peerDeps = existingNode.manifest.peerDependencies

  for (const [peerName, peerSpec] of Object.entries(peerDeps)) {
    const existingEdge = existingNode.edgesOut.get(peerName)
    if (!existingEdge?.to) continue // dangling peer, skip

    // Check the peer context for what this parent's context would provide
    const contextEntry = peerContext.get(peerName)

    // If context has a different target for this peer, not compatible
    if (
      contextEntry?.target &&
      contextEntry.target.id !== existingEdge.to.id
    ) {
      let ignoreContextMismatch = false
      // If the parent (fromNode) declares this peerName as a direct dependency,
      // and the peerContext target does NOT satisfy the parent's spec, then
      // this peerContext entry is not actually applicable for this parent.
      // In that case, do not treat it as incompatibility (prevents cross-importer
      // peerContext leakage from forcing unnecessary forks).
      const parentManifest = fromNode.manifest
      if (parentManifest) {
        for (const depType of longDependencyTypes) {
          const depRecord = parentManifest[depType]
          const declared = depRecord?.[peerName]
          if (!declared) continue
          const parentSpec = Spec.parse(peerName, declared, {
            ...graph.mainImporter.options,
            registry: fromNode.registry,
          })
          if (
            !satisfies(
              contextEntry.target.id,
              parentSpec,
              fromNode.location,
              fromNode.projectRoot,
              graph.monorepo,
            )
          ) {
            // This parent won't use the context target anyway, so ignore mismatch.
            ignoreContextMismatch = true
            break
          }
          // Parent spec is satisfied by context target, so mismatch is meaningful.
          break
        }
      }

      if (ignoreContextMismatch) {
        continue
      }

      // Verify the context target would actually satisfy the peer spec
      const spec = Spec.parse(peerName, peerSpec, {
        ...graph.mainImporter.options,
        registry: fromNode.registry,
      })
      if (
        satisfies(
          contextEntry.target.id,
          spec,
          fromNode.location,
          fromNode.projectRoot,
          graph.monorepo,
        )
      ) {
        return {
          compatible: false,
          forkEntry: {
            spec,
            target: contextEntry.target,
            type: contextEntry.type,
          },
        }
      }
    }

    // Also check parent's already-placed siblings
    const siblingEdge = fromNode.edgesOut.get(peerName)
    if (siblingEdge?.to && siblingEdge.to.id !== existingEdge.to.id) {
      const spec = Spec.parse(peerName, peerSpec, {
        ...graph.mainImporter.options,
        registry: fromNode.registry,
      })
      if (
        satisfies(
          siblingEdge.to.id,
          spec,
          fromNode.location,
          fromNode.projectRoot,
          graph.monorepo,
        )
      ) {
        return {
          compatible: false,
          forkEntry: {
            spec,
            target: siblingEdge.to,
            type: siblingEdge.type,
          },
        }
      }
    }

    // Check parent's manifest for not-yet-placed siblings
    // This handles the case where sibling hasn't been placed yet but will be
    const parentManifest = fromNode.manifest
    if (parentManifest) {
      for (const depType of longDependencyTypes) {
        const depRecord = parentManifest[depType]
        if (depRecord?.[peerName]) {
          // Parent declares this peer as a dependency
          // Check if there's an existing graph node that would satisfy it differently
          const parentSpec = Spec.parse(
            peerName,
            depRecord[peerName],
            {
              ...graph.mainImporter.options,
              registry: fromNode.registry,
            },
          )
          // Look for a node in the graph that satisfies parent's spec but differs from existing edge
          for (const candidateNode of graph.nodes.values()) {
            if (
              candidateNode.name === peerName &&
              candidateNode.id !== existingEdge.to.id &&
              satisfies(
                candidateNode.id,
                parentSpec,
                fromNode.location,
                fromNode.projectRoot,
                graph.monorepo,
              )
            ) {
              // Also verify this candidate satisfies the peer spec
              const peerSpecParsed = Spec.parse(peerName, peerSpec, {
                ...graph.mainImporter.options,
                registry: fromNode.registry,
              })
              if (
                satisfies(
                  candidateNode.id,
                  peerSpecParsed,
                  fromNode.location,
                  fromNode.projectRoot,
                  graph.monorepo,
                )
              ) {
                return {
                  compatible: false,
                  forkEntry: {
                    spec: peerSpecParsed,
                    target: candidateNode,
                    type: shorten(depType),
                  },
                }
              }
            }
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
 * Returns true if compatible, false otherwise.
 */
export const incompatibleSpecs = (
  spec: Spec,
  entry: PeerContextEntry,
): boolean => {
  if (entry.specs.size > 0) {
    for (const s_ of entry.specs) {
      const s = s_.final
      if (
        // only able to check range intersections for registry types
        (spec.type === 'registry' &&
          (!spec.range ||
            !s.range ||
            !intersects(spec.range, s.range))) ||
        // also support types other than registry in case
        // they use the very same bareSpec value
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
): PeerContextEntryInput[] =>
  [...entries].sort((a, b) => {
    const aIsPeer =
      a.type === 'peer' || a.type === 'peerOptional' ? 1 : 0
    const bIsPeer =
      b.type === 'peer' || b.type === 'peerOptional' ? 1 : 0
    if (aIsPeer !== bIsPeer) return aIsPeer - bIsPeer
    const aName = a.target?.name ?? a.spec.name
    const bName = b.target?.name ?? b.spec.name
    return aName.localeCompare(bName, 'en')
  })

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
  // pre check to see if any of the new entries to be added to the
  // provided peer context set conflicts with existing ones
  // if that's already the case we can skip processing them and
  // will return that a fork is needed right away
  if (checkEntriesToPeerContext(peerContext, entries)) return true

  // iterate on every entry to be added to the peer context set
  for (const { dependent, spec, target, type } of entries) {
    const name = target?.name ?? spec.final.name

    // if there's no existing entry, create one
    let entry = peerContext.get(name)
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

    // perform an extra check that confirms the new spec does not
    // conflicts with existing specs in this entry, this handles the
    // case of adding sibling deps that conflicts with one another
    if (incompatibleSpecs(spec.final, entry)) {
      return true
    }

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
        // we have a compatible entry that has a new, compatible target
        // so we need to update all dependents to point to the new target
        for (const dependents of entry.contextDependents) {
          const edge = dependents.edgesOut.get(name)
          if (edge?.to && edge.to !== target) {
            edge.to.edgesIn.delete(edge)
            edge.to = target
            target.edgesIn.add(edge)
          }
        }
        entry.target = target
      }

      // otherwise sets the value in case it was nullish
      entry.target ??= target
    }

    // update specs and dependents values
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

    const conflictPrev = checkEntriesToPeerContext(peerContext, prevEntries)
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
   */
  resolvePeerDeps: () => {
    const findFromQueuedPeerClosure = (
      name: string,
      peerSpec: Spec,
    ): Node | undefined => {
      // Explore peer edges of already-known sibling targets (and their peer targets),
      // to prefer "local" providers over whatever was stored in the global peerContext.
      const start = queuedEntries
        .map(e => e.target)
        .filter((n): n is Node => !!n)
      const seen = new Set<string>()
      const q: { n: Node; depth: number }[] = start.map(n => ({
        n,
        depth: 0,
      }))
      while (q.length) {
        const cur = q.shift()!
        if (seen.has(cur.n.id)) continue
        seen.add(cur.n.id)
        const edge = cur.n.edgesOut.get(name)
        if (
          edge?.to &&
          satisfies(
            edge.to.id,
            peerSpec,
            fromNode.location,
            fromNode.projectRoot,
            graph.monorepo,
          )
        ) {
          return edge.to
        }
        if (cur.depth >= 3) continue
        for (const e of cur.n.edgesOut.values()) {
          if ((e.type === 'peer' || e.type === 'peerOptional') && e.to) {
            q.push({ n: e.to, depth: cur.depth + 1 })
          }
        }
      }
      return undefined
    }

    // iterate on the set of peer dependencies of the current node
    // and try to resolve them from the existing peer context set,
    // when possible, add them as edges in the graph right away, if not,
    // then we move them back to the `nextDeps` list for processing
    // along with the rest of the regular dependencies
    for (const nextDep of nextPeerDeps.values()) {
      const { spec, type } = nextDep
      if (type === 'peer' || type === 'peerOptional') {
        // FIRST: Check if there's a sibling dependency from the parent
        // that specifies this same package. Sibling deps take priority
        // because they represent the workspace's direct dependency,
        // which should be preferred over versions from other workspaces
        // that may have been added to the peer context earlier.
        const siblingEntry = queuedEntries.find(
          e =>
            (e.target?.name ?? e.spec.final.name) === spec.final.name,
        )

        if (
          (siblingEntry?.target ||
            fromNode.edgesOut.get(spec.final.name)?.to) &&
          satisfies(
            (siblingEntry?.target ||
              fromNode.edgesOut.get(spec.final.name)?.to)!.id,
            spec,
            fromNode.location,
            fromNode.projectRoot,
            graph.monorepo,
          )
        ) {
          // The sibling's resolved target satisfies the peer spec,
          // use it directly - this prioritizes the workspace's own
          // direct dependency over versions from other workspaces
          const siblingTarget =
            siblingEntry?.target ||
            fromNode.edgesOut.get(spec.final.name)?.to

          // If this peer edge already exists but points somewhere else, override
          // to the sibling target (workspace direct deps must win).
          const existingPeerEdge = node.edgesOut.get(spec.final.name)
          if (existingPeerEdge?.to && siblingTarget) {
            if (existingPeerEdge.to !== siblingTarget) {
              existingPeerEdge.to.edgesIn.delete(existingPeerEdge)
              existingPeerEdge.to = siblingTarget
              siblingTarget.edgesIn.add(existingPeerEdge)
            }
          } else {
            graph.addEdge(type, spec, node, siblingTarget)
          }
          continue
        }

        // NEXT: try to resolve this peer from the peer-edge closure of
        // known sibling targets (eg. peer dependency cycles).
        const localPeer = findFromQueuedPeerClosure(spec.final.name, spec)
        if (localPeer && !node.edgesOut.has(spec.final.name)) {
          graph.addEdge(type, spec, node, localPeer)
          continue
        }

        // THEN: Try to retrieve an entry for that peer dep from
        // the current peer context set
        const entry = peerContext.get(spec.final.name)
        if (
          !node.edgesOut.has(spec.final.name) &&
          entry?.target &&
          satisfies(
            entry.target.id,
            spec,
            fromNode.location,
            fromNode.projectRoot,
            graph.monorepo,
          )
        ) {
          // entry satisfied, create edge in the graph
          graph.addEdge(type, spec, node, entry.target)
          entry.specs.add(spec.final)
        } else if (type === 'peerOptional') {
          // skip unsatisfied peerOptional dependencies,
          // just create a dangling edge
          graph.addEdge(type, spec, node)
        } else if (
          siblingEntry &&
          siblingEntry.spec.bareSpec !== spec.bareSpec
        ) {
          // Sibling has a more specific spec for this package,
          // use it when resolving to ensure we get the right version
          nextDeps.push({ ...nextDep, spec: siblingEntry.spec })
        } else {
          // could not satisfy from peer context or sibling, add to next deps
          nextDeps.push(nextDep)
        }
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
 */
export const postPlacementPeerCheck = (
  graph: Graph,
  sortedLevelResults: ProcessPlacementResult[],
) => {
  // Update peer contexts in a sorted manner after processing all nodes
  // at a given level to ensure deterministic behavior when it comes to
  // forking new peer contexts
  for (const childDepsToProcess of sortedLevelResults) {
    // Sort childDepsToProcess deterministically by node.id
    const sortedChildDeps = [...childDepsToProcess].sort((a, b) =>
      a.node.id.localeCompare(b.node.id, 'en'),
    )

    const needsForking = new Map<
      ProcessPlacementResultEntry,
      {
        dependent: Node
        spec: Spec
        type: DependencySaveType
      }[]
    >()
    // first iterate on all child deps, adding entries to the current
    // context and collect the information on which ones need forking
    for (const childDep of sortedChildDeps) {
      const needsFork = childDep.updateContext.putEntries()
      if (needsFork) {
        needsForking.set(childDep, needsFork)
      }
    }

    // Sort needsForking entries before iterating (Map iteration order = insertion order)
    const sortedNeedsForkingEntries = [
      ...needsForking.entries(),
    ].sort(([a], [b]) => a.node.id.localeCompare(b.node.id, 'en'))

    // then iterate again, forking contexts as needed but also try to
    // reuse the context of the previous sibling if possible
    let prevContext
    for (const [childDep, nextEntries] of sortedNeedsForkingEntries) {
      if (
        prevContext &&
        !checkEntriesToPeerContext(prevContext, nextEntries)
      ) {
        // the context of the previous sibling can be reused
        addEntriesToPeerContext(
          prevContext,
          nextEntries,
          childDep.node,
          graph.monorepo,
        )
        childDep.peerContext = prevContext
        continue
      }
      childDep.peerContext = forkPeerContext(
        graph,
        childDep.peerContext,
        nextEntries,
      )
      prevContext = childDep.peerContext
    }
    // try to resolve peer dependencies now that
    // the context is fully set up
    for (const childDep of sortedChildDeps) {
      childDep.updateContext.resolvePeerDeps()
      childDep.deps = getOrderedDependencies(childDep.deps)
    }
  }
}
