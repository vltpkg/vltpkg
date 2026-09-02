import type { DepID } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { Spec } from '@vltpkg/spec'
import type { DependencySaveType } from '@vltpkg/types'
import type {
  AddImportersDependenciesMap,
  Dependency,
  RemoveImportersDependenciesMap,
} from '../dependencies.ts'
import type { ModifierActiveEntry } from '../modifiers.ts'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'

/**
 * A map of dependencies to be added to non-importer nodes.
 * Keys are {@link DepID} of nodes that are not importers (e.g., nested folders).
 * When these nodes are resolved and placed in the graph, their dependencies
 * from this map are injected into the processing queue.
 */
export type TransientAddMap = Omit<
  AddImportersDependenciesMap,
  'modifiedDependencies'
>

/**
 * A map of dependency names to be removed from non-importer nodes.
 * Keys are {@link DepID} of nodes that are not importers (e.g., nested folders).
 * When these nodes are processed, their dependencies in this map are excluded.
 */
export type TransientRemoveMap = Omit<
  RemoveImportersDependenciesMap,
  'modifiedDependencies'
>

export type BuildIdealAddOptions = {
  /**
   * A {@link AddImportersDependenciesMap} in which keys are {@link DepID}
   * linking to another `Map` in which keys are the dependency names and values
   * are {@link Dependency}. This structure represents dependencies that need
   * to be added to the importer represented by {@link DepID}.
   */
  add: AddImportersDependenciesMap
}

export type BuildIdealRemoveOptions = {
  /**
   * A {@link RemoveImportersDependenciesMap} object representing nodes to be
   * removed from the ideal graph. Each {@link DepID} key represents an
   * importer node and the `Set` of dependency names to be removed from its
   * dependency list.
   */
  remove: RemoveImportersDependenciesMap
}

export type BuildIdealFromGraphOptions = {
  /**
   * An initial {@link Graph} to start building from, adding nodes to any
   * missing edges and appending any new specs defined in `addSpecs`.
   */
  graph: Graph
}

export type BuildIdealPackageInfoOptions = {
  /**
   * A {@link PackageInfoClient} instance to read manifest info from.
   */
  packageInfo: PackageInfoClient
}

/**
 * Represents an ongoing append operation for a node and its dependencies.
 */
export type AppendNodeEntry = {
  node: Node
  deps: Dependency[]
  modifierRefs?: Map<string, ModifierActiveEntry>
  depth: number
  peerContext: PeerContext
  updateContext: {
    putEntries: () => PeerContextEntryInput[] | undefined
    resolvePeerDeps: () => void
  }
}

/**
 * The result of processing a given placed node in the graph.
 */
export type ProcessPlacementResultEntry = Omit<
  AppendNodeEntry,
  'depth'
>

/**
 * The result of processing placement for nodes to be added to the graph.
 */
export type ProcessPlacementResult = ProcessPlacementResultEntry[]

/**
 * Entry in a peer context representing a resolved peer dependency.
 */
export type PeerContextEntry = {
  /**
   * True if this entry is currently being resolved and track by this
   * peer context set, false in case this entry was inherit from a previous
   * peer context set and should not be considered for resolution.
   */
  active: boolean
  /**
   * Full Spec objects that are part of this peer context entry, keyed by
   * `peerSpecKey()` so textually identical specs collapse into one entry
   * instead of piling up per dependent.
   */
  specs: Map<string, Spec>
  /** The target Node that satisfies all specs for this peer context entry */
  target: Node | undefined
  /** The type of dependency this entry represents */
  type: DependencySaveType
  /** Context dependent nodes that had dependencies resolved to this entry */
  contextDependents: Set<Node>
}

/**
 * Input for adding an entry to peer contexts.
 */
export type PeerContextEntryInput = {
  /** Node that depends on this resolved peer context set entry */
  dependent?: Node
  /** Node this peer context entry resolves to */
  target?: Node
} & Dependency

/**
 * Represents resolved peer dependencies in a given append-nodes context.
 *
 * Delegates to a `Map` rather than being one: compiled, assigning `index`
 * to a `Map` instance crashes the process.
 */
export class PeerContext implements Map<string, PeerContextEntry> {
  #map = new Map<string, PeerContextEntry>()
  index?: number
  get size() {
    return this.#map.size
  }
  get [Symbol.toStringTag]() {
    return 'Map' as const
  }
  clear() {
    this.#map.clear()
  }
  delete(name: string) {
    return this.#map.delete(name)
  }
  forEach(
    fn: (
      value: PeerContextEntry,
      key: string,
      map: Map<string, PeerContextEntry>,
    ) => void,
    thisArg?: unknown,
  ) {
    for (const [name, entry] of this.#map)
      fn.call(thisArg, entry, name, this)
  }
  get(name: string) {
    return this.#map.get(name)
  }
  has(name: string) {
    return this.#map.has(name)
  }
  set(name: string, entry: PeerContextEntry) {
    this.#map.set(name, entry)
    return this
  }
  entries() {
    return this.#map.entries()
  }
  keys() {
    return this.#map.keys()
  }
  values() {
    return this.#map.values()
  }
  [Symbol.iterator]() {
    return this.#map[Symbol.iterator]()
  }
}
