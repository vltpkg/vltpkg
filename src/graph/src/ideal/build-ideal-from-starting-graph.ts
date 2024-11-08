import { type Graph } from '../graph.js'
import { getImporterSpecs } from './get-importer-specs.js'
import { type AddNodesOptions, addNodes } from './add-nodes.js'
import {
  type RemoveNodesOptions,
  removeNodes,
} from './remove-nodes.js'

export type BuildIdealFromStartingGraphOptions = AddNodesOptions &
  RemoveNodesOptions & {
    projectRoot: string
  }

/**
 * Builds an ideal {@link Graph} representing the dependencies that
 * should be present in order to fulfill the requirements defined
 * by the `package.json` and `vlt-lock.json` files using the `graph` set
 * in options as a starting point. Also add / remove any dependencies
 * listed in the `add` and `remove` properties.
 */
export const buildIdealFromStartingGraph = async (
  options: BuildIdealFromStartingGraphOptions,
): Promise<Graph> => {
  // Gets a map of dependencies that are keyed to its importer node ids,
  // merging values already found in the graph with user specified values.
  // Any dependencies that are already satisfied in the starting `graph`
  // are going to be pruned from the resulting object.
  const importerSpecs = getImporterSpecs(options)

  // add nodes, fetching remote manifests for each dependency to be added
  await addNodes({ ...options, ...importerSpecs })

  // move things into their default locations, if possible
  for (const node of options.graph.nodes.values()) {
    node.setDefaultLocation()
  }

  // removes any dependencies that are listed in the `remove` option
  removeNodes(options)

  options.graph.gc()

  return options.graph
}
