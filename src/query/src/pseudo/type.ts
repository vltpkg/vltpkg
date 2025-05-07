import { splitDepID } from '@vltpkg/dep-id/browser'
import type { ParserState } from '../types.ts'
import { asPostcssNodeWithChildren, asTagNode } from '../types.ts'
import { removeDanglingEdges, removeNode } from './helpers.ts'

/**
 * :type(str) Pseudo-Element will match only nodes that are of
 * the same type as the value used. The type is determined by the
 * first part of the dependency ID.
 */
export const type = async (state: ParserState) => {
  const type = asPostcssNodeWithChildren(state.current)
  const selector = asPostcssNodeWithChildren(type.nodes[0])
  const name = asTagNode(selector.nodes[0]).value
  for (const node of state.partial.nodes) {
    const nodeType = splitDepID(node.id)[0]
    if (nodeType !== name) {
      removeNode(state, node)
    }
  }
  removeDanglingEdges(state)
  return state
}
