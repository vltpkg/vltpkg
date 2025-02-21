import type { NodeLike } from '@vltpkg/graph'
import type { ParserState } from '../types.js'

/**
 * Removes a node and its incoming edges from the results.
 */
export const removeNode = (state: ParserState, node: NodeLike) => {
  for (const edge of node.edgesIn) {
    state.partial.edges.delete(edge)
  }
  state.partial.nodes.delete(node)
}

/**
 * Removes any edges that have no destination node from the results.
 */
export const removeDanglingEdges = (state: ParserState) => {
  for (const edge of state.partial.edges) {
    if (!edge.to) {
      state.partial.edges.delete(edge)
    }
  }
}

/**
 * Removes quotes from a string value.
 */
export const removeQuotes = (value: string) =>
  value.replace(/^"(.*?)"$/, '$1')
