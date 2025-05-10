import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import {
  severity,
  isSeverityKind,
  asSeverityKind,
  parseInternals,
} from '../../src/pseudo/severity.ts'
import { parse } from '../../src/parser.ts'
import { asPostcssNodeWithChildren } from '../../src/types.ts'

t.test('selects packages with a specific severity kind', async t => {
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
              alerts: [{ type: 'criticalCVE' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'f@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'f@1.0.0']),
              alerts: [{ type: 'cve' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'a@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
              alerts: [{ type: 'potentialVulnerability' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'b@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'b@1.0.0']),
              alerts: [{ type: 'mildCVE' }],
            },
          ],
        ]),
      ),
      specOptions: {},
      retries: 0,
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test(
    'filter out any node that does not have the severity alert',
    async t => {
      const res = await severity(getState(':severity("critical")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['e'],
        'should select only packages with the specified severity alert',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('filter using numbered param', async t => {
    const res = await severity(getState(':severity(0)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['e'],
      'should select only packages with the specified severity alert',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('filter out using unquoted param', async t => {
    const res = await severity(getState(':severity(high)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['f'],
      'should select only packages with the specified severity alert',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'greater than comparator with number (unquoted)',
    async t => {
      const res = await severity(getState(':severity(>1)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b'],
        'should select packages with severity greater than high/1',
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
      const res = await severity(getState(':severity("<2")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['e', 'f'],
        'should select packages with severity less than medium/2',
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
      const res = await severity(getState(':severity(">=2")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b'],
        'should select packages with severity greater than or equal to medium/2',
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
      const res = await severity(getState(':severity(<=1)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['e', 'f'],
        'should select packages with severity less than or equal to high/1',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('wrong parameter', async t => {
    await t.rejects(
      severity(getState(':severity')),
      { message: /Failed to parse :severity selector/ },
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
      specOptions: {},
      retries: 0,
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.rejects(
    severity(getState(':severity(critical)')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})

t.test('isSeverityKind', async t => {
  t.ok(
    isSeverityKind('critical'),
    'should return true for valid severity kinds',
  )
  t.notOk(
    isSeverityKind('invalid'),
    'should return false for invalid severity kinds',
  )
})

t.test('asSeverityKind', async t => {
  t.equal(
    asSeverityKind('critical'),
    'critical',
    'should return the severity kind',
  )
  t.throws(
    () => asSeverityKind('invalid'),
    { message: /Expected a valid severity kind/ },
    'should throw an error for invalid severity kinds',
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
    testParseInternals(':severity(critical)'),
    { kind: 'critical', comparator: undefined },
    'should parse exact severity kind',
  )

  t.strictSame(
    testParseInternals(':severity(>medium)'),
    { kind: 'medium', comparator: '>' },
    'should parse severity kind with > comparator',
  )

  t.strictSame(
    testParseInternals(':severity(<high)'),
    { kind: 'high', comparator: '<' },
    'should parse severity kind with < comparator',
  )

  t.strictSame(
    testParseInternals(':severity(>=2)'),
    { kind: '2', comparator: '>=' },
    'should parse severity kind with >= comparator',
  )

  t.strictSame(
    testParseInternals(':severity(<=low)'),
    { kind: 'low', comparator: '<=' },
    'should parse severity kind with <= comparator',
  )

  t.throws(
    () => testParseInternals(':severity'),
    { message: /Missing severity kind parameter/ },
    'should throw for missing parameter',
  )

  t.throws(
    () => testParseInternals(':severity(>invalid)'),
    {
      message: /Expected a valid severity kind or number between 0-3/,
    },
    'should throw for invalid kind with comparator',
  )

  t.throws(
    () => testParseInternals(':severity(>4)'),
    {
      message: /Expected a valid severity kind or number between 0-3/,
    },
    'should throw for out of range number with comparator',
  )
})
