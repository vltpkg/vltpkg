import postcssSelectorParser from 'postcss-selector-parser'
import { EdgeLike, NodeLike } from '@vltpkg/graph'
import { ParserState, PostcssNode } from '../../src/types.js'
import { walk } from '../../src/index.js'
import { ParserFn } from '../../src/types.js'

/**
 * Creates a {@link ParserState} state object and runs the provided `testFn`
 * using that, returns an array of the resulting {@link NodeLike} nodes.
 */
export const selectorFixture =
  (testFn: ParserFn) =>
  async (
    query: { value: string; type: string } | string,
    initial: NodeLike[],
    partial: NodeLike[],
    loose?: boolean,
  ): Promise<NodeLike[]> => {
    const edges = new Set<EdgeLike>()
    for (const node of initial) {
      for (const edge of node.edgesOut.values()) {
        edges.add(edge)
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
      collect: new Set(),
      current,
      loose,
      initial: {
        nodes: new Set(initial),
        edges: new Set(edges),
      },
      partial: {
        nodes: new Set(partial),
        edges: new Set(edges),
      },
      walk,
    }
    return [...(await testFn(state)).partial.nodes]
  }
