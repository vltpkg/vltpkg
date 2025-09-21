import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import { parse } from '../../src/parser.ts'
import {
  license,
  isLicenseKind,
  asLicenseKind,
} from '../../src/pseudo/license.ts'

t.test('selects packages with a specific license kind', async t => {
  const getState = (query: string, graph = getSimpleGraph()) => {
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
      securityArchive: asSecurityArchiveLike(
        new Map([
          [
            joinDepIDTuple(['registry', '', 'e@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'e@1.0.0']),
              alerts: [{ type: 'explicitlyUnlicensedItem' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'f@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'f@1.0.0']),
              alerts: [{ type: 'miscLicenseIssues' }],
            },
          ],
        ]),
      ),
      importers: new Set(graph.importers),
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test(
    'filter out any node that does not have the license',
    async t => {
      const res = await license(getState(':license("unlicensed")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['e'],
        'should select only packages with the specified license',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('filter out using unquoted param', async t => {
    const res = await license(getState(':license(misc)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['f'],
      'should select only packages with the specified license',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('pseudo state form works', async t => {
    // :license without parameters should now work as pseudo state
    const result = await license(getState(':license'))
    t.ok(result, 'should not throw an error for pseudo state form')
  })
})

t.test('missing security archive', async t => {
  const getState = (query: string) => {
    const ast = parse(query)
    const current = ast.first.first
    const state: ParserState = {
      comment: '',
      current,
      initial: {
        edges: new Set(),
        nodes: new Set(),
      },
      partial: {
        edges: new Set(),
        nodes: new Set(),
      },
      collect: {
        edges: new Set(),
        nodes: new Set(),
      },
      cancellable: async () => {},
      walk: async i => i,
      retries: 0,
      securityArchive: undefined,
      importers: new Set(),
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.rejects(
    license(getState(':license(unlicensed)')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})

t.test('isLicenseKind', async t => {
  t.ok(
    isLicenseKind('unlicensed'),
    'should return true for valid license kinds',
  )
  t.notOk(
    isLicenseKind('invalid'),
    'should return false for invalid license kinds',
  )
})

t.test('asLicenseKind', async t => {
  t.equal(
    asLicenseKind('unlicensed'),
    'unlicensed',
    'should return the license kind',
  )
  t.throws(
    () => asLicenseKind('invalid'),
    { message: /Expected a valid license kind/ },
    'should throw an error for invalid license kinds',
  )
})

t.test('pseudo state form - :license without parameters', async t => {
  const getState = (graph = getSimpleGraph()) => {
    const ast = parse(':license')
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
      securityArchive: asSecurityArchiveLike(
        new Map([
          [
            joinDepIDTuple(['registry', '', 'e@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'e@1.0.0']),
              alerts: [{ type: 'explicitlyUnlicensedItem' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'f@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'f@1.0.0']),
              alerts: [{ type: 'noLicenseFound' }],
            },
          ],
        ]),
      ),
      importers: new Set(graph.importers),
      retries: 0,
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  const state = getState()
  const result = await license(state)
  t.matchSnapshot(
    {
      nodes: [...result.partial.nodes].map(n => n.id),
      edges: [...result.partial.edges].map(
        e => `${e.from.id}->${e.to?.id}`,
      ),
    },
    'should match packages with any license defined (not none)',
  )
})

t.test('error handling for non-query node errors', async t => {
  // Create a state that will trigger a non-"Expected a query node" error
  // by providing malformed AST structure that causes a different parsing error
  const ast = parse(':license(invalid)')
  const current = ast.first.first

  // Create a corrupted current node that will cause asPostcssNodeWithChildren to fail
  // with a different error than "Expected a query node"
  const corruptedCurrent = {
    ...current,
    nodes: [
      {
        type: 'function',
        value: 'license',
        nodes: null, // This will cause asPostcssNodeWithChildren to fail differently
      },
    ],
  }

  const state: ParserState = {
    comment: '',
    current: corruptedCurrent as any,
    initial: {
      edges: new Set(),
      nodes: new Set(),
    },
    partial: {
      edges: new Set(),
      nodes: new Set(),
    },
    collect: {
      edges: new Set(),
      nodes: new Set(),
    },
    cancellable: async () => {},
    walk: async i => i,
    securityArchive: asSecurityArchiveLike(new Map()),
    importers: new Set(),
    retries: 0,
    signal: new AbortController().signal,
    specificity: { idCounter: 0, commonCounter: 0 },
  }

  await t.rejects(
    license(state),
    { message: /Failed to parse :license selector/ },
    'should throw error for parsing failures other than missing query node',
  )
})
