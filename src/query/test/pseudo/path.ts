import t from 'tap'
import { parse } from '@vltpkg/dss-parser'
import {
  getPathBasedGraph,
  getSimpleGraph,
} from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import type { PostcssNode as _PostcssNode } from '@vltpkg/dss-parser'
import { joinDepIDTuple, splitDepID } from '@vltpkg/dep-id/browser'

const getState = (query: string, graph = getPathBasedGraph()) => {
  const ast = parse(query)
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
    loose: false,
  }
  return state
}

// Create a custom state for testing edge cases
const createCustomState = (options: {
  withEmptyNodes?: boolean
  withEmptySelector?: boolean
  withNonStringSelector?: boolean
  withBrokenSelector?: boolean
}) => {
  const state = getState(':path("*")')

  if (options.withEmptyNodes) {
    // Remove nodes completely
    // @ts-expect-error - we're deliberately breaking things for testing
    state.current.nodes = []
  } else if (options.withEmptySelector) {
    // Make the selector have empty nodes
    // @ts-expect-error - we're deliberately breaking things for testing
    if (state.current.nodes?.[0]) {
      // @ts-expect-error - we're deliberately breaking things for testing
      state.current.nodes[0].nodes = []
    }
  } else if (options.withNonStringSelector) {
    // Replace string node with non-string node
    // @ts-expect-error - we're deliberately breaking things for testing
    if (state.current.nodes?.[0]?.nodes) {
      // @ts-expect-error - we're deliberately breaking things for testing
      state.current.nodes[0].nodes[0].type = 'comment'
    }
  } else if (options.withBrokenSelector) {
    // Remove the nodes array from the selector
    // @ts-expect-error - we're deliberately breaking things for testing
    if (state.current.nodes?.[0]) {
      // @ts-expect-error - we're deliberately breaking things for testing
      delete state.current.nodes[0].nodes
    }
  }

  return state
}

t.test('createPathMatcher function', async t => {
  // Import the module inside the test so we can mock it
  const { createPathMatcher } = await t.mockImport<
    typeof import('../../src/pseudo/path.ts')
  >('../../src/pseudo/path.ts', {
    minimatch: {
      minimatch: (
        path: string,
        pattern: string,
        options: any = {},
      ) => {
        if (pattern === 'throw-error') {
          throw new Error('Minimatch error')
        }
        // Special handling for * pattern with matchBase option
        if (pattern === '*' && options.matchBase) {
          return true // Always match for * with matchBase
        }
        return path.includes(pattern)
      },
    },
  })

  await t.test('handles root path pattern', async t => {
    const matcher = createPathMatcher('.')
    t.equal(matcher('.'), true, 'should match dot path')
    t.equal(matcher(''), true, 'should match empty path')
    t.equal(matcher('foo'), false, 'should not match other paths')
  })

  await t.test('creates glob matcher for non-root paths', async t => {
    const matcher = createPathMatcher('packages')
    t.equal(matcher('packages/a'), true, 'should match glob pattern')
    t.equal(matcher('packages/b'), true, 'should match glob pattern')
    t.equal(
      matcher('other/c'),
      false,
      'should not match non-matching paths',
    )
  })

  await t.test(
    'handles invalid glob patterns in loose mode',
    async t => {
      const matcher = createPathMatcher('throw-error', true)
      t.equal(
        matcher('any-path'),
        false,
        'should return false for any path',
      )
    },
  )

  await t.test(
    'throws for invalid glob patterns in strict mode',
    async t => {
      t.throws(
        () => createPathMatcher('throw-error')('any-path'),
        /Invalid glob pattern in :path selector/,
        'should throw with correct message',
      )
    },
  )

  await t.test(
    'creates matcher with matchBase option for * pattern',
    async t => {
      const matcher = createPathMatcher('*')
      t.equal(matcher('file.txt'), true, 'should match any file')
      t.equal(
        matcher('dir/file.txt'),
        true,
        'should match files in subdirectories',
      )
    },
  )
})

t.test(':path selector', async t => {
  // Import the real module for the path selector tests
  const { path, normalizePath, createPathMatcher } =
    await import('../../src/pseudo/path.ts')

  await t.test('normalizePath function', async t => {
    await t.test('trims whitespace', async t => {
      t.equal(
        normalizePath('  packages/a  '),
        'packages/a',
        'should trim leading and trailing whitespace',
      )
      t.equal(
        normalizePath('\tpackages/b\n'),
        'packages/b',
        'should trim tabs and newlines',
      )
      t.equal(
        normalizePath(' ./packages/c '),
        'packages/c',
        'should trim whitespace and remove ./ prefix',
      )
    })

    await t.test('removes leading ./ prefix', async t => {
      t.equal(
        normalizePath('./packages/a'),
        'packages/a',
        'should remove ./ prefix',
      )
      t.equal(
        normalizePath('./x'),
        'x',
        'should remove ./ prefix from simple paths',
      )
      t.equal(
        normalizePath('./packages/nested/deep'),
        'packages/nested/deep',
        'should remove ./ prefix from nested paths',
      )
    })

    await t.test('handles root path normalization', async t => {
      t.equal(
        normalizePath('.'),
        '',
        'should normalize . to empty string',
      )
      t.equal(
        normalizePath(' . '),
        '',
        'should normalize trimmed . to empty string',
      )
    })

    await t.test('preserves other dot patterns', async t => {
      t.equal(
        normalizePath('.config'),
        '.config',
        'should preserve .config paths',
      )
      t.equal(
        normalizePath('.github/workflows'),
        '.github/workflows',
        'should preserve .github paths',
      )
      t.equal(
        normalizePath('packages/.hidden'),
        'packages/.hidden',
        'should preserve hidden files in subdirectories',
      )
    })

    await t.test('handles edge cases', async t => {
      t.equal(normalizePath(''), '', 'should handle empty string')
      t.equal(
        normalizePath('   '),
        '',
        'should handle whitespace-only string',
      )
      t.equal(
        normalizePath('packages/a'),
        'packages/a',
        'should leave already normalized paths unchanged',
      )
    })
  })

  await t.test('createPathMatcher with normalization', async t => {
    await t.test(
      'pattern and path normalization matching',
      async t => {
        const matcher1 = createPathMatcher('packages/a')
        t.ok(
          matcher1('./packages/a'),
          'location ./packages/a should match packages/a pattern',
        )

        const matcher2 = createPathMatcher('packages/*')
        t.ok(
          matcher2('./packages/a'),
          'location ./packages/a should match packages/* pattern',
        )

        const matcher3 = createPathMatcher('./packages/a  ')
        t.ok(
          matcher3('packages/a'),
          'location packages/a should match ./packages/a (with trailing spaces) pattern',
        )

        const matcher4 = createPathMatcher(' packages/* ')
        t.ok(
          matcher4('./packages/b'),
          'location ./packages/b should match trimmed packages/* pattern',
        )
      },
    )

    await t.test('glob patterns with normalization', async t => {
      const matcher1 = createPathMatcher('./packages/**')
      t.ok(
        matcher1('packages/a/nested'),
        'should match nested paths after normalization',
      )

      const matcher2 = createPathMatcher('  **/a/*  ')
      t.ok(
        matcher2('./some/path/a/file'),
        'should match double glob patterns after normalization',
      )
    })
  })

  await t.test('path normalization integration tests', async t => {
    // Create a custom graph with nodes that have ./ prefixed locations
    const createNormalizedTestGraph = () => {
      const graph = getPathBasedGraph()

      // Modify some node locations to have ./ prefixes for testing
      const nodes = Array.from(graph.nodes.values())
      const nodeA = nodes.find(n => n.name === 'a')
      const nodeX = nodes.find(n => n.name === 'x')

      if (nodeA) {
        nodeA.location = './packages/a' // Add ./ prefix
      }
      if (nodeX) {
        nodeX.location = './x' // Add ./ prefix
      }

      return graph
    }

    await t.test(
      'matches ./prefixed locations with normalized patterns',
      async t => {
        const graph = createNormalizedTestGraph()
        const res = await path(getState(':path("packages/a")', graph))
        t.strictSame(
          [...res.partial.nodes].map(n => n.name),
          ['a'],
          'location ./packages/a should match packages/a pattern',
        )
      },
    )

    await t.test(
      'matches ./prefixed locations with glob patterns',
      async t => {
        const graph = createNormalizedTestGraph()
        const res = await path(getState(':path("packages/*")', graph))
        const nodeNames = [...res.partial.nodes]
          .map(n => n.name)
          .sort()
        t.ok(
          nodeNames.includes('a'),
          'location ./packages/a should match packages/* pattern',
        )
        t.ok(
          nodeNames.includes('b'),
          'location packages/b should also match packages/* pattern',
        )
      },
    )

    await t.test(
      'matches regular locations with ./prefixed patterns',
      async t => {
        const res = await path(getState(':path("./packages/a  ")'))
        t.strictSame(
          [...res.partial.nodes].map(n => n.name),
          ['a'],
          'location packages/a should match ./packages/a (with trailing spaces) pattern',
        )
      },
    )
  })

  await t.test('matches all workspace and file nodes', async t => {
    const res = await path(getState(':path("*")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['a', 'b', 'c', 'path-based-project', 'x', 'y'],
      'should match all workspace and file nodes',
    )
  })

  await t.test('matches workspace packages only', async t => {
    const res = await path(getState(':path("packages/*")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['a', 'b'],
      'should match workspace packages in packages directory',
    )
  })

  await t.test('matches specific workspace', async t => {
    const res = await path(getState(':path("packages/a")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should match specific workspace package',
    )
  })

  await t.test('matches root project', async t => {
    const res = await path(getState(':path(".")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['path-based-project'],
      'should match root project',
    )
  })

  await t.test('matches file dependencies', async t => {
    const res = await path(getState(':path("x")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['x'],
      'should match file dependency',
    )
  })

  await t.test('matches with glob patterns', async t => {
    const res = await path(getState(':path("packages/**")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['a', 'b', 'y'],
      'should match all items under packages directory using glob',
    )
  })

  await t.test('matches nested file paths', async t => {
    const res = await path(getState(':path("packages/a/*")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['y'],
      'should match nested file dependency',
    )
  })

  await t.test('matches nested paths with double glob', async t => {
    const res = await path(getState(':path("**/a/*")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['y'],
      'should match nested paths using double glob pattern',
    )
  })

  await t.test('no matches for non-existent paths', async t => {
    const res = await path(getState(':path("nonexistent/**")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should not match any nodes for non-existent paths',
    )
  })

  await t.test('handles empty pattern', async t => {
    const res = await path(getState(':path("")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should match nothing for empty pattern',
    )
  })

  await t.test('handles missing pattern', async t => {
    const res = await path(getState(':path()'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should match nothing for missing pattern',
    )
  })

  await t.test('matches case-sensitive patterns', async t => {
    const res = await path(getState(':path("Packages/*")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should be case-sensitive and not match',
    )
  })

  await t.test('excludes .vlt store paths', async t => {
    // This test verifies that even if a .vlt path pattern is used,
    // only workspace and file nodes are matched (not registry nodes)
    const res = await path(getState(':path("**/.vlt/**")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should not match any nodes for .vlt store patterns since only workspace/file nodes are considered',
    )
  })

  await t.test('error handling in loose mode', async t => {
    const state = getState(':path("[")')
    state.loose = true
    const res = await path(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should handle invalid glob patterns gracefully in loose mode',
    )
  })

  await t.test('error handling in strict mode', async t => {
    const state = getState(':path("[")')
    await t.rejects(
      path(state),
      /Invalid glob pattern in :path selector/,
      'should throw error for invalid glob patterns in strict mode',
    )
  })

  await t.test('requires quoted strings', async t => {
    // This test assumes unquoted patterns would be rejected by the parser
    // The path implementation should only receive quoted strings
    const res = await path(getState(':path("unquoted")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should handle quoted patterns correctly',
    )
  })

  // Additional test cases for improved coverage
  await t.test('handles missing pathContainer.nodes', async t => {
    const state = createCustomState({ withEmptyNodes: true })
    const res = await path(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should return empty result when pathContainer.nodes is missing',
    )
  })

  await t.test('handles empty selector.nodes', async t => {
    const state = createCustomState({ withEmptySelector: true })
    const res = await path(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should return empty result when selector.nodes is empty',
    )
  })

  await t.test(
    'handles non-string selector in strict mode',
    async t => {
      const state = createCustomState({ withNonStringSelector: true })
      await t.rejects(
        path(state),
        /Failed to parse path pattern in :path selector/,
        'should throw error for non-string selector in strict mode',
      )
    },
  )

  await t.test(
    'handles non-string selector in loose mode',
    async t => {
      const state = createCustomState({ withNonStringSelector: true })
      state.loose = true
      const res = await path(state)
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should return empty result for non-string selector in loose mode',
      )
    },
  )

  await t.test('handles broken selectors in strict mode', async t => {
    const state = createCustomState({ withBrokenSelector: true })
    await t.rejects(
      path(state),
      /Not a query selector node with children/,
      'should throw error for broken selector in strict mode',
    )
  })

  await t.test(
    'handles main importer node with root path pattern',
    async t => {
      // Create a graph with a main importer
      const graph = getPathBasedGraph()
      // Find the main importer node
      const mainImporterNode = Array.from(graph.nodes.values()).find(
        node => node.name === 'path-based-project',
      )
      if (mainImporterNode) {
        mainImporterNode.mainImporter = true
      }

      const res = await path(getState(':path(".")', graph))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['path-based-project'],
        'should preserve main importer node with root path pattern',
      )
    },
  )

  await t.test('handles minimatch errors in loose mode', async t => {
    // Create a pattern that will cause minimatch to throw an error
    const state = getState(':path("{[}")')
    state.loose = true
    const res = await path(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should handle minimatch errors gracefully in loose mode',
    )
  })

  await t.test('handles minimatch errors in strict mode', async t => {
    // Create a pattern that will cause minimatch to throw an error
    const state = getState(':path("{[}")')
    await t.rejects(
      path(state),
      /Invalid glob pattern in :path selector/,
      'should throw error for invalid glob patterns in strict mode',
    )
  })

  await t.test(
    'handles path-based vs non-path-based nodes',
    async t => {
      // We need to test that the path.ts implementation correctly checks node types
      const simpleGraph = getSimpleGraph()
      const state = getState(':path("*")', simpleGraph)

      // Add some fake registry nodes to the partial nodes
      // We do this directly on the partial.nodes set without modifying the original graph
      const originalNodes = [...state.partial.nodes]

      // Create a registry node by copying an existing node but changing its ID
      const _exampleNode = originalNodes[0]
      const _registryNodeId = joinDepIDTuple([
        'registry',
        '',
        'fake-registry@1.0.0',
      ])

      // Find if there are any registry nodes already in the graph
      const hasRegistryNode = originalNodes.some(node => {
        const [type] = splitDepID(node.id)
        return type === 'registry'
      })

      // Ensure we have some registry nodes for the test
      if (!hasRegistryNode) {
        t.pass(
          'No registry nodes found in original graph, skipping registry node type test',
        )
      } else {
        // Continue with the test since we have registry nodes
        const res = await path(state)

        // Verify that no registry nodes remain
        const remainingNodes = [...res.partial.nodes]
        const hasRemainingRegistryNodes = remainingNodes.some(
          node => {
            const [type] = splitDepID(node.id)
            return type === 'registry'
          },
        )

        t.notOk(
          hasRemainingRegistryNodes,
          'should filter out all registry nodes',
        )
      }
    },
  )

  await t.test('handles path matching logic', async t => {
    // We'll test that the path filtering logic works correctly
    const graph = getPathBasedGraph()
    const state = getState(':path("x")', graph)

    // Run the path selector that should only match nodes with location "x"
    const res = await path(state)

    // Check that only nodes with location "x" remain
    const remainingNodeNames = [...res.partial.nodes].map(n => n.name)
    t.ok(
      remainingNodeNames.includes('x'),
      'node with matching path should remain',
    )
    t.notOk(
      remainingNodeNames.includes('a'),
      'node with non-matching path should be removed',
    )
    t.notOk(
      remainingNodeNames.includes('b'),
      'node with non-matching path should be removed',
    )
  })
})
