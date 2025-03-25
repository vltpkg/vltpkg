import { error } from '@vltpkg/error-cause'
import type { EdgeLike, GraphLike, NodeLike } from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec/browser'
import type { SecurityArchiveLike } from '@vltpkg/security-archive'
import postcssSelectorParser from 'postcss-selector-parser'
import { attribute } from './attribute.ts'
import { classFn } from './class.ts'
import { combinator } from './combinator.ts'
import { id } from './id.ts'
import { pseudo } from './pseudo.ts'
import {
  isPostcssNodeWithChildren,
  asPostcssNodeWithChildren,
  isSelectorNode,
} from './types.ts'
import type {
  PostcssNodeWithChildren,
  ParserState,
  ParserFn,
  QueryResponse,
} from './types.ts'

export * from './types.ts'

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
  await state.cancellable()

  const parserFn = selectorsMap.get(state.current.type)

  if (!parserFn) {
    if (state.loose) {
      return state
    }

    throw error(
      `Missing parser for query node: ${state.current.type}`,
      {
        found: state.current,
      },
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
  specOptions: SpecOptions
  securityArchive: SecurityArchiveLike | undefined
}

// A list of known security selectors that rely on
// data from the security-archive in order to work
const securitySelectors = new Set([
  ':abandoned',
  ':confused',
  ':cve',
  ':debug',
  ':deprecated',
  ':dynamic',
  ':entropic',
  ':env',
  ':eval',
  ':fs',
  ':license',
  ':malware',
  ':minified',
  ':native',
  ':network',
  ':obfuscated',
  ':scanned',
  ':scripts',
  ':sev',
  ':severity',
  ':shell',
  ':shrinkwrap',
  ':squat',
  ':suspicious',
  ':tracker',
  ':trivial',
  ':undesirable',
  ':unknown',
  ':unmaintained',
  ':unpopular',
  ':unstable',
])

export class Query {
  #cache: Map<string, QueryResponse>
  #graph: GraphLike
  #specOptions: SpecOptions
  #securityArchive: SecurityArchiveLike | undefined

  /**
   * Helper method to determine if a given query string is using any of
   * the known security selectors. This is useful so that operations can
   * skip hydrating the security archive if it's not needed.
   */
  static hasSecuritySelectors(query: string): boolean {
    for (const selector of securitySelectors) {
      if (query.includes(selector)) {
        return true
      }
    }
    return false
  }

  constructor({ graph, specOptions, securityArchive }: QueryOptions) {
    this.#cache = new Map()
    this.#graph = graph
    this.#specOptions = specOptions
    this.#securityArchive = securityArchive
  }

  /**
   * Search the graph for nodes and edges that match the given query.
   */
  async search(
    query: string,
    signal?: AbortSignal,
  ): Promise<QueryResponse> {
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
      cancellable: async () => {
        await new Promise(resolve => {
          setTimeout(resolve, 0)
        })
        signal?.throwIfAborted()
      },
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
      signal,
      securityArchive: this.#securityArchive,
      specOptions: this.#specOptions,
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
