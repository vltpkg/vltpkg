import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { privateParser } from '../../src/pseudo/private.ts'
import {
  getSimpleGraph,
  getSingleWorkspaceGraph,
  getCycleGraph,
} from '../fixtures/graph.ts'

t.test('selects packages with private flag', async t => {
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
    'selects nodes with private flag in simple graph',
    async t => {
      // Based on the getSimpleGraph fixture, only the 'd' package has private: true
      const res = await privateParser(getState(':private'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['d'],
        'should select only packages with private flag set to true',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects no nodes with private flag in workspace graph',
    async t => {
      // In getSingleWorkspaceGraph, no nodes have private flag
      const wsGraph = getSingleWorkspaceGraph()
      const res = await privateParser(getState(':private', wsGraph))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should not select any nodes in workspace graph as none have private flag',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('selects no nodes in cycle graph', async t => {
    // In getCycleGraph, no nodes have private flag
    const cycleGraph = getCycleGraph()
    const res = await privateParser(getState(':private', cycleGraph))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should not select any packages in a cycle graph as none have private flag',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('handles an empty partial state', async t => {
    // Create a state with empty partial nodes
    const state = getState(':private')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await privateParser(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should return empty array when starting with empty partial state',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })
})
