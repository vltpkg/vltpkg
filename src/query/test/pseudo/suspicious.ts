import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import { suspicious } from '../../src/pseudo/suspicious.ts'

t.test('selects packages with a suspicious alert', async t => {
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
          { alerts: [{ type: 'suspiciousStarActivity' }] },
        ],
      ]) as SecurityArchiveLike,
      specOptions: {},
    }
    return state
  }

  await t.test(
    'filter out any node that does not have the alert',
    async t => {
      const res = await suspicious(getState(':suspicious'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['e'],
        'should select only suspicious packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )
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
    suspicious(getState(':suspicious')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})
