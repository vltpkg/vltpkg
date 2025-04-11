import type { ParserState } from '../types.ts'
import { removeDanglingEdges, removeNode } from './helpers.ts'

/**
 * :workspace Pseudo-Selector will only match workspace dependencies.
 */
export const workspace = async (state: ParserState) => {
  // Filter out the root node and any nodes that are not marked as workspaces
  for (const node of state.partial.nodes) {
    if (!node.importer || node.mainImporter) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
