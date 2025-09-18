import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import type {
  HostContextsMap,
  ParserState,
  HostContextsMapResult,
} from '../../src/types.ts'
import type { GraphLike, EdgeLike } from '@vltpkg/types'
import { hostContext } from '../../src/pseudo/host.ts'
import {
  getSimpleGraph,
  getMultiWorkspaceGraph,
} from '../fixtures/graph.ts'

t.test('host selector', async t => {
  // Helper function to convert GraphLike objects to HostContextsMapResult
  const graphsToHostContextResult = (
    graphs: GraphLike[],
  ): HostContextsMapResult => {
    const allEdges: EdgeLike[] = []
    const allNodes = []

    for (const graph of graphs) {
      allEdges.push(...graph.edges.values())
      allNodes.push(...graph.nodes.values())
    }

    return {
      initialEdges: allEdges,
      initialNodes: allNodes,
      edges: allEdges,
      nodes: allNodes,
      securityArchive: asSecurityArchiveLike(new Map()),
    }
  }

  const getState = (
    query: string,
    graph = getSimpleGraph(),
    hostContexts?: HostContextsMap,
  ) => {
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
      hostContexts,
      importers: new Set(graph.importers),
      cancellable: async () => {},
      walk: async i => i,
      retries: 0,
      securityArchive: undefined,
      signal: new AbortController().signal,
      scopeIDs: [],
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test('switches to graphs from host context', async t => {
    const testGraph1 = getSimpleGraph()
    const testGraph2 = getMultiWorkspaceGraph()

    const hostContexts: HostContextsMap = new Map()
    hostContexts.set('test-context', async () =>
      graphsToHostContextResult([testGraph2]),
    )

    const state = getState(
      ':host(test-context)',
      testGraph1,
      hostContexts,
    )
    const res = await hostContext(state)

    // Should have switched to nodes/edges from testGraph2
    t.equal(res.partial.nodes.size, testGraph2.nodes.size)
    t.equal(res.partial.edges.size, testGraph2.edges.size)

    // Verify the nodes are from testGraph2
    const nodeNames = [...res.partial.nodes].map(n => n.name).sort()
    const expectedNames = [...testGraph2.nodes.values()]
      .map(n => n.name)
      .sort()
    t.same(nodeNames, expectedNames)
  })

  await t.test(
    'combines multiple graphs from host context',
    async t => {
      const graph1: GraphLike = getSimpleGraph()
      const graph2: GraphLike = getMultiWorkspaceGraph()

      const hostContexts: HostContextsMap = new Map()
      hostContexts.set('multi-context', async () =>
        graphsToHostContextResult([graph1, graph2]),
      )

      const state = getState(
        ':host(multi-context)',
        getSimpleGraph(),
        hostContexts,
      )
      const res = await hostContext(state)

      // Should have combined nodes/edges from both graphs
      const expectedNodeCount = graph1.nodes.size + graph2.nodes.size
      const expectedEdgeCount = graph1.edges.size + graph2.edges.size

      t.equal(res.partial.nodes.size, expectedNodeCount)
      t.equal(res.partial.edges.size, expectedEdgeCount)
    },
  )

  await t.test('handles async host context functions', async t => {
    const testGraph = getMultiWorkspaceGraph()

    const hostContexts: HostContextsMap = new Map()
    hostContexts.set('async-context', async () => {
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10))
      return graphsToHostContextResult([testGraph])
    })

    const state = getState(
      ':host(async-context)',
      getSimpleGraph(),
      hostContexts,
    )
    const res = await hostContext(state)

    t.equal(res.partial.nodes.size, testGraph.nodes.size)
    t.equal(res.partial.edges.size, testGraph.edges.size)
  })

  await t.test(
    'throws error when no host contexts available',
    async t => {
      const state = getState(':host(test)')

      await t.rejects(
        hostContext(state),
        /No host contexts available for :host selector/,
        'should throw when hostContexts is undefined',
      )
    },
  )

  await t.test('throws error for unknown host context', async t => {
    const hostContexts: HostContextsMap = new Map()
    hostContexts.set('known-context', async () =>
      graphsToHostContextResult([]),
    )

    const state = getState(
      ':host(unknown)',
      getSimpleGraph(),
      hostContexts,
    )

    await t.rejects(
      hostContext(state),
      /Unknown host context: unknown/,
      'should throw for unknown context key',
    )
  })

  await t.test('handles empty context key', async t => {
    const hostContexts: HostContextsMap = new Map()
    const state = getState(
      ':host("")',
      getSimpleGraph(),
      hostContexts,
    )

    await t.rejects(
      hostContext(state),
      /Failed to parse :host selector/,
      'should throw for empty context key',
    )
  })

  await t.test('handles unquoted context key', async t => {
    const testGraph = getMultiWorkspaceGraph()
    const hostContexts: HostContextsMap = new Map()
    hostContexts.set('unquoted', async () =>
      graphsToHostContextResult([testGraph]),
    )

    // Create state with unquoted parameter
    const ast = postcssSelectorParser().astSync(':host(unquoted)')
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
      importers: new Set(),
      cancellable: async () => {},
      walk: async i => i,
      retries: 0,
      securityArchive: undefined,
      signal: new AbortController().signal,
      scopeIDs: [],
      specificity: { idCounter: 0, commonCounter: 0 },
      hostContexts,
    }

    const res = await hostContext(state)
    t.equal(res.partial.nodes.size, testGraph.nodes.size)
  })

  await t.test(
    'clears existing nodes and edges before switching',
    async t => {
      const originalGraph = getSimpleGraph()
      const newGraph = getMultiWorkspaceGraph()

      const hostContexts: HostContextsMap = new Map()
      hostContexts.set('replace-context', async () =>
        graphsToHostContextResult([newGraph]),
      )

      const state = getState(
        ':host(replace-context)',
        originalGraph,
        hostContexts,
      )

      // Verify initial state has original graph data
      t.equal(state.partial.nodes.size, originalGraph.nodes.size)
      t.equal(state.partial.edges.size, originalGraph.edges.size)

      const res = await hostContext(state)

      // Verify state now only has new graph data
      t.equal(res.partial.nodes.size, newGraph.nodes.size)
      t.equal(res.partial.edges.size, newGraph.edges.size)

      // Verify that all nodes in result are from the new graph
      for (const node of res.partial.nodes) {
        const newGraphNode = newGraph.nodes.get(node.id)
        if (newGraphNode) {
          t.equal(
            node.name,
            newGraphNode.name,
            'node should match new graph node',
          )
        }
      }
    },
  )
})
