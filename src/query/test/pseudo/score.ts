import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { asSecurityArchiveLike } from '@vltpkg/security-archive'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { ParserState } from '../../src/types.ts'
import {
  score,
  isScoreKind,
  asScoreKind,
} from '../../src/pseudo/score.ts'
import type { PackageScore } from '@vltpkg/security-archive'
import { parse } from '../../src/parser.ts'

// Create a function to generate a security archive with varied scores for testing
const createTestSecurityArchive = () => {
  // Define different scores for each package in the test graph
  const scores: Record<string, PackageScore> = {
    a: {
      overall: 0.85,
      license: 0.95,
      maintenance: 0.8,
      quality: 0.75,
      supplyChain: 0.9,
      vulnerability: 0.7,
    },
    b: {
      overall: 0.65,
      license: 0.5,
      maintenance: 0.7,
      quality: 0.6,
      supplyChain: 0.8,
      vulnerability: 0.45,
    },
    c: {
      overall: 0.4,
      license: 0.3,
      maintenance: 0.5,
      quality: 0.45,
      supplyChain: 0.35,
      vulnerability: 0.25,
    },
    d: {
      overall: 0.95,
      license: 1.0,
      maintenance: 0.9,
      quality: 0.85,
      supplyChain: 0.95,
      vulnerability: 0.9,
    },
    e: {
      overall: 0.2,
      license: 0.15,
      maintenance: 0.3,
      quality: 0.25,
      supplyChain: 0.1,
      vulnerability: 0.05,
    },
    f: {
      overall: 0.5,
      license: 0.55,
      maintenance: 0.45,
      quality: 0.5,
      supplyChain: 0.6,
      vulnerability: 0.4,
    },
  }

  // Create a map of package IDs to security data
  const securityMap = new Map()
  Object.entries(scores).forEach(([name, score]) => {
    securityMap.set(
      joinDepIDTuple(['registry', '', `${name}@1.0.0`]),
      {
        id: joinDepIDTuple(['registry', '', `${name}@1.0.0`]),
        author: [],
        size: 0,
        type: 'npm',
        name,
        version: '1.0.0',
        license: 'MIT',
        score,
        alerts: [],
      },
    )
  })

  return asSecurityArchiveLike(securityMap)
}

t.test('selects packages based on their security score', async t => {
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
      securityArchive: createTestSecurityArchive(),
      specOptions: {},
      retries: 0,
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test('exact match on overall score', async t => {
    const res = await score(getState(':score("0.85")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should select packages with exactly 0.85 overall score',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('exact match with percentage value', async t => {
    const res = await score(getState(':score(20)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['e'],
      'should select packages with exactly 0.2 (20%) overall score',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('exact match with quoted value', async t => {
    const res = await score(getState(':score("0.5")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['f'],
      'should select packages with exactly 0.5 overall score',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('greater than comparator', async t => {
    const res = await score(getState(':score(">0.8")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'd'],
      'should select packages with overall score greater than 0.8',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('greater than comparator (unquoted)', async t => {
    const res = await score(getState(':score(>0.8)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'd'],
      'should select packages with overall score greater than 0.8 using unquoted parameter',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('less than comparator', async t => {
    const res = await score(getState(':score("<0.5")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['c', 'e'],
      'should select packages with overall score less than 0.5',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('less than comparator (unquoted)', async t => {
    const res = await score(getState(':score(<0.5)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['c', 'e'],
      'should select packages with overall score less than 0.5 using unquoted parameter',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('greater than or equal comparator', async t => {
    const res = await score(getState(':score(">=0.75")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'd'],
      'should select packages with overall score greater than or equal to 0.75',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'greater than or equal comparator (unquoted)',
    async t => {
      const res = await score(getState(':score(>=0.75)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['a', 'd'],
        'should select packages with overall score greater than or equal to 0.75 using unquoted parameter',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('less than or equal comparator', async t => {
    const res = await score(getState(':score(<=40)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['c', 'e'],
      'should select packages with overall score less than or equal to 0.4 (40%)',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'less than or equal comparator (unquoted)',
    async t => {
      const res = await score(getState(':score(<=40)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['c', 'e'],
        'should select packages with overall score less than or equal to 0.4 (40%) using unquoted parameter',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('with specific kind parameter', async t => {
    const res = await score(getState(':score("0.95", license)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should select packages with license score of exactly 0.95',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'with specific kind and quoted parameters',
    async t => {
      const res = await score(
        getState(':score(">0.8", "supplyChain")'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['a', 'd'],
        'should select packages with supplyChain score greater than 0.8',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'with less than comparator and vulnerability kind',
    async t => {
      const res = await score(
        getState(':score("<0.5", vulnerability)'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['b', 'c', 'e', 'f'],
        'should select packages with vulnerability score less than 0.5',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'with percentage rate and maintenance kind',
    async t => {
      const res = await score(getState(':score(<=50, maintenance)'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['c', 'e', 'f'],
        'should select packages with maintenance score less than or equal to 0.5 (50%)',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('exact match with perfect score', async t => {
    const res = await score(getState(':score(1, license)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['d'],
      'should select packages with license score of exactly 1.0',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })
})

t.test('error cases', async t => {
  // Test with missing security archive
  await t.test('missing security archive', async t => {
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
        specOptions: {},
        retries: 0,
        signal: new AbortController().signal,
        specificity: { idCounter: 0, commonCounter: 0 },
      }
      return state
    }

    await t.rejects(
      score(getState(':score(0.8)')),
      { message: /Missing security archive/ },
      'should throw an error when security archive is missing',
    )
  })

  // Test with invalid rate value
  await t.test('invalid rate value - too high', async t => {
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
        securityArchive: createTestSecurityArchive(),
        specOptions: {},
        retries: 0,
        signal: new AbortController().signal,
        specificity: { idCounter: 0, commonCounter: 0 },
      }
      return state
    }

    await t.rejects(
      score(getState(':score(101)')),
      { message: /Failed to parse :score selector/ },
      'should throw an error when rate value is greater than 100',
    )
  })

  // Test with invalid rate value - negative
  await t.test('invalid rate value - negative', async t => {
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
        securityArchive: createTestSecurityArchive(),
        specOptions: {},
        retries: 0,
        signal: new AbortController().signal,
        specificity: { idCounter: 0, commonCounter: 0 },
      }
      return state
    }

    await t.rejects(
      score(getState(':score("-0.5")')),
      { message: /Failed to parse :score selector/ },
      'should throw an error when rate value is negative',
    )
  })

  // Test with invalid kind
  await t.test('invalid kind parameter', async t => {
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
        securityArchive: createTestSecurityArchive(),
        specOptions: {},
        retries: 0,
        signal: new AbortController().signal,
        specificity: { idCounter: 0, commonCounter: 0 },
      }
      return state
    }

    await t.rejects(
      score(getState(':score(0.8, invalid)')),
      { message: /Failed to parse :score selector/ },
      'should throw an error when kind parameter is invalid',
    )
  })
})

t.test('utility functions', async t => {
  // Test isScoreKind function
  await t.test('isScoreKind', async t => {
    t.ok(
      isScoreKind('overall'),
      'should return true for valid score kind "overall"',
    )
    t.ok(
      isScoreKind('license'),
      'should return true for valid score kind "license"',
    )
    t.ok(
      isScoreKind('maintenance'),
      'should return true for valid score kind "maintenance"',
    )
    t.ok(
      isScoreKind('quality'),
      'should return true for valid score kind "quality"',
    )
    t.ok(
      isScoreKind('supplyChain'),
      'should return true for valid score kind "supplyChain"',
    )
    t.ok(
      isScoreKind('vulnerability'),
      'should return true for valid score kind "vulnerability"',
    )
    t.notOk(
      isScoreKind('invalid'),
      'should return false for invalid score kind',
    )
  })

  // Test asScoreKind function
  await t.test('asScoreKind', async t => {
    t.equal(
      asScoreKind('overall'),
      'overall',
      'should return the score kind for valid input',
    )
    t.throws(
      () => asScoreKind('invalid'),
      { message: /Expected a valid score kind/ },
      'should throw an error for invalid score kind',
    )
  })
})
