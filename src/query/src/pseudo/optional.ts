import type { ParserState } from '../types.ts'
import { removeEdge, removeUnlinkedNodes } from './helpers.ts'

/**
 * :optional Pseudo-Selector will only match optional dependencies.
 */
export const optional = async (state: ParserState) => {
  // filter edges that aren't marked as optional
  for (const edge of state.partial.edges) {
    if (!edge.optional) {
      removeEdge(state, edge)
    }
  }

  removeUnlinkedNodes(state)

  return state
}
