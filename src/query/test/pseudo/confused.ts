import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import { parse } from '../../src/parser.ts'
import { confused } from '../../src/pseudo/confused.ts'

t.test('selects packages with a manifestConfusion alert', async t => {
  const getState = (query: string, graph = getSimpleGraph()) => {
    const ast = parse(query)
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
      retries: 0,
      securityArchive: asSecurityArchiveLike(
        new Map([
          [
            joinDepIDTuple(['registry', '', 'e@1.0.0']),
            { alerts: [{ type: 'manifestConfusion' }] },
          ],
        ]),
      ),
      specOptions: {},
      signal: new AbortController().signal,
    }
    return state
  }

  await t.test(
    'filter out any node that does not have the alert',
    async t => {
      const res = await confused(getState(':confused'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['e'],
        'should select only confused packages',
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
      retries: 0,
      securityArchive: undefined,
      specOptions: {},
      signal: new AbortController().signal,
    }
    return state
  }

  await t.rejects(
    confused(getState(':confused')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})

t.test('nodes with confused=true flag', async t => {
  const getState = (query: string) => {
    const ast = parse(query)
    const current = ast.first.first
    const graph = getSimpleGraph()

    // Find node 'a' and set confused=true
    const nodeA = [...graph.nodes.values()].find(n => n.name === 'a')
    if (nodeA) {
      nodeA.confused = true
      t.teardown(() => {
        nodeA.confused = false // Reset the flag after the test
      })
    }

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
      retries: 0,
      securityArchive: asSecurityArchiveLike(
        new Map([
          [
            joinDepIDTuple(['registry', '', 'e@1.0.0']),
            { alerts: [{ type: 'manifestConfusion' }] },
          ],
        ]),
      ),
      specOptions: {},
      signal: new AbortController().signal,
    }
    return state
  }

  await t.test('filter out nodes that are not confused', async t => {
    const res = await confused(getState(':confused'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'e'],
      'should select both confused=true nodes and nodes with manifestConfusion alert',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })
})
