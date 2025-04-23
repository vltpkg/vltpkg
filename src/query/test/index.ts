import t from 'tap'
import { Query, walk } from '../src/index.ts'
import {
  getCycleGraph,
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from './fixtures/graph.ts'
import type {
  ParsedSelectorToken,
  ParserState,
  PostcssNode,
} from '../src/types.ts'
import { copyGraphSelectionState } from './fixtures/selector.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import {
  asPackageReportData,
  asSecurityArchiveLike,
} from '@vltpkg/security-archive'

type TestCase = [string, string[]]

const specOptions = {
  registry: 'https://registry.npmjs.org',
  registries: {
    custom: 'http://example.com',
  },
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
    current: { type: 'bork' } as unknown as PostcssNode,
    initial: copyGraphSelectionState(initial),
    partial: copyGraphSelectionState(initial),
    walk,
    retries: 0,
    securityArchive: undefined,
    specOptions,
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
    [':root, #a, :foo', ['my-project', 'a']], // should be loose on multiple selectors
  ])

  const query = new Query({
    graph,
    securityArchive: undefined,
    specOptions,
  })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q)).nodes.map(i => i.name),
      expected,
      `query > "${q}"`,
    )
  }
})

t.test('workspace', async t => {
  const graph = getSingleWorkspaceGraph()
  const queryToExpected = new Map<string, string[]>([
    ['', []], // should match no deps on missing query
    ['*', ['ws', 'w']], // universal
    [':root', ['ws']], // select :root
    [':root > *', []], // direct deps of :root
    [':root > :root', ['ws']], // :root always places a ref to root
    ['/* do something */ [name^=w]', ['ws', 'w']], // support comments
  ])
  const query = new Query({
    graph,
    securityArchive: undefined,
    specOptions,
  })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q)).nodes.map(i => i.name),
      expected,
      `query > "${q}"`,
    )
  }
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
      (await query.search(q)).nodes.map(i => i.name),
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
    const result = await query.search(q)
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
    }).search('foo'),
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
    }).search('"foo"'),
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
      void query.search(q, ac.signal).catch((err: unknown) => {
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
