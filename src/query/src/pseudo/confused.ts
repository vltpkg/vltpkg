import type { ParserState } from '../types.js'
import {
  assertSecurityArchive,
  removeDanglingEdges,
  removeNode,
} from './helpers.ts'

/**
 * Filters out any node that does not have a **manifestConfusion** report alert.
 * Also includes any node that has been marked as **confused**.
 */
export const confused = async (state: ParserState) => {
  assertSecurityArchive(state, 'confused')

  for (const node of state.partial.nodes) {
    const report = state.securityArchive.get(node.id)
    const exclude =
      !node.confused &&
      !report?.alerts.some(
        alert => alert.type === 'manifestConfusion',
      )
    if (exclude) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)
  return state
}
