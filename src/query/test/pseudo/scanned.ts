import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import type { PackageReportData } from '@vltpkg/security-archive'
import { scanned } from '../../src/pseudo/scanned.ts'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'

t.test('scanned selector', async t => {
  const getState = () => {
    const graph = getSimpleGraph()
    const ast = postcssSelectorParser().astSync(':scanned')
    const current = ast.first.first
    const testId = joinDepIDTuple(['registry', '', 'e@1.0.0'])
    const securityArchive = asSecurityArchiveLike(
      new Map<string, PackageReportData>([
        [
          testId,
          {
            id: 'e@1.0.0',
            author: [],
            size: 0,
            type: 'npm',
            name: 'e',
            version: '1.0.0',
            license: 'MIT',
            score: {
              overall: 0,
              license: 0,
              maintenance: 0,
              quality: 0,
              supplyChain: 0,
              vulnerability: 0,
            },
            alerts: [],
          },
        ],
      ]),
    )
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
      securityArchive,
      specOptions: {},
      retries: 0,
    }
    return state
  }

  const state = getState()
  const result = await scanned(state)
  t.matchSnapshot(
    {
      nodes: [...result.partial.nodes].map(n => n.id),
      edges: [...result.partial.edges].map(
        e => `${e.from.id}->${e.to?.id}`,
      ),
    },
    'should return only nodes with security archive data available',
  )
})
