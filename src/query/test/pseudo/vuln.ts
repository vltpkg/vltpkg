import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asPostcssNodeWithChildren } from '@vltpkg/dss-parser'
import { parse } from '../../src/parser.ts'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import {
  vuln,
  isVulnKind,
  asVulnKind,
  parseInternals,
} from '../../src/pseudo/vuln.ts'
import type { ParserState } from '../../src/types.ts'

t.test('selects packages with vulnerability alerts', async t => {
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
            joinDepIDTuple(['registry', '', 'a@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
              alerts: [{ type: 'criticalCVE' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'b@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'b@1.0.0']),
              alerts: [{ type: 'cve' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'c@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'c@1.0.0']),
              alerts: [{ type: 'potentialVulnerability' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'd@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'd@1.0.0']),
              alerts: [{ type: 'mildCVE' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'e@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'e@1.0.0']),
              alerts: [{ type: 'gptSecurity' }],
            },
          ],
          [
            joinDepIDTuple(['registry', '', 'f@1.0.0']),
            {
              id: joinDepIDTuple(['registry', '', 'f@1.0.0']),
              alerts: [{ type: 'gptAnomaly' }],
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
    'filter out any node that does not have the vuln alert',
    async t => {
      const res = await vuln(getState(':vuln("critical")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['a'],
        'should select only packages with the specified vuln alert',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('filter using numbered param', async t => {
    const res = await vuln(getState(':vuln(0)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should select only packages with the specified vuln alert',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('filter out using unquoted param', async t => {
    const res = await vuln(getState(':vuln(high)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['b'],
      'should select only packages with the specified vuln alert',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'medium matches both potentialVulnerability and gptSecurity',
    async t => {
      const res = await vuln(getState(':vuln(medium)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['c', 'e'],
        'should select packages with potentialVulnerability or gptSecurity',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('low matches both mildCVE and gptAnomaly', async t => {
    const res = await vuln(getState(':vuln(low)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['d', 'f'],
      'should select packages with mildCVE or gptAnomaly',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name).sort(),
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test(
    'greater than comparator with number (unquoted)',
    async t => {
      const res = await vuln(getState(':vuln(>1)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['c', 'd', 'e', 'f'],
        'should select packages with vuln kind greater than 1',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'greater than comparator with string kind (quoted)',
    async t => {
      const res = await vuln(getState(':vuln(">high")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['c', 'd', 'e', 'f'],
        'should select packages with vuln kind greater than high',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'less than comparator with number (unquoted)',
    async t => {
      const res = await vuln(getState(':vuln(<2)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b'],
        'should select packages with vuln kind less than 2',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'less than comparator with string kind (quoted)',
    async t => {
      const res = await vuln(getState(':vuln("<medium")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b'],
        'should select packages with vuln kind less than medium',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'greater than or equal to comparator with number (unquoted)',
    async t => {
      const res = await vuln(getState(':vuln(>=2)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['c', 'd', 'e', 'f'],
        'should select packages with vuln kind greater than or equal to 2',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'greater than or equal to comparator with string kind (quoted)',
    async t => {
      const res = await vuln(getState(':vuln(">=medium")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['c', 'd', 'e', 'f'],
        'should select packages with vuln kind greater than or equal to medium',
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
      const res = await vuln(getState(':vuln(<=1)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b'],
        'should select packages with vuln kind less than or equal to 1',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'less than or equal to comparator with string kind (quoted)',
    async t => {
      const res = await vuln(getState(':vuln("<=high")'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b'],
        'should select packages with vuln kind less than or equal to high',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'parameterless :vuln matches medium+ severity',
    async t => {
      const res = await vuln(getState(':vuln'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b', 'c', 'e'],
        'should select packages with vuln severity >= medium (exclude low)',
      )
      // Verify that packages d (mildCVE) and f (gptAnomaly) are excluded
      t.notOk(
        [...res.partial.nodes].some(n => n.name === 'd'),
        'should exclude package d with mildCVE (low severity)',
      )
      t.notOk(
        [...res.partial.nodes].some(n => n.name === 'f'),
        'should exclude package f with gptAnomaly (low severity)',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('wrong parameter', async t => {
    await t.rejects(
      vuln(getState(':vuln("")')),
      { message: /Failed to parse :vuln selector/ },
      'should throw an error',
    )
  })

  await t.test('invalid comparison value', async t => {
    await t.rejects(
      vuln(getState(':vuln(>invalid)')),
      { message: /Failed to parse :vuln selector/ },
      'should throw an error for invalid comparison value',
    )
  })

  await t.test('out of range number', async t => {
    await t.rejects(
      vuln(getState(':vuln(>5)')),
      { message: /Failed to parse :vuln selector/ },
      'should throw an error for out of range number',
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
    vuln(getState(':vuln(critical)')),
    { message: /Missing security archive/ },
    'should throw an error',
  )
})

t.test('isVulnKind', async t => {
  t.ok(
    isVulnKind('critical'),
    'should return true for valid vuln kinds',
  )
  t.notOk(
    isVulnKind('invalid'),
    'should return false for invalid vuln kinds',
  )
})

t.test('asVulnKind', async t => {
  t.equal(
    asVulnKind('critical'),
    'critical',
    'should return the vuln kind',
  )
  t.throws(
    () => asVulnKind('invalid'),
    { message: /Expected a valid vuln kind/ },
    'should throw an error for invalid vuln kinds',
  )
})

t.test('parseInternals', async t => {
  const testParseInternals = (query: string) => {
    const ast = parse(query)
    const nodes = asPostcssNodeWithChildren(ast.first.first).nodes
    return parseInternals(nodes)
  }

  t.strictSame(
    parseInternals([]),
    { kind: undefined, comparator: undefined },
    'should handle empty nodes array (parameterless :vuln)',
  )

  // Test case for selector node exists but has no child nodes
  t.strictSame(
    parseInternals([{ type: 'selector', nodes: [] } as any]),
    { kind: undefined, comparator: undefined },
    'should handle selector node with empty nodes array',
  )

  t.strictSame(
    testParseInternals(':vuln(critical)'),
    { kind: 'critical', comparator: undefined },
    'should parse simple kind without comparator',
  )

  t.strictSame(
    testParseInternals(':vuln(">1")'),
    { kind: '1', comparator: '>' },
    'should parse kind with greater than comparator',
  )

  t.strictSame(
    testParseInternals(':vuln(<low)'),
    { kind: 'low', comparator: '<' },
    'should parse kind with less than comparator',
  )

  t.strictSame(
    testParseInternals(':vuln(">=medium")'),
    { kind: 'medium', comparator: '>=' },
    'should parse kind with greater than or equal comparator',
  )

  t.strictSame(
    testParseInternals(':vuln(<=2)'),
    { kind: '2', comparator: '<=' },
    'should parse kind with less than or equal comparator',
  )

  t.throws(
    () => testParseInternals(':vuln(>invalid)'),
    {
      message: /Expected a valid vuln kind or number between 0-3/,
    },
    'should throw for invalid kind with comparator',
  )

  t.throws(
    () => testParseInternals(':vuln(>4)'),
    {
      message: /Expected a valid vuln kind or number between 0-3/,
    },
    'should throw for out of range number with comparator',
  )
})
