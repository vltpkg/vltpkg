import { error } from '@vltpkg/error-cause'
import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import postcssSelectorParser from 'postcss-selector-parser'
import { attribute } from './attribute.js'
import { classFn } from './class.js'
import { combinator } from './combinator.js'
import { id } from './id.js'
import { pseudo } from './pseudo.js'
import {
  type PostcssNodeWithChildren,
  type ParserState,
  type ParserFn,
  isPostcssNodeWithChildren,
  asPostcssNodeWithChildren,
  isSelectorNode,
} from './types.js'

const noopFn = async (state: ParserState) => state

const selectors = {
  attribute,
  class: classFn,
  combinator,
  comment: noopFn,
  id,
  nesting: noopFn,
  pseudo,
  root: noopFn,
  selector: async (state: ParserState) => {
    state.partial.nodes = new Set(state.initial.nodes)
    state.partial.edges = new Set(state.initial.edges)
    return state
  },
  string: async (state: ParserState) => {
    throw error('Unsupported selector', { found: state.current })
  },
  tag: async (state: ParserState) => {
    if (state.current.value !== '{' && state.current.value !== '}') {
      throw error('Unsupported selector', { found: state.current })
    }
    return state
  },
  universal: noopFn,
}
const selectorsMap = new Map<string, ParserFn>(
  Object.entries(selectors),
)

export const walk = async (
  state: ParserState,
): Promise<ParserState> => {
  const parserFn = selectorsMap.get(state.current.type)

  if (!parserFn) {
    if (state.loose) {
      return state
    }

    throw new Error(
      `Missing parser for query node: ${state.current.type}`,
    )
  }
  state = await parserFn(state)

  // pseudo selectors handle their own sub selectors
  if (
    isPostcssNodeWithChildren(state.current) &&
    state.current.type !== 'pseudo'
  ) {
    const node: PostcssNodeWithChildren = asPostcssNodeWithChildren(
      state.current,
    )

    if (node.nodes.length) {
      for (let i = 0; i < node.nodes.length; i++) {
        const current = node.nodes[i]
        /* c8 ignore next -- impossible but TS doesn't know that */
        if (!current) continue

        const childState: ParserState = {
          ...state,
          current,
          next: node.nodes[i + 1],
          prev: node.nodes[i - 1],
        }
        state = await walk(childState)
      }
    }

    if (isSelectorNode(node)) {
      for (const node of state.partial.nodes) {
        state.collect.add(node)
      }
    }
  }
  return state
}

export type QueryOptions = {
  nodes: NodeLike[]
}

export class Query {
  #cache: Map<string, NodeLike[]>
  #nodes: NodeLike[]

  constructor({ nodes }: QueryOptions) {
    this.#cache = new Map()
    this.#nodes = nodes
  }

  async search(query: string): Promise<NodeLike[]> {
    if (!query) return []

    const cachedResult = this.#cache.get(query)
    if (cachedResult) {
      return cachedResult
    }

    // breadth-first nodes traversal to read all edges
    const nodes = new Set(this.#nodes)
    const edges = new Set<EdgeLike>()
    const traverse = new Set<NodeLike>(nodes)
    for (const node of traverse) {
      for (const edge of node.edgesOut.values()) {
        edges.add(edge)
        if (edge.to) {
          traverse.add(edge.to)
        }
      }
    }

    // builds initial state and walks over it,
    // retrieving the collected result
    const { collect } = await walk({
      current: postcssSelectorParser().astSync(query),
      initial: {
        nodes: new Set(nodes),
        edges: new Set(edges),
      },
      collect: new Set(),
      partial: { nodes, edges },
      walk,
    })

    const res = Array.from(collect)
    this.#cache.set(query, res)
    return res
  }
}
