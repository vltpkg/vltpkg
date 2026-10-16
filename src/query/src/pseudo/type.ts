import { splitDepID } from '@vltpkg/dep-id/browser'
import {
  asPostcssNodeWithChildren,
  asTagNode,
} from '@vltpkg/dss-parser'
import { removeDanglingEdges, removeNode } from './helpers.ts'
import type { ParserState } from '../types.ts'
import { typePackages } from './types.ts'

/**
 * :type matches type definitions; :type(orphan) requires a missing target.
 * :type(str) matches the source type encoded in the dep id.
 */
export const type = async (state: ParserState) => {
  const type = asPostcssNodeWithChildren(state.current)
  if (!type.nodes.length) return typePackages(state)
  const selector = asPostcssNodeWithChildren(type.nodes[0])
  const name = asTagNode(selector.nodes[0]).value
  if (name === 'orphan') return typePackages(state, true)
  for (const node of state.partial.nodes) {
    const nodeType = splitDepID(node.id)[0]
    if (nodeType !== name) {
      removeNode(state, node)
    }
  }
  removeDanglingEdges(state)
  return state
}
