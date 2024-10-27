import { error } from '@vltpkg/error-cause'
import type { EdgeLike, GraphLike, NodeLike } from '@vltpkg/graph'
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
  QueryResponse,
} from './types.js'

export * from './types.js'

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
      for (const edge of state.partial.edges) {
        state.collect.edges.add(edge)
      }
      for (const node of state.partial.nodes) {
        state.collect.nodes.add(node)
      }
    }
  }
  return state
}

export type QueryOptions = {
  graph: GraphLike
}

export class Query {
  #cache: Map<string, QueryResponse>
  #graph: GraphLike

  constructor({ graph }: QueryOptions) {
    this.#cache = new Map()
    this.#graph = graph
  }

  async search(query: string): Promise<QueryResponse> {
    if (typeof query !== 'string') {
      throw new TypeError(
        'Query search argument needs to be a string',
      )
    }

    if (!query) return { edges: [], nodes: [] }

    const cachedResult = this.#cache.get(query)
    if (cachedResult) {
      return cachedResult
    }

    const nodes = new Set<NodeLike>(
      Array.from(this.#graph.nodes.values()),
    )
    const edges = new Set<EdgeLike>(Array.from(this.#graph.edges))

    // builds initial state and walks over it,
    // retrieving the collected result
    const { collect } = await walk({
      current: postcssSelectorParser().astSync(query),
      initial: {
        nodes: new Set(nodes),
        edges: new Set(edges),
      },
      collect: {
        nodes: new Set<NodeLike>(),
        edges: new Set<EdgeLike>(),
      },
      partial: { nodes, edges },
      walk,
    })

    const res: QueryResponse = {
      edges: Array.from(collect.edges),
      nodes: Array.from(collect.nodes),
    }
    this.#cache.set(query, res)
    return res
  }
}
