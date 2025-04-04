import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import {
  squat,
  isSquatKind,
  asSquatKind,
} from '../../src/pseudo/squat.ts'

t.test('selects packages with a specific squat kind', async t => {
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
      specOptions: {},
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
