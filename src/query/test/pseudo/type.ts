import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { type } from '../../src/pseudo/type.ts'
import {
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from '../fixtures/graph.ts'

t.test('selects nodes by type', async t => {
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
    'selects nodes of specified type in simple graph',
    async t => {
      const res = await type(getState(':type(registry)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b', 'c', 'd', 'e', 'f'].sort(),
        'should select only npm packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects nodes of specified type in workspace graph',
    async t => {
      const wsGraph = getSingleWorkspaceGraph()
      const res = await type(getState(':type(workspace)', wsGraph))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['w'],
        'should select only workspace packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'returns no nodes when type does not match',
    async t => {
      const res = await type(getState(':type(nonexistent)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should not select any packages when type does not match',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('handles an empty partial state', async t => {
    const state = getState(':type(npm)')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await type(state)
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
