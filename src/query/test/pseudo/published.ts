import t from 'tap'
import type { SpecOptions } from '@vltpkg/spec/browser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/graph'
import { parse } from '../../src/parser.ts'
import {
  published,
  parseInternals,
  queueNode,
  retrieveRemoteDate,
} from '../../src/pseudo/published.ts'
import { asPostcssNodeWithChildren } from '../../src/types.ts'
import type { ParserState } from '../../src/types.ts'
import { getSemverRichGraph } from '../fixtures/graph.ts'

const specOptions = {
  registry: 'https://registry.npmjs.org',
  registries: {
    custom: 'http://example.com',
  },
} as SpecOptions

global.fetch = (async (url: string) => {
  if (url === 'https://registry.npmjs.org/h') {
    return {
      ok: false,
    }
  } else if (url === 'https://registry.npmjs.org/i') {
    throw new Error('ERR')
  } else if (url === 'https://registry.npmjs.org/c') {
    return {
      status: 404,
      ok: false,
    }
  }
  return {
    ok: true,
    json: async () => {
      switch (url) {
        case 'https://registry.npmjs.org/a': {
          return {
            time: {
              '1.0.1': '2024-01-01T11:11:11.111Z',
            },
          }
        }
        case 'https://registry.npmjs.org/b': {
          return {
            time: {
              '2.2.1': '2024-02-01T00:00:00.000Z',
            },
          }
        }
        case 'http://example.com/c': {
          return {
            time: {
              '3.4.0': '2024-03-01T00:00:00.000Z',
            },
          }
        }
        case 'https://registry.npmjs.org/d': {
          return {
            time: {
              '2.3.4': '2024-04-01T00:00:00.000Z',
            },
          }
        }
        case 'https://registry.npmjs.org/e': {
          return {
            time: {
              '120.0.0': '2024-05-01T00:00:00.000Z',
            },
          }
        }
      }
    },
  }
}) as unknown as typeof global.fetch

const getState = (query: string, graph = getSemverRichGraph()) => {
  const ast = parse(query)
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
    retries: 0,
    securityArchive: undefined,
    specOptions,
  }
  return state
}

t.test('select from published definition', async t => {
  t.capture(console, 'warn')

  await t.test('published exact time', async t => {
    const res = await published(
      getState(':published(2024-01-01T11:11:11.111Z)'),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should have expected result using exact date match',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('published exact time (quoted)', async t => {
    const res = await published(
      getState(':published("2024-01-01T11:11:11.111Z")'),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should have expected result using greater than date',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('published exact date', async t => {
    const res = await published(getState(':published(2024-01-01)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should have expected result using exact date match',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('published greater than date (quoted)', async t => {
    const res = await published(getState(':published(">2024-02-01")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['c', 'd', 'e'],
      'should have expected result using greater than date',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('published greater than date (unquoted)', async t => {
    const res = await published(getState(':published(>2024-02-01)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['c', 'd', 'e'],
      'should have expected result using unquoted greater than date',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'published greater than or equal date (quoted)',
    async t => {
      const res = await published(
        getState(':published(">=2024-02-01")'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['b', 'c', 'd', 'e'],
        'should have expected result using greater than date',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'published greater than or equal date (unquoted)',
    async t => {
      const res = await published(
        getState(':published(>=2024-02-01)'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['b', 'c', 'd', 'e'],
        'should have expected result using unquoted greater than or equal date',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('published less than date (quoted)', async t => {
    const res = await published(getState(':published("<2024-02-01")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should have expected result using less than or equal date',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('published less than date (unquoted)', async t => {
    const res = await published(getState(':published(<2024-02-01)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a'],
      'should have expected result using unquoted less than date',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test(
    'published less than or equal date (quoted)',
    async t => {
      const res = await published(
        getState(':published("<=2024-02-01")'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['a', 'b'],
        'should have expected result using less than or equal date',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'published less than or equal date (unquoted)',
    async t => {
      const res = await published(
        getState(':published(<=2024-02-01)'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['a', 'b'],
        'should have expected result using unquoted less than or equal date',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('invalid pseudo selector usage', async t => {
    await t.rejects(
      published(getState(':semver')),
      /Failed to parse :published selector/,
      'should throw an error for invalid pseudo selector usage',
    )
  })
})

t.test('parseInternals', async t => {
  await t.test('with quoted parameter', async t => {
    const ast = parse(':published(">2024-01-01")')
    const nodes = asPostcssNodeWithChildren(ast.first.first).nodes
    const internals = parseInternals(nodes)
    t.strictSame(
      internals,
      { relativeDate: '2024-01-01', comparator: '>' },
      'should correctly parse internals from published selector with quoted parameter',
    )
  })

  await t.test('with unquoted parameter', async t => {
    const ast = parse(':published(>2024-01-01)')
    const nodes = asPostcssNodeWithChildren(ast.first.first).nodes
    const internals = parseInternals(nodes)
    t.strictSame(
      internals,
      { relativeDate: '2024-01-01', comparator: '>' },
      'should correctly parse internals from published selector with unquoted parameter',
    )
  })

  await t.test(
    'with unquoted greater than or equal parameter',
    async t => {
      const ast = parse(':published(>=2024-01-01)')
      const nodes = asPostcssNodeWithChildren(ast.first.first).nodes
      const internals = parseInternals(nodes)
      t.strictSame(
        internals,
        { relativeDate: '2024-01-01', comparator: '>=' },
        'should correctly parse internals from published selector with unquoted >= parameter',
      )
    },
  )
})

t.test('retrieveRemoteDate', async t => {
  t.capture(console, 'warn')

  const missingName = {
    id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
  } as NodeLike
  t.strictSame(
    await retrieveRemoteDate(missingName, specOptions),
    undefined,
    'should return undefined if missing essential info',
  )

  await t.test('no response from registry', async t => {
    const node = {
      name: 'h',
      version: '1.0.0',
      id: joinDepIDTuple(['registry', '', 'h@1.0.0']),
    } as NodeLike
    await t.rejects(
      retrieveRemoteDate(node, specOptions),
      /Failed to fetch packument/,
      'should throw an internal error so that it may be retried',
    )
  })

  await t.test('fetch error', async t => {
    const node = {
      name: 'i',
      id: joinDepIDTuple(['registry', '', 'i@1.0.0']),
    } as NodeLike
    t.strictSame(
      await retrieveRemoteDate(node, specOptions),
      undefined,
      'should return undefined if fetch throws',
    )
  })

  await t.test('404', async t => {
    const node = {
      name: 'c',
      version: '1.0.0',
      id: joinDepIDTuple(['registry', '', 'c@1.0.0']),
    } as NodeLike
    await t.rejects(
      retrieveRemoteDate(node, specOptions),
      /Missing API/,
      'should throw an internal error that will not be retried',
    )
  })
})

t.test('queueNode', async t => {
  const missingName = {
    id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
  } as NodeLike
  t.strictSame(
    await queueNode(
      getState(':published("2024-01-01")'),
      missingName,
      '2024-01-01',
      undefined,
    ),
    missingName,
    'should return node if missing essential info',
  )
})
