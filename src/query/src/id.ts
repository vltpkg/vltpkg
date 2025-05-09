import { error } from '@vltpkg/error-cause'
import { asIdentifierNode } from './types.ts'
import type { ParserState } from './types.ts'

/**
 * Parse ids, e.g: `#foo`
 */
export const id = async (
  state: ParserState,
): Promise<ParserState> => {
  const { value } = asIdentifierNode(state.current)

  /* c8 ignore start - should not be possible */
  if (!value) {
    throw error('Missing identifier name')
  }
  /* c8 ignore stop */

  // Filter out any edges and their linked
  // nodes if they don't match the id value
  for (const edge of state.partial.edges) {
    if (edge.name !== value) {
      state.partial.edges.delete(edge)
      if (edge.to) {
        state.partial.nodes.delete(edge.to)
      }
    }
  }

  // Filter out importer nodes, this extra step is needed
  // to filter out nodes that have no edges linking to them
  for (const node of state.partial.nodes) {
    if (
      node.edgesIn.size === 0 &&
      node.name !== value &&
      state.partial.nodes.has(node)
    ) {
      state.partial.nodes.delete(node)
    }
  }

  // Increment the idCounter for specificity
  state.specificity.idCounter += 1

  return state
}
