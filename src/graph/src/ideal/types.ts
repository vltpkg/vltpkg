import { DepID } from '@vltpkg/dep-id'
import { Dependency } from '../dependencies.js'
import { Graph } from '../graph.js'
import { PackageInfoClient } from '@vltpkg/package-info'

export interface BuildIdealAddOptions {
  /**
   * A `Map` in which keys are {@link DepID} linking to another `Map` in which
   * keys are the dependency names and values are {@link Dependency}. This
   * structure represents dependencies that need to be added to the importer
   * represented by {@link DepID}.
   */
  add: Map<DepID, Map<string, Dependency>>
}

export interface BuildIdealRemoveOptions {
  /**
   * A `Map` object representing nodes to be removed from the ideal graph.
   * Each {@link DepID} key represents an importer node and the `Set` of
   * dependency names to be removed from its dependency list.
   */
  remove: Map<DepID, Set<string>>
}

export interface BuildIdealFromGraphOptions {
  /**
   * An initial {@link Graph} to start building from, adding nodes to any
   * missing edges and appending any new specs defined in `addSpecs`.
   */
  graph: Graph
}

export interface BuildIdealPackageInfoOptions {
  /**
   * A {@link PackageInfoClient} instance to read manifest info from.
   */
  packageInfo: PackageInfoClient
}
