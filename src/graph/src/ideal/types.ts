import { DepID } from '@vltpkg/dep-id'
import { Dependency } from '../dependencies.js'
import { Graph } from '../graph.js'

export type BaseBuildIdealOptions = {
  /**
   * A `Map` of `Set`s of {@link Spec}s to be added to the resulting ideal
   * {@link Graph}. The map keys to the {@link DepID} of the importer node
   * in which the new node defined by {@link Spec} should be added to.
   */
  add: Map<DepID, Map<string, Dependency>>
  /**
   * An initial {@link Graph} to start building from, adding nodes to any
   * missing edges and appending any new specs defined in `addSpecs`.
   */
  graph: Graph
}
