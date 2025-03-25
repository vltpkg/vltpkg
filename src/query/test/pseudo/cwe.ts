import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import type { PackageReportData } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import { cwe } from '../../src/pseudo/cwe.ts'

t.test('selects packages with a CWE alert', async t => {
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
              id: 'e@1.0.0',
              author: [],
              size: 0,
              type: 'npm',
              name: 'e',
              version: '1.0.0',
              license: 'MIT',
              alerts: [
                {
                  key: '12314320948130',
                  type: 'cve',
                  severity: 'high',
                  category: 'security',
                  props: {
                    lastPublish: '2023-01-01',
                    cveId: 'CVE-2023-1234' as const,
                    cwes: [
                      { id: 'CWE-79' as const },
                      { id: 'CWE-89' as const },
                    ],
                  },
                },
              ],
            } as PackageReportData,
          ],
        ]),
      ),
      specOptions: {},
    }
    return state
  }

  await t.test(
    'filter out any node that does not have the alert',
    async t => {
      const res = await cwe(getState(':cwe(CWE-79)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['e'],
        'should select only packages with matching CWE ID',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('should not match an unseen CWE ID', async t => {
    const res = await cwe(getState(':cwe(CWE-123)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should not select any packages when CWE ID does not match',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'filter out any node that does not match the quoted CWE ID',
    async t => {
      const res = await cwe(getState(':cwe("CWE-89")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['e'],
        'should select only packages with matching CWE ID',
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
    cwe(getState(':cwe(CWE-79)')),
    /Missing security archive/,
    'should throw an error',
  )
})

t.test('missing CWE ID', async t => {
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
      securityArchive: asSecurityArchiveLike(new Map()),
      specOptions: {},
    }
    return state
  }

  await t.rejects(
    cwe(getState(':cwe()')),
    /Failed to parse :cwe selector/,
    'should throw an error',
  )
})
