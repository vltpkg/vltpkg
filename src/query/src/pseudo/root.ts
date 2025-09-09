import type { ParserState } from '../types.ts'

/**
 * :root Pseudo-Element will return the project root node for the graph.
 * It matches only nodes marked as `mainImporter`.
 */
export const root = async (state: ParserState) => {
  for (const edge of state.partial.edges) {
    if (!edge.to?.mainImporter) {
      state.partial.edges.delete(edge)
    }
  }
  for (const node of state.partial.nodes) {
    if (!node.mainImporter) {
      state.partial.nodes.delete(node)
    }
  }
  return state
}
