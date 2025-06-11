import t from 'tap'
import { asPostcssNodeWithChildren, parse } from '@vltpkg/dss-parser'
import { path } from '../../src/pseudo/path.ts'
import { getPathBasedGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import type { SpecOptions } from '@vltpkg/spec/browser'

const specOptions = {
  registry: 'https://registry.npmjs.org',
  registries: {
    custom: 'http://example.com',
  },
} as SpecOptions

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
    specOptions,
    signal: new AbortController().signal,
    specificity: { idCounter: 0, commonCounter: 0 },
    loose: false,
  }
  return state
}

t.test(':path selector', async t => {
  await t.test('matches all workspace and file nodes', async t => {
    const res = await path(getState(':path("*")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['path-based-project', 'a', 'b', 'c', 'x', 'y'],
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
})