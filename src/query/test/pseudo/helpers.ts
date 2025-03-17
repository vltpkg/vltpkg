import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { SecurityArchiveLike } from '@vltpkg/security-archive'
import {
  createSecuritySelectorFilter,
  removeDanglingEdges,
  removeNode,
  removeQuotes,
} from '../../src/pseudo/helpers.ts'
import {
  getMissingNodeGraph,
  getSimpleGraph,
  getMultiWorkspaceGraph,
} from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id/browser'

t.test('removeDanglingEdges', async t => {
  await t.test('graph with missing nodes', async t => {
    const graph = getMissingNodeGraph()
    const partial = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }
    const state = { partial } as ParserState

    removeDanglingEdges(state)

    t.strictSame(
      [...state.partial.edges],
      [],
      'should remove dangling edges',
    )
  })

  await t.test('graph with no dangling edges', async t => {
    const graph = getSimpleGraph()
    const partial = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }
    const state = { partial } as ParserState

    removeDanglingEdges(state)

    t.strictSame(
      [...state.partial.edges],
      [...graph.edges],
      'should not remove any edges',
    )
  })
})

t.test('removeNode', async t => {
  await t.test('remove a node with incoming edges', async t => {
    const graph = getSimpleGraph()
    const node = graph.nodes.get(
      joinDepIDTuple(['registry', '', 'a@1.0.0']),
    )!
    const partial = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }
    const state = { partial } as ParserState

    removeNode(state, node)

    for (const edge of partial.edges) {
      if (edge.to === node) {
        throw new Error('should have removed the incoming edge')
      }
    }
    const expectedNodes = [...graph.nodes.values()].filter(
      n => n !== node,
    )
    t.strictSame(
      [...state.partial.nodes],
      expectedNodes,
      'should remove the node',
    )
  })

  await t.test('remove a node with no incoming edges', async t => {
    const graph = getMultiWorkspaceGraph()
    const node = graph.nodes.get(joinDepIDTuple(['workspace', 'b']))!
    const partial = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }
    const state = { partial } as ParserState

    removeNode(state, node)

    const expectedNodes = [...graph.nodes.values()].filter(
      n => n !== node,
    )
    t.strictSame(
      [...state.partial.nodes],
      expectedNodes,
      'should remove the node',
    )
    t.strictSame(
      [...state.partial.edges],
      [...graph.edges],
      'should not remove any edges',
    )
  })
})

t.test('removeQuotes', async t => {
  t.equal(removeQuotes('""'), '', 'should remove quotes')
  t.equal(removeQuotes('"a"'), 'a', 'should remove quotes')
  t.equal(removeQuotes('a'), 'a', 'should not remove quotes')
  t.equal(removeQuotes('1234'), '1234', 'should not remove quotes')
})

t.test('selects packages with an unmaintained alert', async t => {
  const getState = (query: string, graph = getSimpleGraph()) => {
    const ast = postcssSelectorParser().astSync(query)
    const current = ast.first.first
    const state: ParserState = {
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
      securityArchive: new Map([
        [
          joinDepIDTuple(['registry', '', 'e@1.0.0']),
          { alerts: [{ type: 'unmaintained' }] },
        ],
      ]) as SecurityArchiveLike,
      specOptions: {},
    }
    return state
  }

  const unmaintained = createSecuritySelectorFilter(
    'unmaintained',
    'unmaintained',
  )
  await t.test(
    'filter out any node that does not have the alert',
    async t => {
      const res = await unmaintained(getState(':unmaintained'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['e'],
        'should select only unmaintained packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )
})

t.test('missing security archive', async t => {
  const getState = (query: string) => {
    const ast = postcssSelectorParser().astSync(query)
    const current = ast.first.first
    const state: ParserState = {
      current,
      initial: {
        edges: new Set(),
        nodes: new Set(),
      },
      partial: {
        edges: new Set(),
        nodes: new Set(),
      },
      collect: {
        edges: new Set(),
        nodes: new Set(),
      },
      cancellable: async () => {},
      walk: async i => i,
      securityArchive: undefined,
      specOptions: {},
    }
    return state
  }

  const unmaintained = createSecuritySelectorFilter(
    'unmaintained',
    'unmaintained',
  )
  await t.rejects(
    unmaintained(getState(':unmaintained')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})
