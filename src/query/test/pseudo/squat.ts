import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asPostcssNodeWithChildren, parse } from '@vltpkg/dss-parser'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import {
  squat,
  isSquatKind,
  asSquatKind,
  parseInternals,
} from '../../src/pseudo/squat.ts'
import type { ParserState } from '../../src/types.ts'

t.test('selects packages with a specific squat kind', async t => {
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
      securityArchive: asSecurityArchiveLike(
        new Map([
          [
            joinDepIDTuple(['registry', '', 'e@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'e@1.0.0']),
              alerts: [{ type: 'didYouMean' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'f@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'f@1.0.0']),
              alerts: [{ type: 'gptDidYouMean' }],
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

  await t.test(
    'filter out any node that does not have the squat alert',
    async t => {
      const res = await squat(getState(':squat("critical")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['e'],
        'should select only packages with the specified squat alert',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('filter out using unquoted param', async t => {
    const res = await squat(getState(':squat(medium)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['f'],
      'should select only packages with the specified squat alert',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('filter using numbered param', async t => {
    const res = await squat(getState(':squat(0)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['e'],
      'should select only packages with the specified squat alert',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'greater than comparator with number (unquoted)',
    async t => {
      const res = await squat(getState(':squat(>0)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['f'],
        'should select packages with squat greater than critical/0',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'less than comparator with number (quoted)',
    async t => {
      const res = await squat(getState(':squat("<2")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['e'],
        'should select packages with squat less than medium/2',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'greater than or equal to comparator with number (quoted)',
    async t => {
      const res = await squat(getState(':squat(">=2")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['f'],
        'should select packages with squat greater than or equal to medium/2',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'greater than or equal to comparator - exact match (unquoted)',
    async t => {
      const res = await squat(getState(':squat(>=0)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['e', 'f'],
        'should select packages with squat greater than or equal to critical/0 (including exact matches)',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'less than or equal to comparator with number (unquoted)',
    async t => {
      const res = await squat(getState(':squat(<=0)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['e'],
        'should select packages with squat less than or equal to critical/0',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'less than or equal to comparator - exact match (quoted)',
    async t => {
      const res = await squat(getState(':squat("<=2")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['e', 'f'],
        'should select packages with squat less than or equal to medium/2 (including exact matches)',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('empty alerts array', async t => {
    const getCustomState = (
      query: string,
      graph = getSimpleGraph(),
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
        securityArchive: asSecurityArchiveLike(
          new Map([
            [
              joinDepIDTuple(['registry', '', 'e@1.0.0']),
              {
                id: joinDepIDTuple(['registry', '', 'e@1.0.0']),
                alerts: [{ type: 'didYouMean' }],
              },
            ],
            [
              joinDepIDTuple(['registry', '', 'f@1.0.0']),
              {
                id: joinDepIDTuple(['registry', '', 'f@1.0.0']),
                alerts: [{ type: 'gptDidYouMean' }],
              },
            ],
            [
              joinDepIDTuple(['registry', '', 'c@1.0.0']),
              {
                id: joinDepIDTuple(['registry', '', 'c@1.0.0']),
                alerts: [], // Empty alerts array
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

    const res = await squat(getCustomState(':squat(>0)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['f'],
      'should exclude nodes with empty alerts array',
    )
  })

  await t.test('node with unknown alert type', async t => {
    const getCustomState = (
      query: string,
      graph = getSimpleGraph(),
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
        securityArchive: asSecurityArchiveLike(
          new Map([
            [
              joinDepIDTuple(['registry', '', 'e@1.0.0']),
              {
                id: joinDepIDTuple(['registry', '', 'e@1.0.0']),
                alerts: [{ type: 'didYouMean' }],
              },
            ],
            [
              joinDepIDTuple(['registry', '', 'f@1.0.0']),
              {
                id: joinDepIDTuple(['registry', '', 'f@1.0.0']),
                alerts: [{ type: 'gptDidYouMean' }],
              },
            ],
            [
              joinDepIDTuple(['registry', '', 'c@1.0.0']),
              {
                id: joinDepIDTuple(['registry', '', 'c@1.0.0']),
                // Use an unknown alert type that won't have a matching level
                alerts: [{ type: 'unknownAlertType' }],
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

    const res = await squat(getCustomState(':squat(>0)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['f'],
      'should exclude nodes with unknown alert types',
    )
  })

  await t.test('wrong parameter', async t => {
    await t.rejects(
      squat(getState(':squat')),
      { message: /Failed to parse :squat selector/ },
      'should throw an error',
    )
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
      securityArchive: undefined,
      importers: new Set(),
      retries: 0,
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.rejects(
    squat(getState(':squat(critical)')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})

t.test('isSquatKind', async t => {
  t.ok(
    isSquatKind('critical'),
    'should return true for valid squat kinds',
  )
  t.notOk(
    isSquatKind('invalid'),
    'should return false for invalid squat kinds',
  )
})

t.test('asSquatKind', async t => {
  t.equal(
    asSquatKind('critical'),
    'critical',
    'should return the squat kind',
  )
  t.throws(
    () => asSquatKind('invalid'),
    { message: /Expected a valid squat kind/ },
    'should throw an error for invalid squat kinds',
  )
})

t.test('parseInternals', async t => {
  const testParseInternals = (query: string) => {
    const ast = parse(query)
    return parseInternals(
      asPostcssNodeWithChildren(ast.first.first).nodes,
    )
  }

  t.strictSame(
    testParseInternals(':squat(critical)'),
    { kind: 'critical', comparator: undefined },
    'should parse exact squat kind',
  )

  t.strictSame(
    testParseInternals(':squat(>medium)'),
    { kind: 'medium', comparator: '>' },
    'should parse squat kind with > comparator',
  )

  t.strictSame(
    testParseInternals(':squat(<critical)'),
    { kind: 'critical', comparator: '<' },
    'should parse squat kind with < comparator',
  )

  t.strictSame(
    testParseInternals(':squat(>=2)'),
    { kind: '2', comparator: '>=' },
    'should parse squat kind with >= comparator',
  )

  t.strictSame(
    testParseInternals(':squat(<=0)'),
    { kind: '0', comparator: '<=' },
    'should parse squat kind with <= comparator',
  )

  t.throws(
    () => testParseInternals(':squat'),
    /Expected a query node/,
    'should throw for missing parameter',
  )

  t.throws(
    () => testParseInternals(':squat(>invalid)'),
    {
      message: /Expected a valid squat kind for comparison/,
    },
    'should throw for invalid kind with comparator',
  )

  t.throws(
    () => testParseInternals(':squat(>3)'),
    {
      message: /Expected a valid squat kind for comparison/,
    },
    'should throw for out of range number with comparator',
  )
})
