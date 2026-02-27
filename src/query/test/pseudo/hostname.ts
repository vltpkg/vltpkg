import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { hostname } from '../../src/pseudo/hostname.ts'
import {
  getSimpleGraph,
  getAliasedGraph,
  getGitGraph,
  getRemoteGraph,
  getLinkedGraph,
  getCustomGitHostGraph,
  getHttpsGitGraph,
  getBrokenGitGraph,
  getUnknownRegistryGraph,
} from '../fixtures/graph.ts'

t.test('selects nodes by hostname', async t => {
  const getState = (query: string, graph = getSimpleGraph()) => {
    const ast = postcssSelectorParser().astSync(query)
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
      retries: 0,
      securityArchive: undefined,
      importers: new Set(graph.importers),
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test(
    'matches default registry deps by hostname',
    async t => {
      const res = await hostname(
        getState(':hostname("registry.npmjs.org")'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a', 'b', 'c', 'd', 'e', 'f'],
        'should match all default registry packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'matches custom registry deps by hostname',
    async t => {
      const graph = getAliasedGraph()
      const res = await hostname(
        getState(':hostname("example.com")', graph),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['c'],
        'should match only custom registry packages',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('matches github git deps by hostname', async t => {
    const graph = getGitGraph()
    const res = await hostname(
      getState(':hostname("github.com")', graph),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['a'],
      'should match only github deps',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name).sort(),
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test('matches gitlab git deps by hostname', async t => {
    const graph = getGitGraph()
    const res = await hostname(
      getState(':hostname("gitlab.com")', graph),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['b'],
      'should match only gitlab deps',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name).sort(),
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test(
    'matches git deps with full URL by hostname',
    async t => {
      const graph = getGitGraph()
      const res = await hostname(
        getState(':hostname("custom-git.example.com")', graph),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['c'],
        'should match git dep with full URL',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test('matches remote deps by hostname', async t => {
    const graph = getRemoteGraph()
    const res = await hostname(
      getState(':hostname("cdn.example.com")', graph),
    )
    t.strictSame(
      [...res.partial.nodes].map(n => n.name).sort(),
      ['a'],
      'should match remote dep by hostname',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name).sort(),
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test(
    'excludes file deps from hostname matching',
    async t => {
      const graph = getLinkedGraph()
      const res = await hostname(
        getState(':hostname("registry.npmjs.org")', graph),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['b'],
        'should exclude file deps and only match registry dep',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'returns empty when hostname does not match',
    async t => {
      const res = await hostname(
        getState(':hostname("nonexistent.com")'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should return no nodes for nonexistent hostname',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'falls back to default registry for unknown registry name',
    async t => {
      const graph = getUnknownRegistryGraph()
      const res = await hostname(
        getState(':hostname("registry.npmjs.org")', graph),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a'],
        'should fall back to default registry hostname',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'matches custom named git host via template URL',
    async t => {
      const graph = getCustomGitHostGraph()
      const res = await hostname(
        getState(':hostname("myserver.example.com")', graph),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a'],
        'should match custom git host via template URL parsing',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'matches git dep with plain https URL remote',
    async t => {
      const graph = getHttpsGitGraph()
      const res = await hostname(
        getState(':hostname("git.example.org")', graph),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name).sort(),
        ['a'],
        'should match git dep with plain https URL',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'excludes git deps with unparseable remote URLs',
    async t => {
      const graph = getBrokenGitGraph()
      const res = await hostname(
        getState(':hostname("anything.com")', graph),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should not match any nodes with broken git URLs',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('throws on invalid selector', async t => {
    const ast = postcssSelectorParser().astSync(':hostname')
    const current = ast.first.first
    const graph = getSimpleGraph()
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
    await t.rejects(
      hostname(state),
      { message: /Failed to parse :hostname selector/ },
      'should throw an error for invalid selector',
    )
  })

  await t.test('handles empty partial state', async t => {
    const state = getState(':hostname("registry.npmjs.org")')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await hostname(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should return empty when partial state is empty',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })
})
