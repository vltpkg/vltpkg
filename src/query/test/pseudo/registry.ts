import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { registry } from '../../src/pseudo/registry.ts'
import { getSimpleGraph, getAliasedGraph } from '../fixtures/graph.ts'

t.test('selects nodes by registry', async t => {
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
      importers: new Set(graph.importers),
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test(
    'selects custom registry nodes in aliased graph',
    async t => {
      const graph = getAliasedGraph()
      const res = await registry(getState(':registry(custom)', graph))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['c'],
        'should select only custom registry packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects default npm registry nodes in aliased graph',
    async t => {
      const graph = getAliasedGraph()
      const res = await registry(getState(':registry(npm)', graph))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'd', 'foo'],
        'should select only default registry packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'returns no nodes for nonexistent registry',
    async t => {
      const graph = getAliasedGraph()
      const res = await registry(
        getState(':registry(nonexistent)', graph),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should not select any packages for nonexistent registry',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('handles an empty partial state', async t => {
    const state = getState(':registry(npm)')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await registry(state)
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

  await t.test(
    'selects all registry nodes in simple graph as npm',
    async t => {
      const res = await registry(getState(':registry(npm)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b', 'c', 'd', 'e', 'f'],
        'should select all registry packages as npm in simple graph',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )
})
