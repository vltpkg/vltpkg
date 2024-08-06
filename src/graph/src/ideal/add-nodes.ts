import { error } from '@vltpkg/error-cause'
import { SpecOptions } from '@vltpkg/spec'
import { appendNodes } from './append-nodes.js'
import {
  BuildIdealFromGraphOptions,
  BuildIdealAddOptions,
} from './types.js'
import { PackageInfoClient } from '@vltpkg/package-info'
import {PathScurry} from 'path-scurry'

export type AddNodesOptions = SpecOptions &
  BuildIdealFromGraphOptions &
  BuildIdealAddOptions & {
    /**
     * A {@link PathScurry} instance based on the `projectRoot` path
     */
    scurry: PathScurry

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
  scurry,
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
      const node = importer.edgesOut.get(spec.name)?.to
      if (node) graph.removeNode(node)
    }

    // Add new nodes for packages defined in the dependencies list fetching
    // metadata from the registry manifests and updating the graph
    await appendNodes(
      packageInfo,
      graph,
      importer,
      [...dependencies.values()],
      scurry,
      specOptions,
    )
  }
}
