import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { missing } from '../../src/pseudo/missing.ts'
import {
  getSimpleGraph,
  getMissingNodeGraph,
} from '../fixtures/graph.ts'

t.test('selects edges with no linked node', async t => {
  const getState = (query: string, graph = getSimpleGraph()) => {
    const ast = postcssSelectorParser().astSync(query)
    const current = ast.first.first
    const state: ParserState = {
      comment: '',
      current,
      initial: {
        edges: new Set(graph.edges.values()),
        nodes: new Set(graph.nodes.values()),
      },
      partial: {
        edges: new Set(graph.edges.values()),
        nodes: new Set(graph.nodes.values()),
      },
      collect: {
        edges: new Set(),
        nodes: new Set(),
      },
      cancellable: async () => {},
      walk: async i => i,
      retries: 0,
      securityArchive: undefined,
      specOptions: {},
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test(
    'returns no edges in simple graph (all edges have linked nodes)',
    async t => {
      // In getSimpleGraph, all edges have linked nodes, so :missing should return no edges
      const res = await missing(getState(':missing'))
      t.strictSame(
        [...res.partial.edges].map(e => e.name),
        [],
        'should not select any edges in a graph where all edges have linked nodes',
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should always return an empty nodes set',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects edges with no linked node in missing node graph',
    async t => {
      // In getMissingNodeGraph, there are edges without linked nodes
      const missingNodeGraph = getMissingNodeGraph()
      const res = await missing(
        getState(':missing', missingNodeGraph),
      )

      // The getMissingNodeGraph has edges 'a' and 'b' without linked nodes
      t.strictSame(
        [...res.partial.edges].map(e => e.name).sort(),
        ['a', 'b'].sort(),
        'should select only edges without linked nodes',
      )
      t.strictSame(
        [...res.partial.nodes],
        [],
        'should always return an empty nodes set',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('handles an empty partial state', async t => {
    // Create a state with empty partial edges and nodes
    const state = getState(':missing')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await missing(state)
    t.strictSame(
      [...res.partial.edges],
      [],
      'should return empty array of edges when starting with empty partial state',
    )
    t.strictSame(
      [...res.partial.nodes],
      [],
      'should return empty array of nodes when starting with empty partial state',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })
})
