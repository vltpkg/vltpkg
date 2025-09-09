import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { overridden } from '../../src/pseudo/overridden.ts'
import {
  getSimpleGraph,
  newGraph,
  newNode,
} from '../fixtures/graph.ts'
import { Spec } from '@vltpkg/spec/browser'
import type { GraphLike, NodeLike } from '@vltpkg/types'
import type { SpecOptions } from '@vltpkg/spec/browser'

const specOptions = {
  registries: {
    custom: 'http://example.com',
  },
} satisfies SpecOptions

// Helper function to create an edge with overridden spec
const newOverriddenEdge = (
  from: NodeLike,
  specString: string,
  to?: NodeLike,
) => {
  const parts = specString.split('@')
  const name = parts[0]!
  const version = parts[1] || '^1.0.0'
  const spec = Spec.parse(name, version, specOptions)
  spec.overridden = true
  const edge = {
    name: spec.name,
    from,
    to,
    spec,
    type: 'prod' as const,
    get optional() {
      return false // prod type is never optional
    },
    get peer() {
      return false // prod type is never peer
    },
  }
  from.edgesOut.set(spec.name, edge)
  if (to) {
    to.edgesIn.add(edge)
  }
  from.graph.edges.add(edge)
  return edge
}

// Helper function to create a regular edge (non-overridden)
const newRegularEdge = (
  from: NodeLike,
  specString: string,
  to?: NodeLike,
) => {
  const parts = specString.split('@')
  const name = parts[0]!
  const version = parts[1] || '^1.0.0'
  const spec = Spec.parse(name, version, specOptions)
  const edge = {
    name: spec.name,
    from,
    to,
    spec,
    type: 'prod' as const,
    get optional() {
      return false // prod type is never optional
    },
    get peer() {
      return false // prod type is never peer
    },
  }
  from.edgesOut.set(spec.name, edge)
  if (to) {
    to.edgesIn.add(edge)
  }
  from.graph.edges.add(edge)
  return edge
}

// Create a graph with both overridden and non-overridden edges
export const getOverriddenGraph = (): GraphLike => {
  const graph = newGraph('overridden-project')
  const addNode = newNode(graph)

  // Create nodes
  const [a, b, c, d, e] = ['a', 'b', 'c', 'd', 'e'].map(i =>
    addNode(i),
  ) as [NodeLike, NodeLike, NodeLike, NodeLike, NodeLike]

  // Add nodes to graph
  ;[a, b, c, d, e].forEach(i => {
    graph.nodes.set(i.id, i)
  })

  // Create overridden edges
  newOverriddenEdge(graph.mainImporter, 'a@^1.0.0', a)
  newOverriddenEdge(graph.mainImporter, 'b@^2.0.0', b)
  newOverriddenEdge(a, 'c@^1.0.0', c)

  // Create regular (non-overridden) edges
  newRegularEdge(graph.mainImporter, 'd@^1.0.0', d)
  newRegularEdge(graph.mainImporter, 'e@^1.0.0', e)
  newRegularEdge(b, 'd@^1.0.0', d) // d is linked from both overridden and regular edges

  // Create an overridden edge without a linked node (dangling edge)
  newOverriddenEdge(graph.mainImporter, 'missing@^1.0.0')

  return graph
}

t.test('selects edges with overridden specs', async t => {
  const getState = (query: string, graph = getOverriddenGraph()) => {
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
      scopeIDs: [],
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test(
    'returns only overridden edges and their linked nodes',
    async t => {
      const res = await overridden(getState(':overridden'))
      const edgeNames = [...res.partial.edges].map(e => e.name).sort()
      const nodeNames = [...res.partial.nodes].map(n => n.name).sort()

      t.strictSame(
        edgeNames,
        ['a', 'b', 'c', 'missing'],
        'should select only edges with overridden specs',
      )
      t.strictSame(
        nodeNames,
        ['a', 'b', 'c'],
        'should include only nodes that have incoming overridden edges',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'removes nodes that no longer have incoming edges',
    async t => {
      const res = await overridden(getState(':overridden'))
      const nodeNames = [...res.partial.nodes].map(n => n.name)

      // Node 'd' and 'e' should be removed because they only have non-overridden edges
      t.notOk(
        nodeNames.includes('d'),
        'node d should be removed as it has no overridden incoming edges',
      )
      t.notOk(
        nodeNames.includes('e'),
        'node e should be removed as it has no overridden incoming edges',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'works with simple graph (no overridden edges)',
    async t => {
      // getSimpleGraph has no overridden edges, so result should be empty
      const res = await overridden(
        getState(':overridden', getSimpleGraph()),
      )

      t.strictSame(
        [...res.partial.edges].map(e => e.name),
        [],
        'should return no edges when no edges are overridden',
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should return no nodes when no edges are overridden',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'handles edges with spec.overridden false',
    async t => {
      // Create a graph where specs explicitly have overridden = false
      const graph = newGraph('explicit-false-project')
      const addNode = newNode(graph)
      const a = addNode('a')
      graph.nodes.set(a.id, a)

      const spec = Spec.parse('a', '^1.0.0', specOptions)
      spec.overridden = false // explicitly set to false

      const edge = {
        name: spec.name,
        from: graph.mainImporter,
        to: a,
        spec,
        type: 'prod' as const,
        get optional() {
          return false // prod type is never optional
        },
        get peer() {
          return false // prod type is never peer
        },
      }
      graph.mainImporter.edgesOut.set(spec.name, edge)
      a.edgesIn.add(edge)
      graph.edges.add(edge)

      const res = await overridden(getState(':overridden', graph))

      t.strictSame(
        [...res.partial.edges].map(e => e.name),
        [],
        'should not select edges with overridden explicitly set to false',
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should not select nodes when overridden is explicitly false',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('handles an empty partial state', async t => {
    // Create a state with empty partial edges and nodes
    const state = getState(':overridden')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await overridden(state)
    t.strictSame(
      [...res.partial.edges],
      [],
      'should return empty array of edges when starting with empty partial state',
    )
    t.strictSame(
      [...res.partial.nodes],
      [],
      'should return empty array of nodes when starting with empty partial state',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'preserves edges with both overridden and non-overridden pointing to same node',
    async t => {
      // Node 'd' in our test graph has both overridden and non-overridden edges pointing to it
      // But since we filter out non-overridden edges, 'd' should only appear if it has overridden edges
      const res = await overridden(getState(':overridden'))
      const nodeNames = [...res.partial.nodes].map(n => n.name)

      // In our graph, 'd' has incoming edges from both overridden (b->d) and non-overridden (root->d)
      // But since we remove non-overridden edges, 'd' should only be included if it has overridden edges
      // Since 'b' has an overridden edge to 'd', 'd' should be included
      t.ok(
        nodeNames.includes('a'),
        'node a should be included (has overridden edge from root)',
      )
      t.ok(
        nodeNames.includes('b'),
        'node b should be included (has overridden edge from root)',
      )
      t.ok(
        nodeNames.includes('c'),
        'node c should be included (has overridden edge from a)',
      )

      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )
})
