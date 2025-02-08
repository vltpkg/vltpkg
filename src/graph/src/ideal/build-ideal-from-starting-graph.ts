import { type Graph } from '../graph.ts'
import { getImporterSpecs } from './get-importer-specs.ts'
import { type AddNodesOptions, addNodes } from './add-nodes.ts'
import {
  type RemoveNodesOptions,
  removeNodes,
} from './remove-nodes.ts'

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

  // merge modifiedDependencies flags
  options.add.modifiedDependencies =
    options.add.modifiedDependencies ||
    importerSpecs.add.modifiedDependencies
  options.remove.modifiedDependencies =
    options.remove.modifiedDependencies ||
    importerSpecs.remove.modifiedDependencies

  // merge values found on importer specs with
  // user-provided values from `options.add`
  for (const [importerId, deps] of importerSpecs.add) {
    if (!options.add.has(importerId)) {
      options.add.set(importerId, deps)
      continue
    }

    // merge any deps found when reading the importers manifest
    // with the ones provided by the user in the `add` options,
    // user-provided deps should take precedence
    for (const [depName, dep] of deps) {
      if (!options.add.get(importerId)?.has(depName)) {
        options.add.get(importerId)?.set(depName, dep)
      }
    }
  }

  // add nodes, fetching remote manifests for each dependency to be added
  await addNodes(options)

  // move things into their default locations, if possible
  for (const node of options.graph.nodes.values()) {
    node.setDefaultLocation()
  }

  // removes any dependencies that are listed in the `remove` option
  removeNodes({ ...options, remove: importerSpecs.remove })

  options.graph.gc()

  return options.graph
}
