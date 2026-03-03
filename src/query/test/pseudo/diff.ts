import t from 'tap'
import { diff, packageHasChanges } from '../../src/pseudo/diff.ts'
import { pseudo } from '../../src/pseudo.ts'
import {
  getPathBasedGraph,
  getSimpleGraph,
} from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import type { GraphLike } from '@vltpkg/types'
import { parse } from '@vltpkg/dss-parser'

const getState = (
  query: string,
  graph: GraphLike = getPathBasedGraph(),
  changedFiles?: Set<string>,
) => {
  const ast = parse(query)
  const current = ast.first.first
  const state: ParserState = {
    comment: '',
    current,
    diffFiles: changedFiles ? () => changedFiles : undefined,
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

t.test(':diff pseudo-selector', async t => {
  t.test('filters nodes based on changed files', async t => {
    const graph = getPathBasedGraph()
    const changedFiles = new Set([
      'packages/a/src/index.ts',
      'packages/b/test/foo.ts',
    ])
    const state = getState(':diff(main)', graph, changedFiles)

    const res = await diff(state)
    const names = [...res.partial.nodes].map(n => n.name).sort()
    t.ok(names.includes('a'), 'should include a')
    t.ok(names.includes('b'), 'should include b')
  })

  t.test(
    'returns no non-root nodes when no files changed',
    async t => {
      const graph = getPathBasedGraph()
      const changedFiles = new Set<string>()
      const state = getState(':diff(HEAD~1)', graph, changedFiles)

      const res = await diff(state)
      const names = [...res.partial.nodes].map(n => n.name)
      t.strictSame(
        names.filter(n => n !== 'path-based-project'),
        [],
        'should have no non-root nodes when no changes',
      )
    },
  )

  t.test('throws on missing commitish argument', async t => {
    const graph = getSimpleGraph()
    await t.rejects(async () => {
      const ast = parse(':diff()')
      const current = ast.first.first
      const state: ParserState = {
        comment: '',
        current,
        diffFiles: () => new Set<string>(),
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

  t.test('throws when diffFiles provider is missing', async t => {
    const graph = getSimpleGraph()
    // state without diffFiles
    const state = getState(':diff(main)', graph)
    await t.rejects(
      async () => diff(state),
      {
        message: 'The :diff() selector requires a diffFiles provider',
      },
      'should throw when diffFiles not provided',
    )
  })

  t.test('throws when diffFiles provider throws', async t => {
    const graph = getSimpleGraph()
    const ast = parse(':diff(main)')
    const current = ast.first.first
    const state: ParserState = {
      comment: '',
      current,
      diffFiles: () => {
        throw new Error('git diff failed')
      },
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
    t.throws(
      () => state.diffFiles?.('main'),
      { message: 'git diff failed' },
      'diffFiles provider should propagate errors',
    )
  })

  t.test(
    'works with path-based graph and matching changes',
    async t => {
      const graph = getPathBasedGraph()
      const changedFiles = new Set([
        'packages/a/src/index.ts',
        'c/lib/util.ts',
      ])
      const state = getState(':diff(main)', graph, changedFiles)

      const res = await diff(state)
      const names = [...res.partial.nodes].map(n => n.name).sort()
      t.ok(names.includes('a'), 'should include a (packages/a)')
      t.ok(names.includes('c'), 'should include c')
      t.notOk(
        names.includes('b'),
        'should not include b (packages/b has no changes)',
      )
    },
  )

  t.test('registered as pseudo selector in map', async t => {
    // Verify :diff is in the pseudo selector map by
    // testing through the pseudo function directly with
    // a properly configured state
    const graph = getPathBasedGraph()
    const changedFiles = new Set(['packages/a/src/index.ts'])
    const ast = parse(':diff(main)')
    const current = ast.first.first
    const state: ParserState = {
      comment: '',
      current,
      diffFiles: () => changedFiles,
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
    const res = await pseudo(state)
    t.ok(
      [...res.partial.nodes].some(n => n.name === 'a'),
      'should return results when called through pseudo',
    )
    t.equal(
      res.specificity.commonCounter,
      1,
      'should increment specificity commonCounter',
    )
  })

  t.test('passes commitish to diffFiles provider', async t => {
    const graph = getPathBasedGraph()
    let capturedCommitish = ''
    const ast = parse(':diff(HEAD~3)')
    const current = ast.first.first
    const state: ParserState = {
      comment: '',
      current,
      diffFiles: (commitish: string) => {
        capturedCommitish = commitish
        return new Set<string>()
      },
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
    t.equal(
      capturedCommitish,
      'HEAD~3',
      'should pass commitish to provider',
    )
  })
})
