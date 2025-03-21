import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import {
  severity,
  isSeverityKind,
  asSeverityKind,
} from '../../src/pseudo/severity.ts'

t.test('selects packages with a specific severity kind', async t => {
  const getState = (query: string, graph = getSimpleGraph()) => {
    const ast = postcssSelectorParser().astSync(query)
    const current = ast.first.first
    const state: ParserState = {
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
      securityArchive: new Map([
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
      ]) as unknown as SecurityArchiveLike,
      specOptions: {},
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
    const ast = postcssSelectorParser().astSync(query)
    const current = ast.first.first
    const state: ParserState = {
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
