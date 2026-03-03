import t from 'tap'
import {
  diff,
  getChangedFiles,
  packageHasChanges,
  validateCommitish,
} from '../../src/pseudo/diff.ts'
import {
  getPathBasedGraph,
  getSimpleGraph,
} from '../fixtures/graph.ts'
import {
  selectorFixture,
  copyGraphSelectionState,
} from '../fixtures/selector.ts'
import type {
  GraphSelectionState,
  ParserState,
} from '../../src/types.ts'
import type { GraphLike } from '@vltpkg/types'
import { parse } from '@vltpkg/dss-parser'

const getState = (
  query: string,
  graph: GraphLike = getPathBasedGraph(),
) => {
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
  }
  return state
}

t.test('validateCommitish', async t => {
  t.test('accepts valid commitish values', async t => {
    t.equal(validateCommitish('main'), 'main')
    t.equal(validateCommitish('HEAD~1'), 'HEAD~1')
    t.equal(validateCommitish('HEAD^2'), 'HEAD^2')
    t.equal(validateCommitish('abc123def456'), 'abc123def456')
    t.equal(validateCommitish('origin/main'), 'origin/main')
    t.equal(validateCommitish('v1.0.0'), 'v1.0.0')
    t.equal(
      validateCommitish('feature/my-branch'),
      'feature/my-branch',
    )
    t.equal(validateCommitish('refs/tags/v1.0.0'), 'refs/tags/v1.0.0')
    t.equal(validateCommitish('HEAD@{1}'), 'HEAD@{1}')
  })

  t.test('rejects empty commitish', async t => {
    t.throws(() => validateCommitish(''), {
      message: 'Missing commitish argument for :diff() selector',
    })
  })

  t.test('rejects unsafe commitish values', async t => {
    t.throws(() => validateCommitish('main; rm -rf /'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
    t.throws(() => validateCommitish('main && echo pwned'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
    t.throws(() => validateCommitish('$(whoami)'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
    t.throws(() => validateCommitish('main|cat /etc/passwd'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
    t.throws(() => validateCommitish('`id`'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
  })
})

t.test('packageHasChanges', async t => {
  t.test(
    'returns true when files match package location',
    async t => {
      const changedFiles = new Set([
        'packages/a/src/index.ts',
        'packages/b/test/foo.ts',
        'README.md',
      ])
      t.equal(packageHasChanges(changedFiles, 'packages/a'), true)
      t.equal(packageHasChanges(changedFiles, 'packages/b'), true)
    },
  )

  t.test(
    'returns false when no files match package location',
    async t => {
      const changedFiles = new Set([
        'packages/a/src/index.ts',
        'README.md',
      ])
      t.equal(packageHasChanges(changedFiles, 'packages/c'), false)
    },
  )

  t.test('handles root package location', async t => {
    const changedFiles = new Set(['README.md'])
    t.equal(packageHasChanges(changedFiles, '.'), true)
    t.equal(packageHasChanges(changedFiles, ''), true)
    const empty = new Set<string>()
    t.equal(packageHasChanges(empty, '.'), false)
    t.equal(packageHasChanges(empty, ''), false)
  })

  t.test('handles leading ./ in package location', async t => {
    const changedFiles = new Set(['packages/a/src/index.ts'])
    t.equal(packageHasChanges(changedFiles, './packages/a'), true)
  })

  t.test('does not match partial directory names', async t => {
    const changedFiles = new Set(['packages/abc/src/index.ts'])
    t.equal(
      packageHasChanges(changedFiles, 'packages/ab'),
      false,
      'should not match partial dir name',
    )
  })

  t.test('matches exact file as package location', async t => {
    const changedFiles = new Set(['packages/a'])
    t.equal(packageHasChanges(changedFiles, 'packages/a'), true)
  })
})

t.test('getChangedFiles', async t => {
  t.test('throws on invalid commitish', async t => {
    t.throws(() => getChangedFiles('$(whoami)', '/tmp'), {
      message: 'Invalid commitish argument for :diff() selector',
    })
  })

  t.test('throws when git command fails', async t => {
    t.throws(
      () =>
        getChangedFiles(
          'nonexistent-ref-12345',
          '/tmp/not-a-git-repo-12345',
        ),
      {
        message: /Failed to run git diff/,
      },
    )
  })
})

t.test(':diff pseudo-selector', async t => {
  t.test('filters nodes based on mocked git diff', async t => {
    const graph = getPathBasedGraph()

    // Mock execSync to return specific changed files
    const state = getState(':diff(main)', graph)

    // We'll test the diff function directly with a mock
    // by using t.mockImport to replace execSync
    const { diff: mockedDiff } = await t.mockImport<
      typeof import('../../src/pseudo/diff.ts')
    >('../../src/pseudo/diff.ts', {
      'node:child_process': {
        execSync: () =>
          'packages/a/src/index.ts\npackages/b/test/foo.ts\n',
      },
    })

    const res = await mockedDiff(state)
    const names = [...res.partial.nodes].map(n => n.name).sort()
    // packages/a and packages/b have changes, root has changes
    // (root always matches if there are changes),
    // plus any node whose location starts with those paths
    t.ok(names.includes('a'), 'should include a')
    t.ok(names.includes('b'), 'should include b')
  })

  t.test('returns no nodes when no files changed', async t => {
    const graph = getPathBasedGraph()
    const state = getState(':diff(HEAD~1)', graph)

    const { diff: mockedDiff } = await t.mockImport<
      typeof import('../../src/pseudo/diff.ts')
    >('../../src/pseudo/diff.ts', {
      'node:child_process': {
        execSync: () => '',
      },
    })

    const res = await mockedDiff(state)
    const names = [...res.partial.nodes].map(n => n.name)
    // root package with location '.' or '' should NOT match
    // when changedFiles is empty
    t.strictSame(
      names.filter(n => n !== 'path-based-project'),
      [],
      'should have no non-root nodes when no changes',
    )
  })

  t.test('throws on missing commitish argument', async t => {
    // Parse a pseudo selector with empty argument
    // We simulate this by calling diff directly with a
    // crafted state where the selector parsing will fail
    const graph = getSimpleGraph()
    // :diff() with no arg — should throw during parseInternals
    // because there are no child nodes
    await t.rejects(async () => {
      const ast = parse(':diff()')
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
      await diff(state)
    }, 'should throw for empty :diff()')
  })

  t.test('throws on git diff failure', async t => {
    const graph = getSimpleGraph()
    const state = getState(':diff(main)', graph)

    const { diff: mockedDiff } = await t.mockImport<
      typeof import('../../src/pseudo/diff.ts')
    >('../../src/pseudo/diff.ts', {
      'node:child_process': {
        execSync: () => {
          throw new Error('git diff failed')
        },
      },
    })

    await t.rejects(
      async () => mockedDiff(state),
      { message: /Failed to run git diff/ },
      'should throw on git failure',
    )
  })

  t.test(
    'works with path-based graph and matching changes',
    async t => {
      const graph = getPathBasedGraph()
      const state = getState(':diff(main)', graph)

      const { diff: mockedDiff } = await t.mockImport<
        typeof import('../../src/pseudo/diff.ts')
      >('../../src/pseudo/diff.ts', {
        'node:child_process': {
          execSync: () => 'packages/a/src/index.ts\nc/lib/util.ts\n',
        },
      })

      const res = await mockedDiff(state)
      const names = [...res.partial.nodes].map(n => n.name).sort()
      // packages/a and c have changes based on their
      // location property
      t.ok(names.includes('a'), 'should include a (packages/a)')
      t.ok(names.includes('c'), 'should include c')
      t.notOk(
        names.includes('b'),
        'should not include b (packages/b has no changes)',
      )
    },
  )

  t.test('registered as pseudo selector in map', async t => {
    const graph = getPathBasedGraph()
    const all: GraphSelectionState = {
      edges: new Set(graph.edges),
      nodes: new Set(graph.nodes.values()),
    }

    // Test that :diff is recognized (doesn't throw
    // "Unsupported pseudo-class")
    // We need to mock the git command for this
    const { pseudo: mockedPseudo } = await t.mockImport<
      typeof import('../../src/pseudo.ts')
    >('../../src/pseudo.ts', {
      '../../src/pseudo/diff.ts': {
        diff: async (state: ParserState) => {
          // Mock: keep only nodes whose location
          // includes 'packages/a'
          for (const node of state.partial.nodes) {
            const loc = node.location ?? ''
            if (!loc.startsWith('packages/a') && loc !== '.') {
              state.partial.nodes.delete(node)
            }
          }
          return state
        },
      },
    })

    const testMockedPseudo = selectorFixture(mockedPseudo)

    const result = await testMockedPseudo(
      ':diff(main)',
      copyGraphSelectionState(all),
      copyGraphSelectionState(all),
    )

    t.ok(
      result.nodes.length >= 1,
      'should return results with mocked diff',
    )
  })
})
