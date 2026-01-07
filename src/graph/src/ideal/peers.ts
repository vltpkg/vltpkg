// helpers for managing peer dependency resolution
// during the ideal graph building process.

import { intersects } from '@vltpkg/semver'
import { satisfies } from '@vltpkg/satisfies'
import { getDependencies } from '../dependencies.ts'
import { getOrderedDependencies } from './get-ordered-dependencies.ts'
import type {
  ProcessPlacementResultEntry,
  PeerContext,
  PeerContextEntry,
  PeerContextEntryInput,
  ProcessPlacementResult,
} from './types.ts'
import type { Spec, SpecOptions } from '@vltpkg/spec'
import type { DependencySaveType, Manifest } from '@vltpkg/types'
import type { Monorepo } from '@vltpkg/workspaces'
import type { Dependency } from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'

/**
 * Retrieve a unique hash value for a given peer context set.
 */
export const retrievePeerContextHash = (
  peerContext: PeerContext | undefined,
): string | undefined => {
  // skips creating the initial peer context ref
  if (!peerContext?.index) return undefined

  return `ṗ:${peerContext.index}`
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
    for (const s of entry.specs) {
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
    if (incompatibleSpecs(spec, entry)) {
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
    if (incompatibleSpecs(spec, entry)) return true

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
  // create a new peer context set
  const nextPeerContext: PeerContext = new Map()
  nextPeerContext.index = graph.nextPeerContextIndex()
  // register it in the graph
  graph.peerContexts[nextPeerContext.index] = nextPeerContext

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
    // keep track of whether we need to fork the current peer context set
    let needsToForkPeerContext = false
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
    addEntriesToPeerContext(
      peerContext,
      prevEntries,
      fromNode,
      graph.monorepo,
    )

    // add this node's direct dependencies next
    const nextEntries = [
      ...nextDeps.map(dep => ({ ...dep, dependent: node })),
      ...[...nextPeerDeps.values()].map(dep => ({
        ...dep,
        dependent: node,
      })),
    ]
    if (nextEntries.length > 0) {
      needsToForkPeerContext = addEntriesToPeerContext(
        peerContext,
        nextEntries,
        node,
        graph.monorepo,
      )
    }

    // returns all entries that need to be added to a forked
    // context or undefined if the current context was updated directly
    return needsToForkPeerContext ? nextEntries : undefined
  },

  /**
   * Try to resolve peer dependencies using already seen target
   * values from the current peer context set.
   */
  resolvePeerDeps: () => {
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
          siblingEntry?.target &&
          !node.edgesOut.has(spec.final.name) &&
          satisfies(
            siblingEntry.target.id,
            spec,
            fromNode.location,
            fromNode.projectRoot,
            graph.monorepo,
          )
        ) {
          // The sibling's resolved target satisfies the peer spec,
          // use it directly - this prioritizes the workspace's own
          // direct dependency over versions from other workspaces
          graph.addEdge(type, spec, node, siblingEntry.target)
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
