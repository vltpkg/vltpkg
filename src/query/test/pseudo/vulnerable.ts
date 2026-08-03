import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import { parse } from '../../src/parser.ts'
import { vuln } from '../../src/pseudo/vuln.ts'

t.test(':vulnerable alias works the same as :vuln', async t => {
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
            joinDepIDTuple(['registry', '', 'a@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
              alerts: [{ type: 'potentialVulnerability' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'c@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'c@1.0.0']),
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

  await t.test(
    'parameterless :vulnerable matches severity >= medium',
    async t => {
      const res = await vuln(getState(':vulnerable'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'e'],
        'should select packages with vuln severity >= medium',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    ':vulnerable(critical) matches same as :vuln(critical)',
    async t => {
      const resVulnerable = await vuln(
        getState(':vulnerable(critical)'),
      )
      const resVuln = await vuln(getState(':vuln(critical)'))
      t.strictSame(
        [...resVulnerable.partial.nodes].map(n => n.name).sort(),
        [...resVuln.partial.nodes].map(n => n.name).sort(),
        'alias :vulnerable(critical) should produce identical results to :vuln(critical)',
      )
    },
  )
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
    vuln(getState(':vulnerable')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})
