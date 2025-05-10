import t from 'tap'
import type { ParserState } from '../../src/types.ts'
import { parse } from '../../src/parser.ts'
import { empty } from '../../src/pseudo/empty.ts'
import {
  getSimpleGraph,
  getSingleWorkspaceGraph,
  getCycleGraph,
} from '../fixtures/graph.ts'

t.test('selects packages with no dependencies', async t => {
  const getState = (query: string, graph = getSimpleGraph()) => {
    const ast = parse(query)
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
    'selects nodes with no outgoing edges in simple graph',
    async t => {
      // Based on the getSimpleGraph fixture, packages a, c, e, f and @x/y have no dependencies
      const res = await empty(getState(':empty'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'c', 'e', 'f', '@x/y'].sort(),
        'should select only packages with no dependencies',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects nodes with no outgoing edges in workspace graph',
    async t => {
      // In getSingleWorkspaceGraph, both 'ws' (root) and 'w' (workspace) have no dependencies
      const wsGraph = getSingleWorkspaceGraph()
      const res = await empty(getState(':empty', wsGraph))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['ws', 'w'].sort(),
        'should select all nodes in workspace graph as none have dependencies',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('returns no nodes in cycle graph', async t => {
    // In getCycleGraph, all nodes have dependencies (cycle)
    const cycleGraph = getCycleGraph()
    const res = await empty(getState(':empty', cycleGraph))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should not select any packages in a cycle graph as all have dependencies',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('handles an empty partial state', async t => {
    // Create a state with empty partial nodes
    const state = getState(':empty')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await empty(state)
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
