import { error } from '@vltpkg/error-cause'
import { PackageInfoClient } from '@vltpkg/package-info'
import { SpecOptions } from '@vltpkg/spec'
import { Graph } from '../graph.js'
import { appendNodes } from './append-nodes.js'
import { getImporterSpecs } from './get-importer-specs.js'
import { removeSatisfiedSpecs } from './remove-satisfied-specs.js'
import { BaseBuildIdealOptions } from './types.js'

export type BuildIdealOptions = SpecOptions &
  BaseBuildIdealOptions & {
    packageInfo: PackageInfoClient
  }

/**
 * Builds an ideal {@link Graph} representing the dependencies that
 * should be present in order to fulfill the requirements defined
 * by a `package.json` file.
 */
export const build = async (
  options: BuildIdealOptions,
): Promise<Graph> => {
  const { add, graph, packageInfo, ...specOptions } = options

  // gets a map of dependencies that are keyed to its importer node id
  // merging values already found in the graph and user specified values
  const specs = getImporterSpecs({ add, graph })

  // removes already satisfied dependencies from the dependencies list
  removeSatisfiedSpecs({ add: specs, graph })

  // iterates on the list of dependencies per importer updating
  // the graph using metadata fetch from the registry manifest files
  for (const [depID, dependencies] of specs) {
    const importer = graph.nodes.get(depID)
    if (!importer) {
      throw error('Could not find importer', { found: depID })
    }

    // Removes any edges and nodes that are currently part of the
    // graph but are also in the list of dependencies to be installed
    for (const { spec } of dependencies.values()) {
      const edge = importer.edgesOut.get(spec.name)
      if (!edge) continue
      graph.removeEdge(edge)

      const node = edge.to
      if (!node) continue
      graph.removeNode(node)
    }

    // Add new nodes for packages defined in the dependencies list fetching
    // metadata from the registry manifests and updating the graph
    appendNodes(
      packageInfo,
      graph,
      importer,
      [...dependencies.values()],
      specOptions,
    )
  }

  return graph
}
