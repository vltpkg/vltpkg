import { joinDepIDTuple } from '@vltpkg/dep-id'
import { parse } from '@vltpkg/dss-parser'
import { walk } from '../../src/index.ts'
import type { EdgeLike, GraphLike, NodeLike } from '@vltpkg/types'
import type { DepID } from '@vltpkg/dep-id'
import type { PostcssNode } from '@vltpkg/dss-parser'
import type {
  GraphSelectionState,
  ParserState,
  ParserFn,
} from '../../src/types.ts'

export type FixtureResult = {
  edges: EdgeLike[]
  nodes: NodeLike[]
}

export const copyGraphSelectionState = (
  gss: GraphSelectionState,
): GraphSelectionState => ({
  edges: new Set(gss.edges),
  nodes: new Set(gss.nodes),
})

export const getGraphSelectionState = (
  graph: GraphLike,
  name: string,
): GraphSelectionState => {
  const nodes = new Set<NodeLike>([
    graph.nodes.get(
      joinDepIDTuple(['registry', '', `${name}@1.0.0`]),
    )!,
  ])
  const edges = new Set<EdgeLike>()
  for (const edge of graph.edges) {
    if (edge.name === name) edges.add(edge)
  }
  return {
    edges,
    nodes,
  }
}

/**
 * Creates a {@link ParserState} state object and runs the provided `testFn`
 * using that, returns an array of the resulting {@link NodeLike} nodes.
 */
export const selectorFixture =
  (testFn: ParserFn) =>
  async (
    query: { value: string; type: string } | string,
    initial?: GraphSelectionState,
    partial?: GraphSelectionState,
    loose?: boolean,
    scopeIDs?: DepID[],
  ): Promise<FixtureResult> => {
    initial ??= {
      edges: new Set(),
      nodes: new Set(),
    }
    partial ??= {
      edges: new Set(),
      nodes: new Set(),
    }
    scopeIDs ??= [joinDepIDTuple(['file', '.'])]
    let current: PostcssNode
    if (typeof query === 'string') {
      const ast = parse(query)
      // if the testing function handles a fully parsed
      // css ast then just use that instead
      current =
        testFn === walk ? ast : (
          (ast.nodes[0]?.nodes[0] as PostcssNode)
        )
    } else {
      current = query as PostcssNode
    }
    const state: ParserState = {
      cancellable: async () => {},
      collect: {
        edges: new Set(),
        nodes: new Set(),
      },
      comment: '',
      current,
      loose,
      initial,
      partial,
      walk,
      retries: 0,
      scopeIDs,
      securityArchive: undefined,
      signal: new AbortController().signal,
      specOptions: {},
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    const res = await testFn(state)
    return {
      edges: [...res.partial.edges],
      nodes: [...res.partial.nodes],
    }
  }
