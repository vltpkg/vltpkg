import type { ParserState } from '../types.ts'
import { removeEdge, removeUnlinkedNodes } from './helpers.ts'

/**
 * :overridden Pseudo-Selector, matches only edges that have a truthy overridden property in their spec.
 * It filters out any edges that don't have edge.spec.overridden set to a truthy value
 * and removes any unlinked nodes from the result.
 */
export const overridden = async (state: ParserState) => {
  // filter edges that don't have a truthy overridden property
  for (const edge of state.partial.edges) {
    if (!edge.spec.overridden) {
      removeEdge(state, edge)
    }
  }

  removeUnlinkedNodes(state)

  return state
}
