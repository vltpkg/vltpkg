import t from 'tap'
import {
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
