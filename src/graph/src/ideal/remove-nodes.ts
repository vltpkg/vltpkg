import { DepID } from '@vltpkg/dep-id'
import { BaseBuildIdealOptions } from './types.js'
import { error } from '@vltpkg/error-cause'

export type RemoveNodesOptions = BaseBuildIdealOptions & {
  /**
   * A `Map` object representing nodes to be removed from the ideal graph.
   * Each {@link DepID} key represents an importer node and the `Set` of
   * dependency names to be removed from its dependency list.
   */
  remove: Map<DepID, Set<string>>
}

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
      const edge = importer.edgesOut.get(name)
      if (!edge) continue
      graph.removeEdge(edge)

      const node = edge.to
      if (!node) continue
      graph.removeNode(node)
    }
  }
}
