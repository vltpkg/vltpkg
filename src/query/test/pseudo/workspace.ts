import t from 'tap'
import { pseudo } from '../../src/pseudo.ts'
import {
  selectorFixture,
  copyGraphSelectionState,
} from '../fixtures/selector.ts'
import {
  getSingleWorkspaceGraph,
  getMultiWorkspaceGraph,
} from '../fixtures/graph.ts'
import type { TestCase } from '../fixtures/types.ts'
import type { GraphSelectionState } from '../../src/types.ts'

const testPseudo = selectorFixture(pseudo)

t.test(':workspace pseudo-selector', async t => {
  // Test with a single workspace graph
  t.test('with single workspace', async t => {
    // Get a graph with a single workspace
    const singleWorkspaceGraph = getSingleWorkspaceGraph()

    // Get the full selection state
    const all = {
      edges: new Set(singleWorkspaceGraph.edges),
      nodes: new Set(singleWorkspaceGraph.nodes.values()),
    }

    // Create an empty selection state
    const empty: GraphSelectionState = {
      edges: new Set(),
      nodes: new Set(),
    }

    // Run tests in the same pattern as the main pseudo.ts tests
    const queryToExpected = new Set<TestCase>([
      [':workspace', all, ['w']], // Should return only workspace nodes
      [':workspace', empty, []], // Empty input should return empty output
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

      // Verify all nodes are workspace nodes
      const nodeArray = [...result.nodes]
      if (nodeArray.length > 0) {
        for (const node of nodeArray) {
          t.equal(
            node.importer && !node.mainImporter,
            true,
            `node ${node.name} should be a workspace node (importer=true, mainImporter=false)`,
          )
        }
      }
    }
  })

  // Test with multiple workspaces
  t.test('with multiple workspaces', async t => {
    // Get a graph with multiple workspaces
    const multiWorkspaceGraph = getMultiWorkspaceGraph()

    // Get the full selection state
    const all = {
      edges: new Set(multiWorkspaceGraph.edges),
      nodes: new Set(multiWorkspaceGraph.nodes.values()),
    }

    // Run the test
    const result = await testPseudo(
      ':workspace',
      copyGraphSelectionState(all),
      copyGraphSelectionState(all),
    )

    // Should return all workspace nodes (a, b, c)
    const nodeNames = [...result.nodes].map(n => n.name).sort()
    t.strictSame(
      nodeNames,
      ['a', 'b', 'c'],
      'should return all workspace nodes in multi-workspace graph',
    )

    t.matchSnapshot(
      {
        nodes: [...result.nodes].map(n => n.name).sort(),
        edges: [...result.edges].map(e => e.name).sort(),
      },
      'should match snapshot for multi-workspace graph',
    )

    // Verify all nodes are workspace nodes
    for (const node of result.nodes) {
      t.equal(
        node.importer && !node.mainImporter,
        true,
        `node ${node.name} should be a workspace node (importer=true, mainImporter=false)`,
      )
    }
  })
})
