import type { ParserState } from '../types.ts'
import { removeNode, removeDanglingEdges } from './helpers.ts'

/**
 * :built Pseudo-Selector will only match packages that have
 * a `buildState` property set to 'built', indicating they have
 * been successfully built during the reify process.
 */
export const built = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    if (node.buildState !== 'built') {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
