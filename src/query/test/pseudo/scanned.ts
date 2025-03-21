import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type {
  SecurityArchiveLike,
  PackageReportData,
} from '@vltpkg/security-archive'
import { scanned } from '../../src/pseudo/scanned.ts'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'

t.test('scanned selector', async t => {
  const getState = (hasSecurityData: boolean) => {
    const graph = getSimpleGraph()
    const ast = postcssSelectorParser().astSync(':scanned')
    const current = ast.first.first
    const testId = joinDepIDTuple(['registry', '', 'e@1.0.0'])
    const securityArchive = new Map<string, PackageReportData>(
      hasSecurityData ?
        [
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
              alerts: [],
            },
          ],
        ]
      : [],
    ) as unknown as SecurityArchiveLike
    securityArchive.ok = hasSecurityData
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
    }
    return state
  }

  await t.test(
    'should throw when security archive is not available',
    async t => {
      const state = getState(false)
      await t.rejects(
        scanned(state),
        /Security report data missing/,
        'should throw when security archive is not available',
      )
    },
  )

  await t.test(
    'should return state when security archive is available',
    async t => {
      const state = getState(true)
      const result = await scanned(state)
      t.strictSame(
        result,
        state,
        'should passthrough if security archive data is available',
      )
    },
  )
})
