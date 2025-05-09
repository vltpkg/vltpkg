import t from 'tap'
import type { SpecOptions } from '@vltpkg/spec/browser'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { NodeLike } from '@vltpkg/graph'
import {
  outdated,
  parseInternals,
  queueNode,
  retrieveRemoteVersions,
} from '../../src/pseudo/outdated.ts'
import { asPostcssNodeWithChildren } from '../../src/types.ts'
import type { ParserState } from '../../src/types.ts'
import {
  getSemverRichGraph,
  getSimpleGraph,
} from '../fixtures/graph.ts'
import { parse } from '../../src/parser.ts'

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
            versions: {
              '1.0.0': {},
              '2.0.0': {},
              '3.0.0': {},
            },
          }
        }
        case 'https://registry.npmjs.org/b': {
          return {
            versions: {
              '1.0.0': {},
              '2.0.0': {},
              '2.1.0': {},
              '2.2.0': {},
            },
          }
        }
        case 'http://example.com/c': {
          return {
            versions: {
              '3.0.0': {},
              '3.4.0': {},
              '4.0.0': {},
              '5.0.0': {},
            },
          }
        }
        case 'https://registry.npmjs.org/d': {
          return {
            versions: {
              '1.0.0': {},
              '1.2.0': {},
              '2.3.4': {},
              '2.3.5': {},
            },
          }
        }
        case 'https://registry.npmjs.org/e': {
          return {
            versions: {
              '120.0.0': {},
              '120.1.0': {},
              '121.0.0': {},
              '122.0.0': {},
            },
          }
        }
        case 'https://registry.npmjs.org/f': {
          return {
            versions: {
              '4.0.0': {},
              '4.5.6': {},
            },
          }
        }
        case 'https://registry.npmjs.org/g': {
          return {
            versions: {
              '1.2.3-rc.1+rev.1': {},
              '1.2.3-rc.1+rev.2': {},
              '1.2.3-rc.2+rev.3': {},
              '1.2.3-rc.3+rev.4': {},
            },
          }
        }
      }
    },
  }
}) as unknown as typeof global.fetch

const getState = (query: string, graph = getSemverRichGraph()) => {
  const ast = parse(query)
  const current = asPostcssNodeWithChildren(ast.first.first)
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
    retries: 0,
    securityArchive: undefined,
    specOptions,
    signal: new AbortController().signal,
  }
  return state
}

t.test('select from outdated definition', async t => {
  await t.test('outdated as an element', async t => {
    const res = await outdated(getState(':outdated'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'c', 'd', 'e', 'g', 'e'],
      'should have expected result using outdated defaulting to "any"',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('outdated kind any', async t => {
    const res = await outdated(getState(':outdated(any)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'c', 'd', 'e', 'g', 'e'],
      'should have expected result using outdated kind "any"',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('outdated kind major', async t => {
    const res = await outdated(getState(':outdated(major)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'c', 'e', 'e'],
      'should have expected result using outdated kind "major"',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('outdated kind minor', async t => {
    const res = await outdated(getState(':outdated("minor")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['e'],
      'should have expected result using outdated kind "minor"',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('outdated kind patch', async t => {
    const res = await outdated(getState(':outdated("patch")'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['d'],
      'should have expected result using outdated kind "patch"',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('outdated kind in-range', async t => {
    const res = await outdated(getState(':outdated(in-range)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['c', 'e'],
      'should have expected result using outdated kind "in-range"',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('outdated kind out-of-range', async t => {
    const res = await outdated(getState(':outdated(out-of-range)'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'd', 'g', 'e'],
      'should have expected result using outdated kind "out-of-range"',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('invalid pseudo selector usage', async t => {
    await t.rejects(
      outdated(getState(':outdated(foo)')),
      /Failed to parse :outdated selector/,
      'should throw an error for invalid pseudo selector usage',
    )
  })

  await t.test('missing package response', async t => {
    const log = t.capture(console, 'warn').args
    const res = await outdated(
      getState(':outdated(any)', getSimpleGraph()),
    )
    // mind this is a different graph that is being asserted,
    // as manifests differs so are the results here
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['a', 'b', 'e', 'f'],
      'should have expected results still',
    )
    t.matchSnapshot(
      log(),
      'should log a warning for missing package response',
    )
  })
})

t.test('parseInternals', async t => {
  const ast = parse(':outdated(any)')
  const nodes = asPostcssNodeWithChildren(ast.first.first).nodes
  const internals = parseInternals(nodes)
  t.strictSame(
    internals,
    { kind: 'any' },
    'should correctly parse internals from outdated selector',
  )
})

t.test('invalid outdated kind', async t => {
  const ast = parse(':outdated(unsupported)')
  const nodes = asPostcssNodeWithChildren(ast.first.first).nodes
  t.throws(
    () => parseInternals(nodes),
    /Expected a valid outdated kind/,
    'should throw an error for invalid outdated kind',
  )
})

t.test('retrieveRemoveVersions', async t => {
  t.capture(console, 'warn')

  const missingName = {
    id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
  } as NodeLike
  t.strictSame(
    await retrieveRemoteVersions(missingName, specOptions),
    [],
    'should return an empty array if missing essential info',
  )

  await t.test('no response from registry', async t => {
    const missingName = {
      name: 'h',
      id: joinDepIDTuple(['registry', '', 'h@1.0.0']),
    } as NodeLike
    await t.rejects(
      retrieveRemoteVersions(missingName, specOptions),
      /Failed to fetch packument/,
      'should throw an internal error so that it may be retried',
    )
  })

  await t.test('fetch error', async t => {
    const missingName = {
      name: 'i',
      id: joinDepIDTuple(['registry', '', 'i@1.0.0']),
    } as NodeLike
    await t.rejects(
      retrieveRemoteVersions(missingName, specOptions),
      /ERR/,
      'should throw the original error that will be retried',
    )
  })
})

t.test('queueNode', async t => {
  const missingName = {
    id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
  } as NodeLike
  t.strictSame(
    await queueNode(getState(':outdated(any)'), missingName, 'any'),
    missingName,
    'should return an empty array if missing essential info',
  )
})
