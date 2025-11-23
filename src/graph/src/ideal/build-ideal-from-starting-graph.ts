import { getImporterSpecs } from './get-importer-specs.ts'
import { refreshIdealGraph } from './refresh-ideal-graph.ts'
import { resolveSaveType } from '../resolve-save-type.ts'
import type { RefreshIdealGraphOptions } from './refresh-ideal-graph.ts'
import type { Graph } from '../graph.ts'

export type BuildIdealFromStartingGraphOptions =
  RefreshIdealGraphOptions

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
    const importer = options.graph.nodes.get(importerId)
    if (!importer) continue

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

      // update the save type for deps when using an implicit type
      for (const [depName, depSpec] of deps) {
        depSpec.type = resolveSaveType(
          importer,
          depName,
          depSpec.type,
        )
      }
    }
  }

  // refreshs the current graph adding the nodes marked for addition
  // and removing the ones marked for removal, while also recalculating
  // peer dependencies and default locations
  await refreshIdealGraph(options)

  options.graph.gc()

  return options.graph
}
