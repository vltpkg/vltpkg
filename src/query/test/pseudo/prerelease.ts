import t from 'tap'
import { pseudo } from '../../src/pseudo.ts'
import {
  selectorFixture,
  copyGraphSelectionState,
} from '../fixtures/selector.ts'
import {
  getSemverRichGraph,
  getSimpleGraph,
} from '../fixtures/graph.ts'
import type { TestCase } from '../fixtures/types.ts'
import type { GraphSelectionState } from '../../src/types.ts'

const testPseudo = selectorFixture(pseudo)

t.test(':prerelease pseudo-selector', async t => {
  // Get a semver-rich graph for testing (has prerelease versions)
  const semverRichGraph = getSemverRichGraph()
  const simpleGraph = getSimpleGraph()

  // Get the full selection state
  const allSemverRich = {
    edges: new Set(semverRichGraph.edges),
    nodes: new Set(semverRichGraph.nodes.values()),
  }

  const allSimple = {
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
    // Should return nodes with prerelease versions from semver-rich graph
    // From getSemverRichGraph, we know:
    // - e@1.3.4-beta.1 (prerelease)
    // - g@1.2.3-rc.1+rev.2 (prerelease)
    [':prerelease', allSemverRich, ['e', 'g']],
    // Simple graph has no prereleases, should return empty
    [':prerelease', allSimple, []],
    // Empty input should return empty output
    [':prerelease', empty, []],
  ])

  const initialSemverRich = copyGraphSelectionState(allSemverRich)
  const initialSimple = copyGraphSelectionState(allSimple)

  for (const [query, partial, expected] of queryToExpected) {
    const initial =
      partial === allSemverRich ? initialSemverRich
      : partial === allSimple ? initialSimple
      : copyGraphSelectionState(empty)

    const result = await testPseudo(
      query,
      initial,
      copyGraphSelectionState(partial),
    )

    t.strictSame(
      result.nodes.map(i => i.name).sort(),
      expected.sort(),
      `query > "${query}" with ${
        partial === allSemverRich ? 'semver-rich'
        : partial === allSimple ? 'simple'
        : 'empty'
      } graph`,
    )

    // Verify all returned nodes have prerelease versions
    for (const node of result.nodes) {
      t.match(
        node.version,
        /.*-.*/, // Should contain a dash indicating prerelease
        `node ${node.name}@${node.version} should be a prerelease version`,
      )
    }
  }

  // Test specific prerelease versions
  await t.test('specific prerelease versions', async t => {
    const result = await testPseudo(
      ':prerelease',
      initialSemverRich,
      copyGraphSelectionState(allSemverRich),
    )

    const nodeVersions = result.nodes
      .map(n => `${n.name}@${n.version}`)
      .sort()
    t.strictSame(
      nodeVersions,
      ['e@1.3.4-beta.1', 'g@1.2.3-rc.1+rev.2'],
      'should match specific prerelease versions',
    )
  })

  // Test edge case with node without version
  await t.test('node without version', async t => {
    // Create a custom graph with a node that has no version
    const customGraph = getSemverRichGraph()
    const nodeWithoutVersion = [...customGraph.nodes.values()][0]
    // @ts-expect-error - Intentionally setting version to undefined for test
    nodeWithoutVersion.version = undefined

    const customAll = {
      edges: new Set(customGraph.edges),
      nodes: new Set(customGraph.nodes.values()),
    }

    const result = await testPseudo(
      ':prerelease',
      copyGraphSelectionState(customAll),
      copyGraphSelectionState(customAll),
    )

    // The node without version should be filtered out
    t.notOk(
      result.nodes.find(n => n.version === undefined),
      'should filter out nodes without version',
    )
  })
})
