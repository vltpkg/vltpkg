import type { ParserState } from '../types.ts'

/**
 * :missing Pseudo-Selector, matches only edges that are not linked to any node.
 * It filters out any edges that have a 'to' property, keeping only dangling edges
 * and clears all nodes from the result.
 */
export const missing = async (state: ParserState) => {
  for (const edge of state.partial.edges) {
    if (edge.to) {
      state.partial.edges.delete(edge)
    }
  }
  state.partial.nodes.clear()
  return state
}
