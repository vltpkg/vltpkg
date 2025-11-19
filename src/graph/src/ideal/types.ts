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
import type { PeerContext } from './peers.ts'

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
