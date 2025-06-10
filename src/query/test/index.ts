import t from 'tap'
import { Query, walk } from '../src/index.ts'
import {
  getCycleGraph,
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from './fixtures/graph.ts'
import { copyGraphSelectionState } from './fixtures/selector.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import {
  asPackageReportData,
  asSecurityArchiveLike,
} from '@vltpkg/security-archive'
import type {
  ParsedSelectorToken,
  ParserState,
  QueryResponse,
} from '../src/types.ts'
import type { PostcssNode } from '@vltpkg/dss-parser'

type TestCase = [string, string[]]

const specOptions = {
  registry: 'https://registry.npmjs.org',
  registries: {
    custom: 'http://example.com',
  },
}

// Create a mock search options for tests
const mockSearchOptions = {
  signal: { throwIfAborted: () => {} } as AbortSignal,
  scopeIDs: [joinDepIDTuple(['file', '.'])],
}

const testBrokenState = (): ParserState => {
  const graph = getSimpleGraph()
  const initial = {
    nodes: new Set(graph.nodes.values()),
    edges: new Set(graph.edges.values()),
  }
  const state: ParserState = {
    cancellable: async () => {},
    collect: {
      nodes: new Set(),
      edges: new Set(),
    },
    comment: '',
    current: { type: 'bork' } as unknown as PostcssNode,
    initial: copyGraphSelectionState(initial),
    partial: copyGraphSelectionState(initial),
    walk,
    retries: 0,
    scopeIDs: mockSearchOptions.scopeIDs,
    securityArchive: undefined,
    signal: mockSearchOptions.signal,
    specOptions,
    specificity: { idCounter: 0, commonCounter: 0 },
  }
  return state
}

t.test('simple graph', async t => {
  const graph = getSimpleGraph()
  const queryToExpected = new Set<TestCase>([
    ['', []], // should match no deps on missing query
    ['*', ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // universal
    ['*', ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // repeat, cache-hit
    ['* >*', ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // dependencies
    [':root', ['my-project']], // select :root
    [':root > *', ['a', 'b', 'e', '@x/y']], // direct deps of :root
    [':root > :root', ['my-project']], // :root always places a ref to root
    [':dev', ['b', '@x/y']], // retrieve deps of dev type
    [':root > :dev', ['b', '@x/y']], // mixed with a combinator
    [':root > :dev[name=b]', ['b']], // specific node
    [':root > [name=b]:dev', ['b']], // specific node backwards
    [':root > *[name=b]:dev', ['b']], // specific node backwards with universal
    [':root > :dev[name=b] ~ *', ['a', 'e', '@x/y']], // retrieves its siblings
    [':root > :optional', []], // no direct optional dep
    [':root :optional', ['f']], // optional descendent found
    [':root *', ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // all descendents from root
    ['[name=a]', ['a']], // select by name
    [':root :has([name])', ['b', 'd']], // combined has example, filtering any descendent that has direct deps with a name
    [':root > [name=a]', ['a']], // select children by name
    [':root > [name=d] [name=b]', []], // no direct descendent with that name
    [':root > [name=d] [name=e]', []], // descendent found by name
    [':root [name=d] ~ [name=c]', ['c']], // fully qualified
    [':root [name^=@x]', ['@x/y']], // attribute starts with value
    ['/* do something */ :root [name^=@x]', ['@x/y']], // support comments
    [':root > *{&[name=a]}', ['a']], // support nesting
    [':root > * { &[name=a] }', ['a']], // support nesting with spaces
    [':root > * { &[name=a], &[name=b] }', ['a', 'b']], // support multiple nesting selectors
    ['[name=b], [name=c], [name=f]', ['b', 'c', 'f']], // select by name
    ['[name=d], [name=d] > *', ['d', 'e', 'f']], // select a package and its dependencies
    [
      ':root > *, :prod, [name=a], :has(:dev, :optional)',
      ['a', 'b', 'e', '@x/y', 'c', 'd', 'my-project'],
    ],
    ['#a', ['a']], // identifier
    ['#a:v(1)', ['a']], // matches identifier + semver
    ['#a:v(2)', []], // fails to match identifier + semver
    [':path("node_modules/**")', ['a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // path selector for all deps
    [':path("**/my-project")', ['my-project']], // path selector for root
    [':path("**/a")', ['a']], // path selector for specific package
    [':root, #a, :foo', ['my-project', 'a']], // should be loose on multiple selectors
  ])

  const query = new Query({
    graph,
    securityArchive: undefined,
    specOptions,
  })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q, mockSearchOptions)).nodes.map(
        i => i.name,
      ),
      expected,
      `query > "${q}"`,
    )
  }

  await t.test('comments extraction', async t => {
    const result = await query.search(
      '/* comment one */ :root /* comment two */ > * /* comment three */',
      mockSearchOptions,
    )
    t.strictSame(
      result.comment,
      'comment one',
      'should extract the first comment from query',
    )
  })

  await t.test('comments extraction with no comments', async t => {
    const result = await query.search(':root > *', mockSearchOptions)
    t.strictSame(
      result.comment,
      '',
      'should return empty string for query without comments',
    )
  })

  await t.test('comments cache hit', async t => {
    const q = '/* cached comment */ :root'
    await query.search(q, mockSearchOptions) // First call to populate cache
    const result = await query.search(q, mockSearchOptions) // Second call should hit cache
    t.strictSame(
      result.comment,
      'cached comment',
      'should return comment for cached query results',
    )
  })
})

t.test('workspace', async t => {
  const graph = getSingleWorkspaceGraph()
  const queryToExpected = new Map<string, string[]>([
    ['', []], // should match no deps on missing query
    ['*', ['ws', 'w']], // universal
    [':root', ['ws']], // select :root
    [':root > *', []], // direct deps of :root
    [':root > :root', ['ws']], // :root always places a ref to root
    [':project#w', ['w']], // select by project + workspace name
    ['#w:project', ['w']], // should be interchangeable
    ['/* do something */ [name^=w]', ['ws', 'w']], // support comments
  ])
  const query = new Query({
    graph,
    securityArchive: undefined,
    specOptions,
  })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q, mockSearchOptions)).nodes.map(
        i => i.name,
      ),
      expected,
      `query > "${q}"`,
    )
  }

  await t.test('comments handling', async t => {
    const result = await query.search(
      '/* workspace comment */ :root',
      mockSearchOptions,
    )
    t.strictSame(
      result.comment,
      'workspace comment',
      'should extract comment from workspace query',
    )
  })
})

t.test('cycle', async t => {
  const graph = getCycleGraph()
  const queryToExpected = new Set<TestCase>([
    ['', []], // should match no deps on missing query
    ['*', ['cycle-project', 'a', 'b']], // universal
    [':root', ['cycle-project']], // select :root
    [':root > *', ['a']], // direct deps of :root
    [':root > :root', ['cycle-project']], // :root always places a ref to root
    ['/* do something */ [name^=a]', ['a']], // support comments
    [':root > :root > :prod > *', ['b']], // mixed selectors
  ])
  const query = new Query({
    graph,
    securityArchive: undefined,
    specOptions,
  })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q, mockSearchOptions)).nodes.map(
        i => i.name,
      ),
      expected,
      `query > "${q}"`,
    )
  }
})

t.test('insights', async t => {
  const graph = getSimpleGraph()
  const queryToExpected = new Set<TestCase>([
    ['*', ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // universal
    ['*:severity(high)', ['e']], // universal with severity filter
    ['*:cve(CVE-2023-1234)', ['e']], // match cve by id
  ])
  const query = new Query({
    graph,
    securityArchive: asSecurityArchiveLike(
      new Map([
        [
          joinDepIDTuple(['registry', '', 'e@1.0.0']),
          asPackageReportData({
            id: 'e@1.0.0',
            author: [],
            size: 0,
            type: 'npm',
            name: 'e',
            version: '1.0.0',
            license: 'MIT',
            score: {
              overall: 0.5,
              security: 0.3,
              maintenance: 0.7,
              popularity: 0.6,
            },
            alerts: [
              {
                key: '12314320948130',
                type: 'cve',
                severity: 'high',
                category: 'security',
                props: {
                  cveId: 'CVE-2023-1234',
                  lastPublish: '2023-01-01',
                  cwes: [{ id: 'CWE-1234' }],
                },
              },
            ],
          }),
        ],
      ]),
    ),
    specOptions,
  })
  for (const [q, expected] of queryToExpected) {
    const result = await query.search(q, mockSearchOptions)
    t.strictSame(
      result.nodes.map(i => i.name),
      expected,
      `query > "${q}"`,
    )

    // Verify score values for node 'e'
    const nodeE = result.nodes.find(n => n.name === 'e')
    if (nodeE) {
      t.strictSame(
        nodeE.insights.score,
        {
          overall: 0.5,
          security: 0.3,
          maintenance: 0.7,
          popularity: 0.6,
        },
        'node e should have correct score values',
      )
    }
  }
})

t.test('bad selector type', async t => {
  await t.rejects(
    walk(testBrokenState()),
    /Missing parser for query node: bork/,
    'should throw a parser error',
  )
})

t.test('bad selector type [loose mode]', async t => {
  await t.resolves(
    walk({ ...testBrokenState(), loose: true }),
    'should resolve with no error',
  )
})

t.test('trying to use tag selectors', async t => {
  await t.rejects(
    new Query({
      graph: getSimpleGraph(),
      securityArchive: undefined,
      specOptions,
    }).search('foo', mockSearchOptions),
    /Unsupported selector/,
    'should throw an unsupported selector error',
  )
})

t.test('trying to use string selectors', async t => {
  await t.rejects(
    new Query({
      graph: getSimpleGraph(),
      securityArchive: undefined,
      specOptions,
    }).search('"foo"', mockSearchOptions),
    /Unsupported selector/,
    'should throw an unsupported selector error',
  )
})

t.test('cancellable search', async t => {
  const graph = getSingleWorkspaceGraph()
  const query = new Query({
    graph,
    securityArchive: undefined,
    specOptions,
  })
  const ac = new AbortController()
  const q = ':root > * > *'
  await t.rejects(
    new Promise((_, reject) => {
      void query
        .search(q, { signal: ac.signal })
        .catch((err: unknown) => {
          reject(err)
        })
      ac.abort(new Error('query aborted'))
      // the set timeout bellow should never be called since
      // the search should throw the abort error before
      setTimeout(() => {
        reject(new Error('ERR'))
      }, 1000)
    }),
    /query aborted/,
    'should reject with abort error',
  )
})

t.test('Query.hasSecuritySelectors', async t => {
  t.ok(
    Query.hasSecuritySelectors(':root > *:unmaintained'),
    'should return true',
  )
  t.ok(
    Query.hasSecuritySelectors(':root > *:has(:unmaintained)'),
    'should return true',
  )
  t.ok(
    Query.hasSecuritySelectors(':unmaintained'),
    'should return true',
  )
  t.notOk(Query.hasSecuritySelectors(':foo'), 'should return false')
  t.notOk(Query.hasSecuritySelectors(':has'), 'should return false')
})

t.test('getQueryTokens', t => {
  const normalizeParseOutput = (nodes: ParsedSelectorToken[]) => {
    return nodes.map(node => {
      return {
        type: node.type,
        token: node.token,
      }
    })
  }

  t.test('should getQueryTokens empty query', t => {
    t.strictSame(normalizeParseOutput(Query.getQueryTokens('')), [])
    t.end()
  })

  t.test('should getQueryTokens pseudo selector', t => {
    t.strictSame(
      normalizeParseOutput(Query.getQueryTokens(':root')),
      [
        {
          type: 'pseudo',
          token: ':root',
        },
      ],
    )
    t.end()
  })

  t.test('should getQueryTokens attribute selector', t => {
    t.test('with value', t => {
      t.strictSame(
        normalizeParseOutput(Query.getQueryTokens('[name="react"]')),
        [
          {
            type: 'attribute',
            token: '[name="react"]',
          },
        ],
      )
      t.end()
    })

    t.test('with operator', t => {
      t.strictSame(
        normalizeParseOutput(Query.getQueryTokens('[name^="react"]')),
        [
          {
            type: 'attribute',
            token: '[name^="react"]',
          },
        ],
      )
      t.end()
    })

    t.test('without value', t => {
      t.strictSame(
        normalizeParseOutput(Query.getQueryTokens('[name]')),
        [
          {
            type: 'attribute',
            token: '[name]',
          },
        ],
      )
      t.end()
    })
    t.end()
  })

  t.test('should getQueryTokens class selector', t => {
    t.strictSame(
      normalizeParseOutput(Query.getQueryTokens('.container')),
      [
        {
          type: 'tag',
          token: '.container',
        },
      ],
    )
    t.end()
  })

  t.test('should getQueryTokens id selector', t => {
    t.strictSame(
      normalizeParseOutput(Query.getQueryTokens('#main')),
      [
        {
          type: 'id',
          token: '#main',
        },
      ],
    )

    t.test('should getQueryTokens scoped-name id selector', t => {
      t.strictSame(
        normalizeParseOutput(Query.getQueryTokens('#@scoped/name')),
        [
          {
            type: 'id',
            token: '#@scoped/name',
          },
        ],
      )
      t.end()
    })

    t.test(
      'should getQueryTokens dash-separated-scoped-name id selector',
      t => {
        t.strictSame(
          normalizeParseOutput(
            Query.getQueryTokens('#@scoped-org/name'),
          ),
          [
            {
              type: 'id',
              token: '#@scoped-org/name',
            },
          ],
        )
        t.end()
      },
    )

    t.test(
      'should getQueryTokens dot-separated-scoped-name id selector',
      t => {
        t.strictSame(
          normalizeParseOutput(
            Query.getQueryTokens('#@scoped.org/name'),
          ),
          [
            {
              type: 'id',
              token: '#@scoped.org/name',
            },
          ],
        )
        t.end()
      },
    )
    t.end()
  })

  t.test(
    'should getQueryTokens simple comma separated selector',
    t => {
      t.strictSame(
        normalizeParseOutput(Query.getQueryTokens('#a, #b')),
        [
          {
            type: 'id',
            token: '#a',
          },
          {
            type: 'selector',
            token: ',',
          },
          {
            type: 'id',
            token: ' #b',
          },
        ],
      )
      t.end()
    },
  )

  t.test('should getQueryTokens tags', t => {
    t.strictSame(
      normalizeParseOutput(Query.getQueryTokens('name=test')),
      [
        {
          type: 'tag',
          token: 'name=test',
        },
      ],
    )
    t.end()
  })

  t.test('should getQueryTokens strings', t => {
    t.strictSame(
      normalizeParseOutput(Query.getQueryTokens('name="test"')),
      [
        {
          type: 'tag',
          token: 'name=',
        },
        {
          type: 'string',
          token: '"test"',
        },
      ],
    )
    t.end()
  })

  t.test('should getQueryTokens combinator', t => {
    t.test('non-whitespace', t => {
      t.strictSame(normalizeParseOutput(Query.getQueryTokens('>')), [
        {
          type: 'combinator',
          token: '>',
        },
      ])
      t.end()
    })

    t.test('whitespace', t => {
      t.strictSame(Query.getQueryTokens(' '), [])
      t.end()
    })
    t.end()
  })

  t.test('should getQueryTokens complex selector', t => {
    t.test('with nested selectors', t => {
      t.strictSame(
        normalizeParseOutput(
          Query.getQueryTokens(':root > [name="react"] .container'),
        ),
        [
          {
            type: 'pseudo',
            token: ':root',
          },
          {
            type: 'combinator',
            token: ' > ',
          },
          {
            type: 'attribute',
            token: '[name="react"]',
          },
          {
            type: 'combinator',
            token: ' ',
          },
          {
            type: 'tag',
            token: '.container',
          },
        ],
      )
      t.end()
    })

    t.test('with nested pseudo selectors', t => {
      t.strictSame(
        normalizeParseOutput(Query.getQueryTokens(':not(#react)')),
        [
          {
            type: 'pseudo',
            token: ':not(',
          },
          {
            type: 'id',
            token: '#react',
          },
          {
            type: 'pseudo',
            token: ')',
          },
        ],
      )
      t.test('with nested comma separated selectors', t => {
        t.strictSame(
          normalizeParseOutput(
            Query.getQueryTokens(':not(#a, #b), :is(#c)'),
          ),
          [
            {
              type: 'pseudo',
              token: ':not(',
            },
            {
              type: 'id',
              token: '#a',
            },
            {
              type: 'selector',
              token: ',',
            },
            {
              type: 'id',
              token: ' #b',
            },
            {
              type: 'pseudo',
              token: ')',
            },
            {
              type: 'selector',
              token: ',',
            },
            {
              type: 'pseudo',
              token: ' :is(',
            },
            {
              type: 'id',
              token: '#c',
            },
            {
              type: 'pseudo',
              token: ')',
            },
          ],
        )
        t.end()
      })
      t.end()
    })

    t.test('with malformed queries', t => {
      t.test('should handle unclosed brackets', t => {
        t.strictSame(
          normalizeParseOutput(Query.getQueryTokens('[name="react"')),
          [],
        )
        t.end()
      })

      t.test('should handle unclosed pseudo selectors', t => {
        t.strictSame(
          normalizeParseOutput(Query.getQueryTokens(':not(#react')),
          [
            {
              type: 'pseudo',
              token: ':not',
            },
          ],
        )
        t.end()
      })
      t.end()
    })

    t.test('with multiple attributes', t => {
      t.strictSame(
        normalizeParseOutput(
          Query.getQueryTokens('[name="react"][version="18"]'),
        ),
        [
          {
            type: 'attribute',
            token: '[name="react"]',
          },
          {
            type: 'attribute',
            token: '[version="18"]',
          },
        ],
      )
      t.end()
    })
    t.end()
  })

  t.end()
})

t.test(':scope with custom scopeIDs', async t => {
  const query = new Query({
    graph: getSimpleGraph(),
    securityArchive: undefined,
    specOptions,
  })
  const customScopeID = joinDepIDTuple(['registry', '', 'a@1.0.0'])
  t.strictSame(
    (
      await query.search(':scope', {
        ...mockSearchOptions,
        scopeIDs: [customScopeID],
      })
    ).nodes.map(n => n.name),
    ['a'],
    'should select only the node specified by scopeIDs',
  )
})

t.test('specificity calculation', async t => {
  const graph = getSimpleGraph()
  const query = new Query({
    graph,
    securityArchive: undefined,
    specOptions,
  })

  const specificityTestCases = [
    {
      query: ':root',
      idCounter: 0,
      commonCounter: 1,
      description: 'single pseudo-element',
    },
    {
      query: ':root > #b',
      idCounter: 1,
      commonCounter: 1,
      description: 'child combinator with id',
    },
    {
      query: ':root #b',
      idCounter: 1,
      commonCounter: 1,
      description: 'descendant combinator with id',
    },
    {
      query: ':root ~ #b',
      idCounter: 1,
      commonCounter: 1,
      description: 'sibling combinator with id',
    },
    {
      query: ':root > #b > #c',
      idCounter: 2,
      commonCounter: 1,
      description: 'multiple combinators with ids',
    },
    {
      query: ':root > :prod',
      idCounter: 0,
      commonCounter: 2,
      description: 'only pseudo classes',
    },
    {
      query: ':root > :prod:dev',
      idCounter: 0,
      commonCounter: 3,
      description: 'multiple pseudo classes',
    },
    {
      query: ':root > :prod:dev:optional',
      idCounter: 0,
      commonCounter: 4,
      description: 'multiple pseudo classes',
    },
    {
      query: ':root > #missing',
      idCounter: 1,
      commonCounter: 1,
      description: 'missing id still counts',
    },
    {
      query: ':root > [name=b]',
      idCounter: 0,
      commonCounter: 2,
      description: 'attribute selector',
    },
    {
      query: ':root > [name=b][version=2.0.0]',
      idCounter: 0,
      commonCounter: 3,
      description: 'multiple attribute selectors',
    },
    {
      query: ':root > :not(:prod)',
      idCounter: 0,
      commonCounter: 1,
      description: ':not does not affect specificity',
    },
    {
      query: ':root > :is(:prod, :dev)',
      idCounter: 0,
      commonCounter: 1,
      description: ':is does not affect specificity',
    },
    {
      query: ':root > :has(:prod)',
      idCounter: 0,
      commonCounter: 1,
      description: ':has does not affect specificity',
    },
    {
      query: '#b:prod',
      idCounter: 1,
      commonCounter: 1,
      description: 'id with pseudo class',
    },
    {
      query: '#b:prod[name=b]',
      idCounter: 1,
      commonCounter: 2,
      description: 'id with pseudo class and attribute',
    },
  ]

  for (const {
    query: queryStr,
    idCounter,
    commonCounter,
    description,
  } of specificityTestCases) {
    const result = await query.search(queryStr, mockSearchOptions)
    t.strictSame(
      {
        idCounter: result.specificity.idCounter,
        commonCounter: result.specificity.commonCounter,
      },
      { idCounter, commonCounter },
      `specificity for "${queryStr}" - ${description}`,
    )
  }
})

t.test('specificitySort', async t => {
  // Create test QueryResponse objects with different specificity values
  const responses: QueryResponse[] = [
    {
      edges: [],
      nodes: [],
      comment: 'First response (id:0, common:1)',
      specificity: { idCounter: 0, commonCounter: 1 },
    },
    {
      edges: [],
      nodes: [],
      comment: 'Second response (id:2, common:0)',
      specificity: { idCounter: 2, commonCounter: 0 },
    },
    {
      edges: [],
      nodes: [],
      comment: 'Third response (id:1, common:3)',
      specificity: { idCounter: 1, commonCounter: 3 },
    },
    {
      edges: [],
      nodes: [],
      comment: 'Fourth response (id:1, common:2)',
      specificity: { idCounter: 1, commonCounter: 2 },
    },
    {
      edges: [],
      nodes: [],
      comment: 'Fifth response (id:0, common:0)',
      specificity: { idCounter: 0, commonCounter: 0 },
    },
  ]

  const sortedResponses = Query.specificitySort(responses)

  // Check that the order is correct based on specificity rules
  t.strictSame(
    sortedResponses.map(r => r.comment),
    [
      'Second response (id:2, common:0)', // Highest idCounter (2)
      'Third response (id:1, common:3)', // Next idCounter (1) with higher commonCounter (3)
      'Fourth response (id:1, common:2)', // Same idCounter (1) with lower commonCounter (2)
      'First response (id:0, common:1)', // Lowest idCounter (0) with higher commonCounter (1)
      'Fifth response (id:0, common:0)', // Lowest idCounter (0) with lowest commonCounter (0)
    ],
    'should sort responses by specificity with higher values first',
  )

  // Test that the original array is not modified
  t.notSame(
    responses.map(r => r.comment),
    sortedResponses.map(r => r.comment),
    'should not modify the original array',
  )

  // Test that the sort is stable (preserves original order for equal specificity)
  const equalSpecificityResponses: QueryResponse[] = [
    {
      edges: [],
      nodes: [],
      comment: 'First equal response',
      specificity: { idCounter: 1, commonCounter: 1 },
    },
    {
      edges: [],
      nodes: [],
      comment: 'Second equal response',
      specificity: { idCounter: 1, commonCounter: 1 },
    },
    {
      edges: [],
      nodes: [],
      comment: 'Third equal response',
      specificity: { idCounter: 1, commonCounter: 1 },
    },
  ]

  const sortedEqualResponses = Query.specificitySort(
    equalSpecificityResponses,
  )

  t.strictSame(
    sortedEqualResponses.map(r => r.comment),
    [
      'First equal response',
      'Second equal response',
      'Third equal response',
    ],
    'should preserve original order for equal specificity values',
  )
})
