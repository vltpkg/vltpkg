import t from 'tap'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import {
  createSecuritySelectorFilter,
  removeDanglingEdges,
  removeNode,
  removeQuotes,
  removeEdge,
  removeUnlinkedNodes,
  clear,
  assertSecurityArchive,
} from '../../src/pseudo/helpers.ts'
import {
  getMissingNodeGraph,
  getSimpleGraph,
  getMultiWorkspaceGraph,
} from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id/browser'
import { parse } from '../../src/parser.ts'

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

t.test('removeEdge', async t => {
  await t.test('remove an edge and its outgoing node', async t => {
    const graph = getSimpleGraph()
    const edge = [...graph.edges].find(e => e.name === 'a')!
    const partial = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }
    const state = { partial } as ParserState

    removeEdge(state, edge)

    t.notOk(
      [...state.partial.edges].includes(edge),
      'should remove the edge',
    )
    t.notOk(
      [...state.partial.nodes].includes(edge.to!),
      'should remove the outgoing node',
    )
  })

  await t.test('remove an edge with no outgoing node', async t => {
    const graph = getMissingNodeGraph()
    const edge = [...graph.edges].find(e => e.name === 'a')!
    const partial = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }
    const state = { partial } as ParserState

    removeEdge(state, edge)

    t.notOk(
      [...state.partial.edges].includes(edge),
      'should remove the edge',
    )
    t.strictSame(
      [...state.partial.nodes],
      [...graph.nodes.values()],
      'should not modify nodes when edge has no outgoing node',
    )
  })
})

t.test('removeUnlinkedNodes', async t => {
  await t.test('graph with unlinked nodes', async t => {
    const graph = getMultiWorkspaceGraph()
    // Get node b, which has no incoming edges in the multi-workspace graph
    const nodeB = graph.nodes.get(joinDepIDTuple(['workspace', 'b']))!
    const partial = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }
    const state = { partial } as ParserState

    removeUnlinkedNodes(state)

    const expectedNodes = [...graph.nodes.values()].filter(
      n => n !== nodeB && n.edgesIn.size > 0,
    )
    t.strictSame(
      [...state.partial.nodes],
      expectedNodes,
      'should remove nodes with no incoming edges',
    )
  })

  await t.test(
    'graph with all nodes having incoming edges',
    async t => {
      const graph = getSimpleGraph()
      // All nodes except main importer in simple graph have incoming edges
      const partial = {
        edges: new Set(graph.edges),
        nodes: new Set(
          [...graph.nodes.values()].filter(
            n => n !== graph.mainImporter,
          ),
        ),
      }
      const state = { partial } as ParserState

      removeUnlinkedNodes(state)

      t.strictSame(
        [...state.partial.nodes],
        [...partial.nodes],
        'should not remove any nodes when all have incoming edges',
      )
    },
  )
})

t.test('clear', async t => {
  await t.test('clears all nodes and edges', async t => {
    const graph = getSimpleGraph()
    const partial = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }
    const state = { partial } as ParserState

    // Verify the state has nodes and edges before clearing
    t.ok(
      state.partial.nodes.size > 0,
      'state should have nodes before clearing',
    )
    t.ok(
      state.partial.edges.size > 0,
      'state should have edges before clearing',
    )

    // Call the clear function
    const result = clear(state)

    // Verify the nodes and edges are cleared
    t.equal(state.partial.nodes.size, 0, 'should clear all nodes')
    t.equal(state.partial.edges.size, 0, 'should clear all edges')

    // Verify the function returns the state
    t.equal(result, state, 'should return the state object')
  })
})

t.test('assertSecurityArchive', async t => {
  await t.test('with security archive present', async t => {
    const state = {
      securityArchive: asSecurityArchiveLike(new Map()),
    } as ParserState

    // Should not throw when security archive is present
    t.doesNotThrow(
      () => assertSecurityArchive(state, 'test'),
      'should not throw when security archive is present',
    )
  })

  await t.test('with security archive missing', async t => {
    const state = {
      securityArchive: undefined,
    } as ParserState

    // Should throw when security archive is missing
    t.throws(
      () => assertSecurityArchive(state, 'test'),
      { message: /Missing security archive/ },
      'should throw when security archive is missing',
    )
  })
})

t.test('selects packages with an unmaintained alert', async t => {
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
      securityArchive: asSecurityArchiveLike(
        new Map([
          [
            joinDepIDTuple(['registry', '', 'e@1.0.0']),
            { alerts: [{ type: 'unmaintained' }] },
          ],
        ]),
      ),
      specOptions: {},
      retries: 0,
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
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
    const ast = parse(query)
    const current = ast.first.first
    const state: ParserState = {
      comment: '',
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
      retries: 0,
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
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
