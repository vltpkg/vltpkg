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

t.test(':dev pseudo-selector', async t => {
  // Get a simple graph for testing
  const simpleGraph = getSimpleGraph()

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
    [':dev', all, ['b', '@x/y']], // Should return nodes with dev edges
    [':dev', empty, []], // Empty input should return empty output
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

    // Verify all edges are of type 'dev'
    const edgeArray = [...result.edges]
    if (edgeArray.length > 0) {
      for (const edge of edgeArray) {
        t.equal(
          edge.type,
          'dev',
          `edge ${edge.name} should be of type 'dev'`,
        )
      }
    }
  }
})
