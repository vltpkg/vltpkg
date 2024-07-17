import {
  BuildIdealFromGraphOptions,
  BuildIdealRemoveOptions,
} from './types.js'
import { error } from '@vltpkg/error-cause'

export type RemoveNodesOptions = BuildIdealFromGraphOptions &
  BuildIdealRemoveOptions

/**
 * Remove nodes from the current `graph`.
 */
export const removeNodes = ({
  graph,
  remove,
}: RemoveNodesOptions) => {
  for (const [depID, names] of remove) {
    const importer = graph.nodes.get(depID)
    if (!importer) {
      throw error('Could not find importer', { found: depID })
    }

    // Removes any edges / nodes pointing to the specified name
    for (const name of names) {
      const node = importer.edgesOut.get(name)?.to
      if (node) graph.removeNode(node)
    }
  }
}
