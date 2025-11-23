import { getImporterSpecs } from './get-importer-specs.ts'
import { addNodes } from './add-nodes.ts'
import { removeNodes } from './remove-nodes.ts'
import { asDependency } from '../dependencies.ts'
import type { AddNodesOptions } from './add-nodes.ts'
import type { AddImportersDependenciesMap } from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import type { RemoveNodesOptions } from './remove-nodes.ts'

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

  if (options.add.modifiedDependencies) {
    // removes all edges to start from a clean state
    // the performance impact from is attenuated by the fact that
    // nodes resolutions are already cached in-memory
    // Create a deep copy of options.add
    const mergedAdd: AddImportersDependenciesMap =
      new Map() as AddImportersDependenciesMap
    for (const [importerId, deps] of options.add) {
      mergedAdd.set(importerId, new Map(deps))
    }
    mergedAdd.modifiedDependencies = true
    for (const importer of options.graph.importers) {
      const importerId = importer.id
      for (const [depName, edge] of importer.edgesOut) {
        let mergedDeps = mergedAdd.get(importerId)
        if (!mergedDeps) {
          mergedDeps = new Map()
          mergedAdd.set(importerId, mergedDeps)
        }
        // If the dep isn't already set by options/add/user input, add it from the graph
        if (!mergedDeps.has(depName)) {
          // The edge has .spec but we usually just use it as the value
          mergedDeps.set(
            depName,
            asDependency({ type: edge.type, spec: edge.spec }),
          )
        }
      }
    }

    options.graph.resetEdges()

    // add nodes, fetching remote manifests for each dependency to be added
    await addNodes({
      ...options,
      add: mergedAdd,
    })

    // move things into their default locations, if possible
    for (const node of options.graph.nodes.values()) {
      node.setDefaultLocation()
    }
  }

  // TODO: needs to handle modifiedDependencies flag and potentially
  // a way to clear up top level deps so that we recalculate the
  // ideal graph
  // removes any dependencies that are listed in the `remove` option
  if (options.remove.modifiedDependencies) {
    removeNodes({ ...options, remove: importerSpecs.remove })
  }

  options.graph.gc()

  return options.graph
}
