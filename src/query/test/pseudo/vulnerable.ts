import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import { parse } from '../../src/parser.ts'
import { vulnerable } from '../../src/pseudo/vulnerable.ts'

t.test('selects packages with any CVE', async t => {
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
              alerts: [
                {
                  type: 'socketUpstreamVulnerability',
                  severity: 'high' as const,
                  category: 'vulnerability',
                  key: 'some-key',
                  props: {
                    lastPublish: '',
                    cveId: 'CVE-2023-1234' as const,
                  },
                },
              ],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'c@1.0.0']),
            {
              alerts: [
                {
                  type: 'deprecated',
                  severity: 'low' as const,
                  category: 'maintenance',
                  key: 'some-key-2',
                },
              ],
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

  await t.test('filter out nodes without CVE alerts', async t => {
    const res = await vulnerable(getState(':vulnerable'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['e'],
      'should select only packages with CVEs',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('vuln alias works the same way', async t => {
    const res = await vulnerable(getState(':vuln'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['e'],
      'should select only packages with CVEs',
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
    vulnerable(getState(':vulnerable')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})
