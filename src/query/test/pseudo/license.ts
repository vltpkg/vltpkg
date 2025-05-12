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
      specOptions: {},
      signal: new AbortController().signal,
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

  await t.test('wrong parameter', async t => {
    await t.rejects(
      license(getState(':license')),
      { message: /Failed to parse :license selector/ },
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
      retries: 0,
      securityArchive: undefined,
      specOptions: {},
      signal: new AbortController().signal,
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
