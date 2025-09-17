import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { prerelease } from '../../src/pseudo/prerelease.ts'
import { parse } from '@vltpkg/semver'
import {
  getSemverRichGraph,
  getSimpleGraph,
  newGraph,
  newNode,
} from '../fixtures/graph.ts'

t.test(':prerelease pseudo-selector', async t => {
  const getState = (query: string, graph = getSemverRichGraph()) => {
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
    'selects only nodes with prerelease versions',
    async t => {
      const res = await prerelease(getState(':prerelease'))

      // Should only select nodes with prerelease versions
      const nodeNames = [...res.partial.nodes].map(n => n.name).sort()
      const nodeVersions = [...res.partial.nodes]
        .map(n => n.version)
        .sort()

      t.strictSame(
        nodeNames,
        ['e', 'g'],
        'should select only nodes with prerelease versions',
      )

      t.strictSame(
        nodeVersions,
        ['1.2.3-rc.1+rev.2', '1.3.4-beta.1'],
        'should select correct prerelease versions',
      )

      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => ({
          name: n.name,
          version: n.version,
        })),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('excludes non-prerelease versions', async t => {
    const res = await prerelease(getState(':prerelease'))

    // Verify that only prerelease versions remain
    for (const node of res.partial.nodes) {
      const version = node.manifest?.version
      if (version) {
        const parsed = parse(version)
        t.ok(
          parsed?.prerelease?.length,
          `${node.name}@${version} should have prerelease identifiers`,
        )
      }
    }

    t.matchSnapshot([...res.partial.nodes].map(n => n.version).sort())
  })

  await t.test('handles nodes without version', async t => {
    const graph = newGraph('test-project')
    const addNode = newNode(graph)

    // Create a node without version
    const nodeWithoutVersion = addNode('no-version', '1.0.0')
    nodeWithoutVersion.manifest = { name: 'no-version' } // No version field
    graph.nodes.set(nodeWithoutVersion.id, nodeWithoutVersion)

    const res = await prerelease(getState(':prerelease', graph))

    t.strictSame(
      [...res.partial.nodes].length,
      0,
      'should exclude all nodes when none have prerelease versions',
    )

    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => ({
        name: n.name,
        version: n.version,
      })),
    })
  })

  await t.test('handles nodes with invalid semver', async t => {
    const graph = newGraph('test-project')
    const addNode = newNode(graph)

    // Create a node with invalid semver
    const nodeWithInvalidSemver = addNode('invalid-semver', '1.0.0')
    nodeWithInvalidSemver.version = 'not-a-semver'
    nodeWithInvalidSemver.manifest = {
      name: 'invalid-semver',
      version: 'not-a-semver',
    }
    graph.nodes.set(nodeWithInvalidSemver.id, nodeWithInvalidSemver)

    const res = await prerelease(getState(':prerelease', graph))

    t.strictSame(
      [...res.partial.nodes].length,
      0,
      'should exclude all nodes when none have valid prerelease versions',
    )

    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => ({
        name: n.name,
        version: n.version,
      })),
    })
  })

  await t.test('handles various prerelease formats', async t => {
    const graph = newGraph('prerelease-test')
    const addNode = newNode(graph)

    // Create nodes with various prerelease formats
    const testCases = [
      { name: 'canary', version: '19.2.0-canary-fa3feba6-20250623' },
      { name: 'beta', version: '1.0.0-beta.0' },
      { name: 'alpha', version: '2.1.0-alpha.1' },
      { name: 'rc', version: '3.0.0-rc.2' },
      { name: 'dev', version: '0.0.0-16' },
      { name: 'next', version: '1.5.0-next.1' },
      { name: 'snapshot', version: '2.0.0-snapshot.20231201' },
      { name: 'build-meta', version: '1.2.3-alpha.1+build.123' },
      { name: 'stable', version: '1.0.0' }, // This should be filtered out
      { name: 'another-stable', version: '2.5.3' }, // This should be filtered out
    ]

    for (const testCase of testCases) {
      const node = addNode(testCase.name, testCase.version)
      node.version = testCase.version
      node.manifest = {
        name: testCase.name,
        version: testCase.version,
      }
      graph.nodes.set(node.id, node)
    }

    const res = await prerelease(getState(':prerelease', graph))

    const selectedNodes = [...res.partial.nodes]
      .map(n => ({ name: n.name, version: n.version }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

    // Should select all prerelease versions but exclude stable ones
    const expectedNodes = testCases
      .filter(tc => tc.version.includes('-'))
      .map(tc => ({ name: tc.name, version: tc.version }))
      .sort((a, b) => a.name.localeCompare(b.name))

    t.strictSame(
      selectedNodes,
      expectedNodes,
      'should select all prerelease versions and exclude stable ones',
    )

    t.matchSnapshot({
      selected: selectedNodes,
      total: testCases.length,
    })
  })

  await t.test('removes dangling edges properly', async t => {
    const graph = getSemverRichGraph()
    const initialEdgeCount = graph.edges.size

    const res = await prerelease(getState(':prerelease', graph))

    // Check that dangling edges were removed
    const remainingEdges = [...res.partial.edges]

    t.ok(
      remainingEdges.length <= initialEdgeCount,
      'should have same or fewer edges after filtering',
    )

    // Verify all remaining edges connect to nodes that remain
    for (const edge of remainingEdges) {
      if (edge.to) {
        t.ok(
          res.partial.nodes.has(edge.to),
          `edge ${edge.name} should have valid to node`,
        )
      }
    }

    t.matchSnapshot({
      remainingEdges: remainingEdges.length,
      initialEdges: initialEdgeCount,
      edgeNames: remainingEdges.map(e => e.name).sort(),
    })
  })

  await t.test('works with empty graph', async t => {
    const emptyGraph = newGraph('empty-test')
    // Remove all nodes except root
    emptyGraph.nodes.clear()
    emptyGraph.edges.clear()
    emptyGraph.nodes.set(
      emptyGraph.mainImporter.id,
      emptyGraph.mainImporter,
    )

    const res = await prerelease(getState(':prerelease', emptyGraph))

    t.strictSame(
      [...res.partial.nodes].length,
      0,
      'should have no nodes when root has no prerelease version',
    )

    t.strictSame(
      [...res.partial.edges].length,
      0,
      'should have no edges',
    )
  })

  await t.test(
    'works with simple graph (no prereleases)',
    async t => {
      const simpleGraph = getSimpleGraph()
      const res = await prerelease(
        getState(':prerelease', simpleGraph),
      )

      // Simple graph has no prerelease versions
      t.strictSame(
        [...res.partial.nodes].length,
        0,
        'should have no nodes when no prereleases exist',
      )

      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => ({
          name: n.name,
          version: n.version,
        })),
      })
    },
  )
})
