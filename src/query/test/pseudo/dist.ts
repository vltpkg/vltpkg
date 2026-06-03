import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { parse, asPostcssNodeWithChildren } from '@vltpkg/dss-parser'
import {
  dist,
  queueNode,
  retrieveDistTags,
} from '../../src/pseudo/dist.ts'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { NodeLike } from '@vltpkg/types'
import type { ParserState } from '../../src/types.ts'

global.fetch = (async (url: string) => {
  if (url === 'https://registry.npmjs.org/c') {
    return {
      status: 404,
      ok: false,
    }
  } else if (url === 'https://registry.npmjs.org/d') {
    return {
      ok: false,
    }
  } else if (url === 'https://registry.npmjs.org/e') {
    throw new Error('ERR')
  }
  return {
    ok: true,
    json: async () => {
      switch (url) {
        case 'https://registry.npmjs.org/a': {
          return {
            'dist-tags': {
              latest: '1.0.0',
              nightly: '2.0.0',
            },
          }
        }
        case 'https://registry.npmjs.org/b': {
          return {
            'dist-tags': {
              latest: '2.0.0',
              beta: '1.0.0',
            },
          }
        }
        case 'https://registry.npmjs.org/f': {
          return {
            'dist-tags': {
              latest: '1.0.0',
            },
          }
        }
      }
    },
  }
}) as unknown as typeof global.fetch

const getState = (query: string, graph = getSimpleGraph()) => {
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
    importers: new Set(graph.importers),
    signal: new AbortController().signal,
    specificity: { idCounter: 0, commonCounter: 0 },
  }
  return state
}

t.test(':dist pseudo-selector', async t => {
  t.capture(console, 'warn')

  await t.test('matches nodes at the latest dist-tag', async t => {
    const res = await dist(getState(':dist(latest)'))
    const names = [...res.partial.nodes].map(n => n.name).sort()
    t.strictSame(
      names,
      ['a', 'f'],
      'should match only nodes whose version equals the latest dist-tag',
    )
    t.matchSnapshot({
      nodes: names,
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test('matches nodes at the beta dist-tag', async t => {
    const res = await dist(getState(':dist(beta)'))
    const names = [...res.partial.nodes].map(n => n.name).sort()
    t.strictSame(
      names,
      ['b'],
      'should match only nodes whose version equals the beta dist-tag',
    )
    t.matchSnapshot({
      nodes: names,
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test('matches nodes at the nightly dist-tag', async t => {
    const res = await dist(getState(':dist(nightly)'))
    const names = [...res.partial.nodes].map(n => n.name).sort()
    t.strictSame(
      names,
      [],
      'should match nothing since no installed version is 2.0.0',
    )
  })

  await t.test('supports quoted tag name', async t => {
    const res = await dist(getState(':dist("latest")'))
    const names = [...res.partial.nodes].map(n => n.name).sort()
    t.strictSame(
      names,
      ['a', 'f'],
      'should work with quoted tag names',
    )
  })

  await t.test('unknown dist-tag returns no matches', async t => {
    const res = await dist(getState(':dist(nonexistent)'))
    const names = [...res.partial.nodes].map(n => n.name).sort()
    t.strictSame(
      names,
      [],
      'should return no matches for an unknown dist-tag',
    )
  })

  await t.test('handles empty partial state', async t => {
    const state = getState(':dist(latest)')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await dist(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should return empty results from an empty partial state',
    )
  })

  await t.test('gracefully handles fetch errors', async t => {
    const res = await dist(getState(':dist(latest)'))
    const names = [...res.partial.nodes].map(n => n.name).sort()
    t.ok(
      !names.includes('d') && !names.includes('e'),
      'nodes with fetch errors should not be in results',
    )
  })
})

t.test('retrieveDistTags', async t => {
  const missingName = {
    id: joinDepIDTuple(['registry', '', 'a@1.0.0']),
  } as NodeLike
  t.strictSame(
    await retrieveDistTags(missingName),
    {},
    'should return empty object if missing essential info',
  )

  await t.test('no response from registry', async t => {
    const node = {
      name: 'd',
      id: joinDepIDTuple(['registry', '', 'd@1.0.0']),
    } as NodeLike
    await t.rejects(
      retrieveDistTags(node),
      /Failed to fetch packument/,
      'should throw an internal error so that it may be retried',
    )
  })

  await t.test('fetch error', async t => {
    const node = {
      name: 'e',
      id: joinDepIDTuple(['registry', '', 'e@1.0.0']),
    } as NodeLike
    await t.rejects(
      retrieveDistTags(node),
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
    await queueNode(getState(':dist(latest)'), missingName, 'latest'),
    missingName,
    'should return node for removal if missing essential info',
  )
})
