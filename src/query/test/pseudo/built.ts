import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { built } from '../../src/pseudo/built.ts'
import {
  getSimpleGraph,
  getSingleWorkspaceGraph,
  getCycleGraph,
} from '../fixtures/graph.ts'

t.test('selects packages with built buildState', async t => {
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
    'selects nodes with built buildState in simple graph',
    async t => {
      const graph = getSimpleGraph()
      // Set some nodes to have buildState 'built'
      const nodes = [...graph.nodes.values()]
      if (nodes.length >= 5) {
        nodes[0]!.buildState = 'built'
        nodes[1]!.buildState = 'needed'
        nodes[2]!.buildState = 'built'
        nodes[3]!.buildState = 'failed'
        nodes[4]!.buildState = 'none'

        const res = await built(getState(':built', graph))
        const resultNames = [...res.partial.nodes].map(n => n.name)

        t.ok(
          resultNames.includes(nodes[0]!.name),
          'should include first node with built state',
        )
        t.ok(
          resultNames.includes(nodes[2]!.name),
          'should include second node with built state',
        )
        t.notOk(
          resultNames.includes(nodes[1]!.name),
          'should not include node with needed state',
        )
        t.notOk(
          resultNames.includes(nodes[3]!.name),
          'should not include node with failed state',
        )
        t.notOk(
          resultNames.includes(nodes[4]!.name),
          'should not include node with none state',
        )

        t.matchSnapshot({
          nodes: [...res.partial.nodes].map(n => n.name).sort(),
          edges: [...res.partial.edges].map(e => e.name).sort(),
        })
      }
    },
  )

  await t.test(
    'selects no nodes when none have built state',
    async t => {
      const graph = getSingleWorkspaceGraph()
      // Set all nodes to have non-built buildState
      for (const node of graph.nodes.values()) {
        node.buildState = 'needed'
      }

      const res = await built(getState(':built', graph))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should not select any nodes when none have built state',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects all nodes when all have built state',
    async t => {
      const graph = getCycleGraph()
      // Set all nodes to have built buildState
      for (const node of graph.nodes.values()) {
        node.buildState = 'built'
      }

      const res = await built(getState(':built', graph))
      const allNodeNames = [...graph.nodes.values()].map(n => n.name)
      const resultNodeNames = [...res.partial.nodes].map(n => n.name)

      t.strictSame(
        resultNodeNames.sort(),
        allNodeNames.sort(),
        'should select all nodes when all have built state',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('handles an empty partial state', async t => {
    // Create a state with empty partial nodes
    const state = getState(':built')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await built(state)
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

  await t.test('properly removes dangling edges', async t => {
    const graph = getSimpleGraph()
    const nodes = [...graph.nodes.values()]

    // Set only one node to be built
    if (nodes[0]) {
      nodes[0].buildState = 'built'
      for (let i = 1; i < nodes.length; i++) {
        if (nodes[i]) {
          nodes[i]!.buildState = 'none'
        }
      }
    }

    const res = await built(getState(':built', graph))

    // Check that edges pointing to removed nodes are also removed
    for (const edge of res.partial.edges) {
      t.ok(
        edge.to?.buildState === 'built' || !edge.to,
        'edges should only point to built nodes or be missing',
      )
    }

    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name).sort(),
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test(
    'filters mixed buildState values correctly',
    async t => {
      const graph = getSimpleGraph()
      const nodes = [...graph.nodes.values()]

      // Create a realistic scenario with mixed buildStates
      if (nodes.length >= 5) {
        nodes[0]!.buildState = 'built'
        nodes[1]!.buildState = 'needed'
        nodes[2]!.buildState = 'built'
        nodes[3]!.buildState = 'failed'
        nodes[4]!.buildState = 'built'
      }

      const res = await built(getState(':built', graph))
      const resultNodes = [...res.partial.nodes]

      // All resulting nodes should have buildState === 'built'
      for (const node of resultNodes) {
        t.equal(
          node.buildState,
          'built',
          `node ${node.name} should have buildState 'built'`,
        )
      }

      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )
})
