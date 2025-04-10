import { error } from '@vltpkg/error-cause'
import type { EdgeLike, GraphLike, NodeLike } from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec/browser'
import type { SecurityArchiveLike } from '@vltpkg/security-archive'
import { parse } from './parser.ts'
import { attribute } from './attribute.ts'
import { classFn } from './class.ts'
import { combinator } from './combinator.ts'
import { id } from './id.ts'
import { pseudo } from './pseudo.ts'
import {
  isPostcssNodeWithChildren,
  asPostcssNodeWithChildren,
  isSelectorNode,
  isPseudoNode,
  isTagNode,
  isStringNode,
} from './types.ts'
import type {
  PostcssNode,
  ParsedSelectorToken,
  PostcssNodeWithChildren,
  ParserState,
  ParserFn,
  QueryResponse,
  QueryResponseNode,
  QueryResponseEdge,
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
  retries?: number
  specOptions: SpecOptions
  securityArchive: SecurityArchiveLike | undefined
}

// A list of known security selectors that rely on
// data from the security-archive in order to work
const securitySelectors = new Set([
  ':abandoned',
  ':confused',
  ':cve',
  ':cwe',
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
  ':score',
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
  #retries: number
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

  constructor({
    graph,
    retries,
    specOptions,
    securityArchive,
  }: QueryOptions) {
    this.#cache = new Map()
    this.#graph = graph
    this.#retries = retries ?? 3
    this.#specOptions = specOptions
    this.#securityArchive = securityArchive
  }

  #getQueryResponseEdges(_edges: Set<EdgeLike>): QueryResponseEdge[] {
    return Array.from(_edges) as QueryResponseEdge[]
  }

  #getQueryResponseNodes(_nodes: Set<NodeLike>): QueryResponseNode[] {
    const nodes = Array.from(_nodes) as QueryResponseNode[]
    for (const node of nodes) {
      const securityArchiveEntry = this.#securityArchive?.get(node.id)

      // if a security archive entry is not found then the insights object
      // should just be empty with scanned=false
      if (!securityArchiveEntry) {
        node.insights = {
          scanned: false,
        }
        continue
      }

      // if a security archive entry is found then we can populate the insights
      node.insights = {
        scanned: true,
        score: securityArchiveEntry.score,
        abandoned: securityArchiveEntry.alerts.some(
          i => i.type === 'missingAuthor',
        ),
        confused: securityArchiveEntry.alerts.some(
          i => i.type === 'manifestConfusion',
        ),
        cve: securityArchiveEntry.alerts
          .filter(i => i.props?.cveId)
          // can not be undefined because of the filter above but TS doesn't know that
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
          .map(i => i.props?.cveId!),
        cwe: Array.from(
          new Set(
            securityArchiveEntry.alerts
              .filter(i => i.props?.cveId)
              .flatMap(i => i.props?.cwes?.map(j => j.id)),
          ),
        ) as `CWE-${string}`[],
        debug: securityArchiveEntry.alerts.some(
          i => i.type === 'debugAccess',
        ),
        deprecated: securityArchiveEntry.alerts.some(
          i => i.type === 'deprecated',
        ),
        dynamic: securityArchiveEntry.alerts.some(
          i => i.type === 'dynamicRequire',
        ),
        entropic: securityArchiveEntry.alerts.some(
          i => i.type === 'highEntropyStrings',
        ),
        env: securityArchiveEntry.alerts.some(
          i => i.type === 'envVars',
        ),
        eval: securityArchiveEntry.alerts.some(
          i => i.type === 'usesEval',
        ),
        fs: securityArchiveEntry.alerts.some(
          i => i.type === 'filesystemAccess',
        ),
        license: {
          unlicensed: securityArchiveEntry.alerts.some(
            i => i.type === 'explicitlyUnlicensedItem',
          ),
          misc: securityArchiveEntry.alerts.some(
            i => i.type === 'miscLicenseIssues',
          ),
          restricted: securityArchiveEntry.alerts.some(
            i => i.type === 'nonpermissiveLicense',
          ),
          ambiguous: securityArchiveEntry.alerts.some(
            i => i.type === 'ambiguousClassifier',
          ),
          copyleft: securityArchiveEntry.alerts.some(
            i => i.type === 'copyleftLicense',
          ),
          unknown: securityArchiveEntry.alerts.some(
            i => i.type === 'unidentifiedLicense',
          ),
          none: securityArchiveEntry.alerts.some(
            i => i.type === 'noLicenseFound',
          ),
          exception: securityArchiveEntry.alerts.some(
            i => i.type === 'licenseException',
          ),
        },
        malware: {
          low: securityArchiveEntry.alerts.some(
            i => i.type === 'gptAnomaly',
          ),
          medium: securityArchiveEntry.alerts.some(
            i => i.type === 'gptSecurity',
          ),
          high: securityArchiveEntry.alerts.some(
            i => i.type === 'gptMalware',
          ),
          critical: securityArchiveEntry.alerts.some(
            i => i.type === 'malware',
          ),
        },
        minified: securityArchiveEntry.alerts.some(
          i => i.type === 'minifiedFile',
        ),
        native: securityArchiveEntry.alerts.some(
          i => i.type === 'hasNativeCode',
        ),
        network: securityArchiveEntry.alerts.some(
          i => i.type === 'networkAccess',
        ),
        obfuscated: securityArchiveEntry.alerts.some(
          i => i.type === 'obfuscatedFile',
        ),
        scripts: securityArchiveEntry.alerts.some(
          i => i.type === 'installScripts',
        ),
        severity: {
          low: securityArchiveEntry.alerts.some(
            i => i.type === 'mildCVE',
          ),
          medium: securityArchiveEntry.alerts.some(
            i => i.type === 'potentialVulnerability',
          ),
          high: securityArchiveEntry.alerts.some(
            i => i.type === 'cve',
          ),
          critical: securityArchiveEntry.alerts.some(
            i => i.type === 'criticalCVE',
          ),
        },
        shell: securityArchiveEntry.alerts.some(
          i => i.type === 'shellAccess',
        ),
        shrinkwrap: securityArchiveEntry.alerts.some(
          i => i.type === 'shrinkwrap',
        ),
        squat: {
          medium: securityArchiveEntry.alerts.some(
            i => i.type === 'gptDidYouMean',
          ),
          critical: securityArchiveEntry.alerts.some(
            i => i.type === 'didYouMean',
          ),
        },
        suspicious: securityArchiveEntry.alerts.some(
          i => i.type === 'suspiciousStarActivity',
        ),
        tracker: securityArchiveEntry.alerts.some(
          i => i.type === 'telemetry',
        ),
        trivial: securityArchiveEntry.alerts.some(
          i => i.type === 'trivialPackage',
        ),
        undesirable: securityArchiveEntry.alerts.some(
          i => i.type === 'troll',
        ),
        unknown: securityArchiveEntry.alerts.some(
          i => i.type === 'newAuthor',
        ),
        unmaintained: securityArchiveEntry.alerts.some(
          i => i.type === 'unmaintained',
        ),
        unpopular: securityArchiveEntry.alerts.some(
          i => i.type === 'unpopularPackage',
        ),
        unstable: securityArchiveEntry.alerts.some(
          i => i.type === 'unstableOwnership',
        ),
      }
    }
    return nodes
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
      current: parse(query),
      initial: {
        nodes: new Set(nodes),
        edges: new Set(edges),
      },
      collect: {
        nodes: new Set<NodeLike>(),
        edges: new Set<EdgeLike>(),
      },
      partial: { nodes, edges },
      retries: this.#retries,
      signal,
      securityArchive: this.#securityArchive,
      specOptions: this.#specOptions,
      walk,
    })

    const res: QueryResponse = {
      edges: this.#getQueryResponseEdges(collect.edges),
      nodes: this.#getQueryResponseNodes(collect.nodes),
    }
    this.#cache.set(query, res)
    return res
  }

  /**
   * Parses a query into an array of tokens
   */
  static parse(query: string): ParsedSelectorToken[] {
    if (!query) return []

    const tokens: ParsedSelectorToken[] = []

    const ast = (q: string) => {
      try {
        return postcssSelectorParser().astSync(q)
      } catch (_e) {
        return ast(q.slice(0, -1))
      }
    }

    const processNode = (node: PostcssNode) => {
      for (const key of selectorsMap.keys()) {
        if (
          node.type === key &&
          node.type !== 'root' &&
          node.type !== 'selector'
        ) {
          let token = String(
            node.source?.start?.column &&
              node.source.end?.column &&
              `${node.spaces.before}${query.slice(node.source.start.column - 1, node.source.end.column)}${node.spaces.after}`,
          )

          if (isTagNode(node)) {
            token = node.value
          }

          if (isStringNode(node)) {
            token = node.value
          }

          if (
            isPostcssNodeWithChildren(node) &&
            isPseudoNode(node) &&
            node.nodes.length
          ) {
            token = String(token.split('(')[0])
            token += '('
          }

          tokens.push({
            ...node,
            token,
          } as ParsedSelectorToken)
        }
      }
      if (isPostcssNodeWithChildren(node)) {
        for (const child of node.nodes) {
          processNode(child)
        }
        if (isPseudoNode(node) && node.nodes.length) {
          tokens.push({
            ...node,
            token: ')',
            type: 'pseudo',
          } as ParsedSelectorToken)
        }
      }
    }

    processNode(ast(query))
    return tokens
  }
}
