import { error } from '@vltpkg/error-cause'
import type { EdgeLike, GraphLike, NodeLike } from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec/browser'
import type { SecurityArchiveLike } from '@vltpkg/security-archive'
import { parse } from './parser.ts'
import { attribute } from './attribute.ts'
import { combinator } from './combinator.ts'
import { id } from './id.ts'
import { pseudo } from './pseudo.ts'
import {
  isPostcssNodeWithChildren,
  asPostcssNodeWithChildren,
  isSelectorNode,
  isPseudoNode,
  isIdentifierNode,
  isAttributeNode,
  isCombinatorNode,
  isCommentNode,
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
import { joinDepIDTuple } from '@vltpkg/dep-id/browser'
import type { DepID } from '@vltpkg/dep-id'

export * from './types.ts'

export type SearchOptions = {
  signal: AbortSignal
  scopeIDs?: DepID[]
}

const noopFn = async (state: ParserState) => state

const selectors = {
  attribute,
  /* c8 ignore start */
  class: async (state: ParserState) => {
    throw error('Unsupported selector', { found: state.current })
  },
  /* c8 ignore end */
  combinator,
  comment: async (state: ParserState) => {
    if (state.current.value && !state.comment) {
      const commentValue = state.current.value
      const cleanComment = commentValue
        .replace(/^\/\*/, '')
        .replace(/\*\/$/, '')
        .trim()
      state.comment = cleanComment
    }
    return state
  },
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

const setMethodToJSON = (node: QueryResponseNode) => {
  const { toJSON } = node
  const insights = node.insights
  node.toJSON = () => ({
    ...toJSON.call(node),
    insights,
  })
}

/**
 * A valid item of a given breadcrumb.
 */
export type InteractiveBreadcrumbItem = {
  value: string
  type: string
  prev: InteractiveBreadcrumbItem | undefined
  next: InteractiveBreadcrumbItem | undefined
  importer: boolean
}

/**
 * The InteractiveBreadcrumb class is used to represent a valid breadcrumb.
 *
 * "Breadcrumb" is a term used to describe the subset of the query language
 * that uses only root/workspace selectors, id selectors & combinators.
 *
 * It implements an iterable, doubly-linked list of items that can be used
 * to navigate through the breadcrumb.
 *
 * It also validates that each element of the provided query string is
 * valid according to the previous definition of a "breadcrumb".
 */
export class InteractiveBreadcrumb
  implements Iterable<InteractiveBreadcrumbItem>
{
  #current: InteractiveBreadcrumbItem
  #items: InteractiveBreadcrumbItem[]
  comment: string | undefined

  /**
   * Initializes the interactive breadcrumb with a query string.
   */
  constructor(query: string) {
    this.#items = []
    const ast = parse(query)

    // Keep track of the previous AST node for consolidation
    let prevNode: PostcssNode | undefined

    // iterates only at the first level of the AST since
    // any nested nodes are invalid syntax
    for (const item of ast.first.nodes) {
      const isWorkspaceOrProject =
        isPseudoNode(item) &&
        (item.value === ':workspace' || item.value === ':project')

      const allowedPseudoNodes =
        isPseudoNode(item) &&
        (item.value === ':root' ||
          item.value === ':workspace' ||
          item.value === ':project')

      const allowedTypes =
        isIdentifierNode(item) ||
        allowedPseudoNodes ||
        (isCombinatorNode(item) && item.value === '>') ||
        isCommentNode(item)

      // Check if this is a nested selector that's not an allowed pseudo
      const isNestedSelector =
        isPostcssNodeWithChildren(item) &&
        !(allowedPseudoNodes && item.nodes.length === 0)

      // validation, only the root/workspace selectors, id selectors
      // and combinators are valid ast node items
      if (isNestedSelector || !allowedTypes) {
        throw error('Invalid query', { found: item })
      }

      // combinators and comments are skipped
      if (isCombinatorNode(item)) {
        prevNode = undefined
        continue
      } else if (isCommentNode(item)) {
        const cleanComment = item.value
          .replace(/^\/\*/, '')
          .replace(/\*\/$/, '')
          .trim()
        this.comment = cleanComment
        prevNode = undefined
      } else {
        // check if we need to consolidate with previous item
        const isPrevWorkspaceOrProject =
          prevNode &&
          isPseudoNode(prevNode) &&
          (prevNode.value === ':workspace' ||
            prevNode.value === ':project')

        const isPrevId = prevNode && isIdentifierNode(prevNode)
        const isCurrentId = isIdentifierNode(item)
        const lastItem =
          this.#items.length > 0 ?
            this.#items[this.#items.length - 1]
          : null

        // current node is ID, previous was workspace/project
        if (isCurrentId && isPrevWorkspaceOrProject && lastItem) {
          // Modify the last item to include the ID
          lastItem.value = `${lastItem.value}#${item.value}`
          prevNode = undefined
          continue
        }

        // current node is workspace/project, previous was ID
        if (isWorkspaceOrProject && isPrevId && lastItem) {
          // Modify the last item to include the pseudo
          lastItem.value = `${lastItem.value}${item.value}`
          lastItem.importer = true
          prevNode = undefined
          continue
        }

        // Default case: create a new item normally
        const prev = this.#items[this.#items.length - 1]
        const newItem = {
          value: item.value,
          type: item.type,
          prev,
          next: undefined,
          importer: allowedPseudoNodes,
        }
        if (prev) {
          prev.next = newItem
        }
        this.#items.push(newItem)
        prevNode = item
      }
    }
    // the parsed query should have at least one item
    // that is then going to be set as the current item
    if (!this.#items[0]) {
      throw error('Failed to parse query', {
        found: query,
      })
    }
    this.#current = this.#items[0]
  }

  /**
   * The current breadcrumb item.
   */
  get current(): InteractiveBreadcrumbItem {
    return this.#current
  }

  /**
   * The next breadcrumb item.
   */
  next(): InteractiveBreadcrumbItem | undefined {
    if (!this.#current.next) {
      return
    }
    this.#current = this.#current.next
    return this.#current
  }

  /**
   * The previous breadcrumb item.
   */
  prev(): InteractiveBreadcrumbItem | undefined {
    if (!this.#current.prev) {
      return
    }
    this.#current = this.#current.prev
    return this.#current
  }

  [Symbol.iterator]() {
    return this.#items.values()
  }

  /**
   * Empties the current breadcrumb list.
   */
  clear() {
    for (const item of this.#items) {
      item.prev = undefined
      item.next = undefined
    }
    this.#items.length = 0
  }
}

/**
 * The Query class is used to search the graph for nodes and edges
 * using the Dependency Selector Syntax (DSS).
 */
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

  /**
   * Sorts an array of QueryResponse objects by specificity. Objects with
   * higher idCounter values come first, if idCounter values are equal,
   * then objects with higher commonCounter values come first. Otherwise,
   * the original order is preserved.
   */
  static specificitySort(
    responses: QueryResponse[],
  ): QueryResponse[] {
    return [...responses].sort((a, b) => {
      // First compare by idCounter (higher comes first)
      if (a.specificity.idCounter !== b.specificity.idCounter) {
        return b.specificity.idCounter - a.specificity.idCounter
      }

      // If idCounter values are equal, compare by commonCounter
      if (
        a.specificity.commonCounter !== b.specificity.commonCounter
      ) {
        return (
          b.specificity.commonCounter - a.specificity.commonCounter
        )
      }

      // If both counters are equal, preserve original order
      return 0
    })
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

        setMethodToJSON(node)
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
          .map(i => i.props?.cveId)
          .filter(i => i !== undefined),
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

      setMethodToJSON(node)
    }
    return nodes
  }

  /**
   * Search the graph for nodes and edges that match the given query.
   */
  async search(
    query: string,
    {
      signal,
      scopeIDs = [joinDepIDTuple(['file', '.'])],
    }: SearchOptions,
  ): Promise<QueryResponse> {
    if (!query)
      return {
        edges: [],
        nodes: [],
        comment: '',
        specificity: { idCounter: 0, commonCounter: 0 },
      }

    const cachedResult = this.#cache.get(query)
    if (cachedResult) {
      return cachedResult
    }

    const nodes = new Set<NodeLike>(
      Array.from(this.#graph.nodes.values()),
    )
    const edges = new Set<EdgeLike>(Array.from(this.#graph.edges))

    // parse the query string into AST
    const current = parse(query)
    // set loose mode for the entire parse in case there are multiple selectors
    // so that using invalid pseudo selectors or other query language parser
    // errors won't throw an error,
    // e.g: `:root > *, #a, :foo` still returns results for `:root > ` and `#a`
    // while :foo is ignored
    const loose = asPostcssNodeWithChildren(current).nodes.length > 1
    // builds initial state and walks over it,
    // retrieving the collected result
    const { collect, comment, specificity } = await walk({
      cancellable: async () => {
        await new Promise(resolve => {
          setTimeout(resolve, 0)
        })
        signal.throwIfAborted()
      },
      current,
      initial: {
        nodes: new Set(nodes),
        edges: new Set(edges),
      },
      collect: {
        nodes: new Set<NodeLike>(),
        edges: new Set<EdgeLike>(),
      },
      comment: '',
      loose,
      partial: { nodes, edges },
      retries: this.#retries,
      signal,
      securityArchive: this.#securityArchive,
      specOptions: this.#specOptions,
      scopeIDs,
      walk,
      specificity: { idCounter: 0, commonCounter: 0 },
    })

    const res: QueryResponse = {
      edges: this.#getQueryResponseEdges(collect.edges),
      nodes: this.#getQueryResponseNodes(collect.nodes),
      comment,
      specificity,
    }
    this.#cache.set(query, res)
    return res
  }

  /**
   * Parses a query string in order to retrieve an array of tokens.
   */
  static getQueryTokens(query: string): ParsedSelectorToken[] {
    if (!query) return []

    const tokens: ParsedSelectorToken[] = []

    const ast = (q: string) => {
      try {
        return parse(q)
      } catch (_e) {
        return ast(q.slice(0, -1))
      }
    }

    const processNode = (node: PostcssNode) => {
      for (const key of selectorsMap.keys()) {
        if (node.type === key && node.type !== 'root') {
          let token = `${node.spaces.before}${node.value}${node.spaces.after}`

          if (isIdentifierNode(node)) {
            token = `${node.spaces.before}#${node.value}${node.spaces.after}`
          } else if (isSelectorNode(node)) {
            token = `${node.spaces.before},${node.spaces.after}`
          } else if (isAttributeNode(node)) {
            token = String(
              node.source?.start?.column &&
                node.source.end?.column &&
                `${node.spaces.before}${query.slice(node.source.start.column - 1, node.source.end.column)}${node.spaces.after}`,
            )
          }

          if (
            isPostcssNodeWithChildren(node) &&
            isPseudoNode(node) &&
            node.nodes.length
          ) {
            token = String(token.split('(')[0])
            token += '('
          }

          if (
            !isSelectorNode(node) ||
            node.parent?.nodes.indexOf(node) !== 0
          ) {
            tokens.push({
              ...node,
              token,
            } as ParsedSelectorToken)
          }
        }
      }
      if (isPostcssNodeWithChildren(node)) {
        for (const child of node.nodes) {
          processNode(child)
        }
        if (isPseudoNode(node) && node.nodes.length) {
          tokens.push({
            ...node,
            token: ')' + node.spaces.after,
            type: 'pseudo',
          } as ParsedSelectorToken)
        }
      }
    }

    processNode(ast(query))
    return tokens
  }

  /**
   * Returns an {@link InteractiveBreadcrumb} list of items
   * for a given query string.
   */
  static getBreadcrumbItems(query: string): InteractiveBreadcrumb {
    return new InteractiveBreadcrumb(query)
  }
}
