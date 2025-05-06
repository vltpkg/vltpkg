import type { ParserState } from '../types.ts'
import { removeNode } from './helpers.ts'

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

  // Clears up all edges so that the :workspace pseudo-selector never matches
  // edges that are possibly coming from other packages, this way we can only
  // have a single workspace result per workspace name.
  state.partial.edges.clear()

  return state
}
