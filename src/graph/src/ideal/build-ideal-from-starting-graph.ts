import { getImporterSpecs } from './get-importer-specs.ts'
import { refreshIdealGraph } from './refresh-ideal-graph.ts'
import { resolveSaveType } from '../resolve-save-type.ts'
import type { PackageJson } from '@vltpkg/package-json'
import type { RefreshIdealGraphOptions } from './refresh-ideal-graph.ts'
import type { Graph } from '../graph.ts'

export type BuildIdealFromStartingGraphOptions =
  RefreshIdealGraphOptions & {
    packageJson: PackageJson
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

  // merge values found on node specs with
  // user-provided values from `options.add`
  for (const [nodeId, deps] of importerSpecs.add) {
    const node = options.graph.nodes.get(nodeId)
    /* c8 ignore next - impossible */
    if (!node) continue

    if (!options.add.has(nodeId)) {
      options.add.set(nodeId, deps)
      continue
    }

    // merge any deps found when reading the nodes manifest
    // with the ones provided by the user in the `add` options,
    // user-provided deps should take precedence
    for (const [depName, dep] of deps) {
      if (!options.add.get(nodeId)?.has(depName)) {
        options.add.get(nodeId)?.set(depName, dep)
      }

      // update the save type for deps when using an implicit type
      dep.type = resolveSaveType(node, depName, dep.type)
    }
  }

  // merge values found on node specs with
  // user-provided values from `options.remove`
  for (const [nodeId, deps] of importerSpecs.remove) {
    if (!options.remove.has(nodeId)) {
      options.remove.set(nodeId, deps)
      continue
    }

    // merge any deps found when reading the nodes manifest
    // with the ones provided by the user in the `remove` options
    for (const depName of deps) {
      options.remove.get(nodeId)?.add(depName)
    }
  }

  // refreshs the current graph adding the nodes marked for addition
  // and removing the ones marked for removal, while also recalculating
  // peer dependencies and default locations
  await refreshIdealGraph({
    ...options,
    transientAdd: importerSpecs.transientAdd,
    transientRemove: importerSpecs.transientRemove,
  })

  options.graph.gc()

  return options.graph
}
