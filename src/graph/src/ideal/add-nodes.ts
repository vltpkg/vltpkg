import { error } from '@vltpkg/error-cause'
import { SpecOptions } from '@vltpkg/spec'
import { appendNodes } from './append-nodes.js'
import {
  BuildIdealFromGraphOptions,
  BuildIdealAddOptions,
} from './types.js'
import { PackageInfoClient } from '@vltpkg/package-info'

export type AddNodesOptions = SpecOptions &
  BuildIdealFromGraphOptions &
  BuildIdealAddOptions & {
    /**
     * A {@link PackageInfoClient} instance to read manifest info from.
     */
    packageInfo: PackageInfoClient
  }

/**
 * Add new nodes in the given `graph` for dependencies specified at `add`.
 */
export const addNodes = async ({
  add,
  graph,
  packageInfo,
  ...specOptions
}: AddNodesOptions) => {
  // iterates on the list of dependencies per importer updating
  // the graph using metadata fetch from the registry manifest files
  for (const [depID, dependencies] of add) {
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
    await appendNodes(
      packageInfo,
      graph,
      importer,
      [...dependencies.values()],
      specOptions,
    )
  }
}
