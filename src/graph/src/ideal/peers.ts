// helpers for managing peer dependency resolution
// during the ideal graph building process.

import { intersects } from '@vltpkg/semver'
import { satisfies } from '@vltpkg/satisfies'
import { getDependencies } from '../dependencies.ts'
import type { Spec, SpecOptions } from '@vltpkg/spec'
import type { DependencySaveType, Manifest } from '@vltpkg/types'
import type { Dependency } from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'

/**
 * Entry in a peer context representing a resolved peer dependency.
 */
export type PeerContextEntry = {
  // List of full Spec objects that are part of this peer context entry
  specs: Set<Spec>
  // The target Node that satisfies all specs for this peer context entry
  target: Node | undefined
  // The type of dependency this entry represents
  type: DependencySaveType
  // Context dependent nodes that had dependencies resolved to this entry
  contextDependents: Set<Node>
}

/**
 * Input for adding an entry to peer contexts.
 */
export type PeerContextEntryInput = {
  /** Node this peer context entry resolves to */
  target?: Node
} & Dependency

/**
 * Represents resolved peer dependencies in a given append-nodes context.
 */
export type PeerContext = Map<string, PeerContextEntry> & {
  index?: number
}

/**
 * Retrieve a unique reference string for a given peer context set.
 */
export const retrievePeerContextRef = (
  peerContext: PeerContext | undefined,
): string | undefined => {
  if (!peerContext?.index) return undefined

  return `peer:${peerContext.index}`
}

/**
 * Add or update dependencies in a given peer context making sure to check
 * for compatibility with existing dependencies already resolved by a given
 * peer context set. Extra info such as a target or dependent nodes is
 * optional.
 */
export const addEntriesToPeerContext = (
  peerContext: PeerContext,
  entries: PeerContextEntryInput[],
  dependent?: Node,
): boolean => {
  // marks conflicts requiring fork
  let needsFork = false

  for (const { spec, target, type } of entries) {
    const name = target?.name ?? spec.final.name

    let entry = peerContext.get(name)

    // if there's no existing entry, create one
    if (!entry) {
      entry = {
        specs: new Set(),
        target,
        type,
        contextDependents: new Set(),
      }
      peerContext.set(name, entry)
      entry.specs.add(spec)
      if (dependent) entry.contextDependents.add(dependent)
      continue
    }

    // check if the new provided target satisfies existing specs
    // if not then we may need to fork the current peer context set
    if (target && entry.specs.size > 0) {
      for (const s of entry.specs) {
        if (spec.range && s.range && intersects(spec.range, s.range))
          continue
        if (!satisfies(target.id, s)) {
          needsFork = true
          break
        }
      }
    }

    // validate if the provided spec is compatible with existing specs
    // if not then we need to fork the current peer context set
    if (!needsFork && entry.specs.size > 0) {
      for (const s of entry.specs) {
        if (
          !spec.range ||
          !s.range ||
          (entry.contextDependents.size > 0 &&
            !intersects(spec.range, s.range))
        ) {
          needsFork = true
          break
        }
      }
    }

    // if a fork is needed, bail out early
    if (needsFork) return true

    // we have a compatible entry that has a new target
    // so we need to update all dependents to point to the new target
    if (target && entry.target && target.id !== entry.target.id) {
      for (const dependents of entry.contextDependents) {
        const edge = dependents.edgesOut.get(name)
        if (
          edge &&
          (edge.type === 'peer' /* c8 ignore next */ ||
            edge.type === 'peerOptional')
        ) {
          edge.to = target
        }
      }
      entry.target = target

      // in case this entry was just missing a target, set it now
    } else if (!entry.target && target) {
      entry.target = target
    }

    // update specs and dependents values
    entry.specs.add(spec)
    if (dependent) entry.contextDependents.add(dependent)
  }

  return false
}

/**
 * Add the provided node to the peer context set if an entry
 * for its name is already available in the peer context.
 *
 * This ensures this node can be used to satisyfy peer dependencies
 * later on when using this peer context to resolve future nodes.
 */
export const addSelfToPeerContext = (
  peerContext: PeerContext,
  spec: Spec,
  node: Node,
  type: DependencySaveType,
): boolean =>
  addEntriesToPeerContext(peerContext, [
    {
      spec,
      target: node,
      type,
    },
  ])

/**
 * Create a forked copy of a given peer context set with specific
 * entries and dependents info added to it.
 */
export const forkPeerContext = (
  peerContext: PeerContext,
  data: { entries: PeerContextEntryInput[]; dependent?: Node }[],
): PeerContext => {
  peerContext = new Map(peerContext)
  peerContext.index = nextPeerContextIndex()
  for (const { entries, dependent } of data) {
    for (const entry of entries) {
      const { spec, target, type } = entry
      const name = target?.name ?? spec.final.name
      const newEntry = {
        specs: new Set([spec]),
        target,
        type,
        contextDependents:
          dependent ? new Set([dependent]) : new Set<Node>(),
      }
      peerContext.set(name, newEntry)
    }
  }
  return peerContext
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
  const entries = []
  const peerData = []
  let peerSetRef: string | undefined
  let needsToForkPeerContext = false

  if (
    manifest.peerDependencies &&
    Object.keys(manifest.peerDependencies).length > 0
  ) {
    // get any potential sibling dependency from the
    // parent node that might have not been parsed yet
    const siblingDeps = getDependencies(fromNode, {
      ...options,
      registry: fromNode.registry,
    })
    entries.push(...siblingDeps.values())

    // collect the already parsed nodes and add those to the
    // list of entries to be added to the peer context set
    for (const edge of fromNode.edgesOut.values()) {
      entries.push({
        spec: edge.spec,
        target: edge.to,
        type: edge.type,
      })
    }
    peerData.push({ entries })

    // add parent's dependencies to peer context but notice we don't
    // add itself as a `dependent` of those entries since they're not
    // actual peer dependencies themselves
    needsToForkPeerContext =
      addEntriesToPeerContext(
        peerContext,
        entries,
      ) /* c8 ignore next */ || needsToForkPeerContext

    peerSetRef = retrievePeerContextRef(peerContext)
  }

  return {
    peerData,
    peerSetRef,
    needsToForkPeerContext,
  }
}

/**
 * Ends the peer dependency placement process, adding any new entries
 * to the current peer context set and trying to resolve any peer dependencies
 * from the current peer context set.
 *
 * Unresolved peer dependencies are added back to the `nextDeps` list
 * for regular processing.
 */
export const endPeerPlacement = (
  peerContext: PeerContext,
  peerData: { entries: PeerContextEntryInput[]; dependent?: Node }[],
  nextDeps: Dependency[],
  nextPeerDeps: Map<string, Dependency>,
  graph: Graph,
  spec: Spec,
  fromNode: Node,
  node: Node,
  type: DependencySaveType,
  needsToForkPeerContext: boolean,
): PeerContext => {
  // add dependencies from the currently parsing manifest
  // to the current set of peer context entries including itself
  // in case of a newly seen dependency in this context
  const nextEntries = [
    ...nextDeps,
    ...nextPeerDeps.values(),
    /* ref itself */ {
      spec,
      target: node,
      type,
    },
  ]
  needsToForkPeerContext =
    addEntriesToPeerContext(peerContext, nextEntries, node) ||
    needsToForkPeerContext
  peerData.push({ entries: nextEntries, dependent: node })

  // iterate on the set of peer dependencies of the current node
  // and try to resolve them from the existing peer context set,
  // when possible, add them as edges in the graph right away, if not,
  // then we move them back to the `nextDeps` list for processing
  // along with the rest of the regular dependencies
  for (const nextDep of nextPeerDeps.values()) {
    const { spec, type } = nextDep
    if (type === 'peer' || type === 'peerOptional') {
      // try to retrieve an entry for that peer dep from
      // the current peer context set
      const entry = peerContext.get(spec.final.name)
      if (
        entry?.target &&
        satisfies(
          entry.target.id,
          spec,
          fromNode.location,
          fromNode.projectRoot,
        )
      ) {
        // entry satisfied, create edge in the graph
        graph.addEdge(type, spec, node, entry.target)
        entry.specs.add(spec.final)
      } else if (type === 'peerOptional') {
        // skip unsatisfied peerOptional dependencies,
        // just create a dangling edge
        graph.addEdge(type, spec, node)
      } else {
        // could not satisfy from peer context, add to next deps
        nextDeps.push(nextDep)
      }
    }
  }

  // if any dependency could not be added to the current peer context
  // and requested a fork of the current peer set, this is the time to do it
  if (needsToForkPeerContext) {
    peerContext = forkPeerContext(peerContext, peerData)
  }

  return peerContext
}

/** Global index to assign unique ids to peer context sets. */
let peerContextIndex = 0
/**
 * Retrieve the next unique index for a peer context set.
 */
export const nextPeerContextIndex = () => peerContextIndex++
