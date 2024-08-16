import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import {
  type ParserState,
  type ParserFn,
  asCombinatorNode,
} from './types.js'

/**
 * Returns a new set of nodes, containing all direct dependencies
 * of the current list of nodes used.
 *
 * ref: https://developer.mozilla.org/en-US/docs/Web/CSS/Child_combinator
 */
const childCombinator = async (state: ParserState) => {
  const edges = new Set<EdgeLike>()
  const nodes = new Set<NodeLike>()

  // visit direct children of the current list of nodes
  // collecting refs to these children and the edges that
  // connected them.
  for (const node of state.partial.nodes) {
    state.partial.nodes.delete(node)
    for (const edge of node.edgesOut.values()) {
      if (edge.to) {
        edges.add(edge)
        nodes.add(edge.to)
      }
    }
  }

  state.partial.edges = edges
  state.partial.nodes = nodes
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
  const edges = new Set<EdgeLike>()
  const nodes = new Set<NodeLike>()

  // visits direct parents of the current list of node and then
  // visit their children, collecting refs to all children and edges
  // that are not in the original list of nodes.
  for (const node of state.partial.nodes) {
    for (const edge of node.edgesIn) {
      const parents: IterableIterator<EdgeLike> =
        edge.from.edgesOut.values()
      for (const edge of parents) {
        if (edge.to && edge.to !== node) {
          edges.add(edge)
          nodes.add(edge.to)
        }
      }
    }
  }

  state.partial.edges = edges
  state.partial.nodes = nodes
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

  const edges = new Set<EdgeLike>()
  const nodes = new Set<NodeLike>()

  // breadth-first traversal of the graph, starting from the current
  // list of nodes, collecting all nodes and edges along the way
  const traverse = new Set<NodeLike>(state.partial.nodes)
  for (const node of traverse) {
    const children = new Set<NodeLike>()
    for (const edge of node.edgesOut.values()) {
      if (edge.to) {
        children.add(edge.to)
        edges.add(edge)
        nodes.add(edge.to)
      }
    }
    for (const child of children) {
      traverse.add(child)
    }
  }

  state.partial.edges = edges
  state.partial.nodes = nodes
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
  const curr = asCombinatorNode(state.current)
  const parserFn =
    curr.value && combinatorSelectorsMap.get(curr.value)
  if (!parserFn) {
    if (state.loose) {
      return state
    }

    throw new Error(`Unsupported combinator: ${state.current.value}`)
  }
  return parserFn(state)
}
