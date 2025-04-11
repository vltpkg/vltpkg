import t from 'tap'
import { pseudo } from '../../src/pseudo.ts'
import {
  selectorFixture,
  copyGraphSelectionState,
} from '../fixtures/selector.ts'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { TestCase } from '../fixtures/types.ts'
import type { GraphSelectionState } from '../../src/types.ts'

const testPseudo = selectorFixture(pseudo)

t.test(':peer pseudo-selector', async t => {
  // Get a simple graph for testing
  const simpleGraph = getSimpleGraph()

  // Create a peer dependency edge for testing
  // Find an existing edge and change its type to 'peer'
  for (const edge of simpleGraph.edges) {
    if (edge.name === 'c') {
      edge.type = 'peer'
      break
    }
  }

  // Get the full selection state
  const all = {
    edges: new Set(simpleGraph.edges),
    nodes: new Set(simpleGraph.nodes.values()),
  }

  // Create an empty selection state
  const empty: GraphSelectionState = {
    edges: new Set(),
    nodes: new Set(),
  }

  // Run tests in the same pattern as the main pseudo.ts tests
  const queryToExpected = new Set<TestCase>([
    [':peer', all, ['c']], // Should return nodes with peer dependency edges
    [':peer', empty, []], // Empty input should return empty output
  ])

  const initial = copyGraphSelectionState(all)
  for (const [query, partial, expected] of queryToExpected) {
    const result = await testPseudo(
      query,
      initial,
      copyGraphSelectionState(partial),
    )

    t.strictSame(
      result.nodes.map(i => i.name),
      expected,
      `query > "${query}"`,
    )

    // Verify all edges are peer dependencies
    const edgeArray = [...result.edges]
    if (edgeArray.length > 0) {
      for (const edge of edgeArray) {
        t.ok(
          edge.type === 'peer' || edge.type === 'peerOptional',
          `edge ${edge.name} should have type 'peer' or 'peerOptional'`,
        )
      }
    }
  }

  // Test peerOptional type
  t.test('handles peerOptional dependencies', async t => {
    // Change an edge to peerOptional for testing
    for (const edge of simpleGraph.edges) {
      if (edge.name === 'd') {
        edge.type = 'peerOptional'
        break
      }
    }

    // Run the test
    const result = await testPseudo(
      ':peer',
      initial,
      copyGraphSelectionState(all),
    )

    // Result should include both peer and peerOptional dependencies
    const nodeArray = [...result.nodes]
    t.ok(
      nodeArray.length >= 2,
      'Result should include both peer and peerOptional dependencies',
    )

    // Verify that our peerOptional dependency is included
    const nodeNames = nodeArray.map(n => n.name)
    t.ok(
      nodeNames.includes('d'),
      'Result should include the peerOptional dependency',
    )
  })
})
