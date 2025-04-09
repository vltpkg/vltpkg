import type { ParserState } from '../types.ts'
import { removeNode } from './helpers.ts'

/**
 * :empty Pseudo-Selector, matches only nodes that have no children.
 * It filters out any node that has edges out, i.e., has dependencies.
 */
export const empty = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    if (node.edgesOut.size > 0) {
      removeNode(state, node)
    }
  }
  return state
}
