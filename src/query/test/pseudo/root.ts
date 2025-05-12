import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { root } from '../../src/pseudo/root.ts'
import {
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from '../fixtures/graph.ts'

t.test('selects the root node of the graph', async t => {
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

  await t.test('selects root node in simple graph', async t => {
    const res = await root(getState(':root'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['my-project'],
      'should select only the root node',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('selects root node in workspace graph', async t => {
    const wsGraph = getSingleWorkspaceGraph()
    const res = await root(getState(':root', wsGraph))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['ws'],
      'should select only the workspace root node',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'throws error when no main importer exists',
    async t => {
      // Create a state with empty nodes set
      const state = getState(':root')
      state.initial.nodes.clear()
      await t.rejects(
        root(state),
        {
          message: ':root pseudo-element works on local graphs only',
        },
        'should throw error when no main importer exists',
      )
    },
  )
})
