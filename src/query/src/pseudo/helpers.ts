import type { NodeLike } from '@vltpkg/graph'
import type { ParserState } from '../types.js'
import { error } from '@vltpkg/error-cause'

/**
 * Removes a node and its incoming edges from the results.
 */
export const removeNode = (state: ParserState, node: NodeLike) => {
  for (const edge of node.edgesIn) {
    state.partial.edges.delete(edge)
  }
  state.partial.nodes.delete(node)
}

/**
 * Removes any edges that have no destination node from the results.
 */
export const removeDanglingEdges = (state: ParserState) => {
  for (const edge of state.partial.edges) {
    if (!edge.to) {
      state.partial.edges.delete(edge)
    }
  }
}

/**
 * Removes quotes from a string value.
 */
export const removeQuotes = (value: string) =>
  value.replace(/^"(.*?)"$/, '$1')

/**
 * Asserts that the security archive is present.
 */
export const assertSecurityArchive: (
  state: ParserState,
  name: string,
) => asserts state is ParserState & {
  securityArchive: NonNullable<ParserState['securityArchive']>
} = (state, name) => {
  if (!state.securityArchive) {
    throw error(
      `Missing security archive while trying to parse the :${name} selector`,
      { found: state },
    )
  }
}

/**
 * Reusable security selector alert filter.
 */
export const createSecuritySelectorFilter = (
  name: string,
  type: string,
) => {
  return async (state: ParserState) => {
    assertSecurityArchive(state, name)

    for (const node of state.partial.nodes) {
      const report = state.securityArchive.get(node.id)
      const exclude = !report?.alerts.some(
        alert => alert.type === type,
      )
      if (exclude) {
        removeNode(state, node)
      }
    }

    removeDanglingEdges(state)

    return state
  }
}
