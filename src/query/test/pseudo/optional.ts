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

t.test(':optional pseudo-selector', async t => {
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
    [':optional', all, ['f']], // Should return optional dependencies
    [':optional', empty, []], // Empty input should return empty output
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

    // Verify all edges have type 'optional' if any
    const edgeArray = [...result.edges]
    if (edgeArray.length > 0) {
      for (const edge of edgeArray) {
        t.equal(
          edge.type,
          'optional',
          `edge ${edge.name} should be of type 'optional'`,
        )
      }
    }

    // Verify all nodes have optional property if any
    const nodeArray = [...result.nodes]
    if (nodeArray.length > 0) {
      for (const node of nodeArray) {
        t.ok(
          node.optional ||
            [...node.edgesIn].some(e => e.type === 'optional'),
          `node ${node.name} should be optional or connected by optional edge`,
        )
      }
    }
  }
})
