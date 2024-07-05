import { DepID } from '@vltpkg/dep-id'
import { Dependency } from '../dependencies.js'
import { Graph } from '../graph.js'

export type BaseBuildIdealOptions = {
  /**
   * A `Map` in which keys are {@link DepID} linking to another `Map` in which
   * keys are the dependency names and values are {@link Dependency}. This
   * structure represents dependencies that need to be added to the importer
   * represented by {@link DepID}.
   */
  add: Map<DepID, Map<string, Dependency>>
  /**
   * An initial {@link Graph} to start building from, adding nodes to any
   * missing edges and appending any new specs defined in `addSpecs`.
   */
  graph: Graph
}
