import { asManifest } from '@vltpkg/types'
import type { ParserState } from '../types.ts'
import { removeNode, removeDanglingEdges } from './helpers.ts'

/**
 * :private Pseudo-Selector will only match packages that have
 * a `private: true` key set in their `package.json` metadata.
 */
export const privateParser = async (state: ParserState) => {
  for (const node of state.partial.nodes) {
    if (!node.manifest || !asManifest(node.manifest).private) {
      removeNode(state, node)
    }
  }

  removeDanglingEdges(state)

  return state
}
