import type { ParserState } from '../types.ts'
import { removeEdge, removeUnlinkedNodes } from './helpers.ts'

/**
 * :peer Pseudo-Selector will only match peer dependencies.
 */
export const peer = async (state: ParserState) => {
  // filter edges that aren't marked as peer
  for (const edge of state.partial.edges) {
    if (!edge.peer) {
      removeEdge(state, edge)
    }
  }

  removeUnlinkedNodes(state)

  return state
}
