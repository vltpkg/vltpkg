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
    putEntries: () =>
      | {
          dependent: Node
          spec: Spec
          type: DependencySaveType
        }[]
      | undefined
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
  /** List of full Spec objects that are part of this peer context entry */
  specs: Set<Spec>
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
 */
export type PeerContext = Map<string, PeerContextEntry> & {
  index?: number
}
