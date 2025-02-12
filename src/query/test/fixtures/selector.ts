import postcssSelectorParser from 'postcss-selector-parser'
import type { EdgeLike, GraphLike, NodeLike } from '@vltpkg/graph'
import type {
  GraphSelectionState,
  ParserState,
  PostcssNode,
} from '../../src/types.ts'
import { walk } from '../../src/index.ts'
import type { ParserFn } from '../../src/types.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'

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
  ): Promise<FixtureResult> => {
    if (!initial) {
      initial = {
        edges: new Set(),
        nodes: new Set(),
      }
    }
    if (!partial) {
      partial = {
        edges: new Set(),
        nodes: new Set(),
      }
    }
    let current: PostcssNode
    if (typeof query === 'string') {
      const ast = postcssSelectorParser().astSync(query)
      // if the testing function handles a fully parsed
      // css ast then just use that instead
      current =
        testFn === walk ? ast : (
          (ast.nodes?.[0]?.nodes[0] as PostcssNode)
        )
    } else {
      current = query as PostcssNode
    }
    if (!current) throw new Error('missing selector?')
    const state: ParserState = {
      collect: {
        edges: new Set(),
        nodes: new Set(),
      },
      current,
      loose,
      initial,
      partial,
      walk,
    }
    const res = await testFn(state)
    return {
      edges: [...res.partial.edges],
      nodes: [...res.partial.nodes],
    }
  }
