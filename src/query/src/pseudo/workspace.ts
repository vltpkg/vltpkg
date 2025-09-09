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

  // Clears up any edges that are not pointing to workspace nodes
  for (const edge of state.partial.edges) {
    if (edge.to?.importer && !edge.to.mainImporter) continue
    state.partial.edges.delete(edge)
  }

  return state
}
