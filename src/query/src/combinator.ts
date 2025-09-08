import { asCombinatorNode } from '@vltpkg/dss-parser'
import { error } from '@vltpkg/error-cause'
import type { EdgeLike, NodeLike } from '@vltpkg/types'
import type { ParserState, ParserFn } from './types.ts'

/**
 * Returns a new set of nodes, containing all direct dependencies
 * of the current list of nodes used.
 *
 * ref: https://developer.mozilla.org/en-US/docs/Web/CSS/Child_combinator
 */
const childCombinator = async (state: ParserState) => {
  const traverse = new Set(state.partial.nodes)
  state.partial.edges.clear()
  state.partial.nodes.clear()

  // visit direct children of the current list of nodes
  // collecting refs to these children and the edges that
  // connected them.
  for (const node of traverse) {
    for (const edge of node.edgesOut.values()) {
      if (edge.to) {
        state.partial.edges.add(edge)
        state.partial.nodes.add(edge.to)
      }
    }
  }

  return state
}

/**
 * Returns a new set of nodes, containing nodes that are also children
 * of all parent nodes to the current list of nodes used.
 *
 * Note: The subsequent-sibling comparator has a behavior that is
 * somehow approximative of that of its css counterpart, given that
 * in the context of dependency graphs the order of appearance is
 * not necessarily controlled by the end user. The approach for
 * this comparator is to match all siblings of a node.
 *
 * ref: https://developer.mozilla.org/en-US/docs/Web/CSS/Subsequent-sibling_combinator
 */
const subsequentSiblingCombinator = async (state: ParserState) => {
  const traverse = new Set(state.partial.nodes)
  state.partial.edges.clear()
  state.partial.nodes.clear()

  // visits direct parents of the current list of node and then
  // visit their children, collecting refs to all children and edges
  // that are not in the original list of nodes.
  for (const node of traverse) {
    for (const edge of node.edgesIn) {
      const parents: IterableIterator<EdgeLike> =
        edge.from.edgesOut.values()
      for (const edge of parents) {
        if (edge.to && edge.to !== node) {
          state.partial.edges.add(edge)
          state.partial.nodes.add(edge.to)
        }
      }
    }
  }

  return state
}

/**
 * Returns a new set of nodes containing all nodes that are descendents
 * to items in the current list of nodes.
 *
 * ref: https://developer.mozilla.org/en-US/docs/Web/CSS/Descendant_combinator
 */
const descendentCombinator = async (state: ParserState) => {
  // spaces between tags selectors are a noop
  if (state.prev?.type === 'tag' || state.next?.type === 'tag') {
    return state
  }

  const traverse = new Set<NodeLike>(state.partial.nodes)
  state.partial.edges.clear()
  state.partial.nodes.clear()

  // breadth-first traversal of the graph, starting from the current
  // list of nodes, collecting all nodes and edges along the way
  for (const node of traverse) {
    const children = new Set<NodeLike>()
    for (const edge of node.edgesOut.values()) {
      if (edge.to) {
        children.add(edge.to)
        state.partial.edges.add(edge)
        state.partial.nodes.add(edge.to)
      }
    }
    for (const child of children) {
      traverse.add(child)
    }
  }

  return state
}

const combinatorSelectors = {
  '>': childCombinator,
  '~': subsequentSiblingCombinator,
  ' ': descendentCombinator,
}

const combinatorSelectorsMap = new Map<string, ParserFn>(
  Object.entries(combinatorSelectors),
)

/**
 * Parse css-style combinators, e.g: `>`, `~` and ` `
 */
export const combinator = async (state: ParserState) => {
  await state.cancellable()

  const curr = asCombinatorNode(state.current)
  const parserFn =
    curr.value && combinatorSelectorsMap.get(curr.value)
  if (!parserFn) {
    if (state.loose) {
      return state
    }

    throw error(`Unsupported combinator: ${state.current.value}`, {
      found: state.current,
    })
  }
  return parserFn(state)
}
