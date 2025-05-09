import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { link } from '../../src/pseudo/link.ts'
import { getSimpleGraph, getLinkedGraph } from '../fixtures/graph.ts'

t.test('selects file links and tar.gz packages', async t => {
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
    'selects nodes that are file links in simple graph',
    async t => {
      // Based on the getSimpleGraph fixture, only '@x/y' is a file link
      const res = await link(getState(':link'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['@x/y'].sort(),
        'should select only file link packages in simple graph',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects nodes that are file links or tar.gz in linked graph',
    async t => {
      // In getLinkedGraph, 'a' is a file
      const linkedGraph = getLinkedGraph()
      const res = await link(getState(':link', linkedGraph))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a'].sort(),
        'should select file links packages',
      )
      t.strictSame(
        [...res.partial.edges].map(e => e.name).sort(),
        ['a', 'd'].sort(),
        'should select file links edges including to missing packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('handles an empty partial state', async t => {
    // Create a state with empty partial nodes
    const state = getState(':link')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await link(state)
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
