import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { ParserState } from '../../src/types.ts'
import { attr } from '../../src/pseudo/attr.ts'
import { getSimpleGraph } from '../fixtures/graph.ts'

t.test('selects packages based on attribute properties', async t => {
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
      securityArchive: undefined,
      specOptions: {},
      retries: 0,
      signal: new AbortController().signal,
      specificity: { idCounter: 0, commonCounter: 0 },
    }
    return state
  }

  await t.test('selects nodes with a specific attribute', async t => {
    // Based on the getSimpleGraph fixture, only package 'b' has 'scripts' property
    const res = await attr(getState(':attr([scripts])'))
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      ['b'],
      'should select only package with scripts property',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name).sort(),
      edges: [...res.partial.edges].map(e => e.name).sort(),
    })
  })

  await t.test(
    'selects nodes with a specific attribute value',
    async t => {
      // In getSimpleGraph, only package 'd' has private=true
      const res = await attr(getState(':attr([private=true])'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['d'],
        'should select only package with private=true',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects nodes with nested attribute paths',
    async t => {
      // Package 'b' has a nested scripts.postinstall property
      const res = await attr(
        getState(':attr(scripts, [postinstall])'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['b'],
        'should select packages with nested attributes',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects nodes with nested attribute value',
    async t => {
      // Package 'b' has a nested scripts.test="test" property
      const res = await attr(getState(':attr(scripts, [test=test])'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['b'],
        'should select packages with specific nested attribute values',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'supports quoted strings for property names',
    async t => {
      // Package 'b' has a nested scripts.test="test" property using quoted strings
      const res = await attr(
        getState(':attr("scripts", [test=test])'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['b'],
        'should select packages with quoted property name',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'supports multiple quoted strings for nested properties',
    async t => {
      // Package 'd' has a deeply nested structure with a.b[].c.d="foo" using quoted strings
      const res = await attr(
        getState(':attr("a", "b", "c", [d=foo])'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['d'],
        'should select packages with deeply nested attributes using quoted strings',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'supports mixed quoted and unquoted property names',
    async t => {
      // Package 'd' has a deeply nested structure mixing quoted and unquoted property names
      const res = await attr(getState(':attr("a", b, "c", [d=foo])'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['d'],
        'should select packages with mixed quoted and unquoted property names',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects nodes with complex nested attributes',
    async t => {
      // Package 'd' has a deeply nested structure with a.b[].c.d="foo"
      const res = await attr(getState(':attr(a, b, c, [d=foo])'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['d'],
        'should select packages with deeply nested attributes',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects nodes with array value attributes',
    async t => {
      // Package 'c' has keywords=['something', 'someother']
      const res = await attr(getState(':attr([keywords=something])'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['c'],
        'should select packages with array value attributes',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'selects nodes with complex nested object in arrays',
    async t => {
      // Package 'b' has contributors array with objects
      const res = await attr(
        getState(':attr(contributors, [name^=Ruy])'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        ['b'],
        'should select packages with objects in arrays by attribute',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name).sort(),
        edges: [...res.partial.edges].map(e => e.name).sort(),
      })
    },
  )

  await t.test(
    'returns no nodes for non-existent attribute',
    async t => {
      const res = await attr(getState(':attr([nonexistent])'))
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should return no nodes when attribute does not exist',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test(
    'returns no nodes for non-existent nested attribute',
    async t => {
      const res = await attr(
        getState(':attr(scripts, [nonexistent])'),
      )
      t.strictSame(
        [...res.partial.nodes].map(n => n.name),
        [],
        'should return no nodes when nested attribute does not exist',
      )
      t.matchSnapshot({
        nodes: [...res.partial.nodes].map(n => n.name),
        edges: [...res.partial.edges].map(e => e.name),
      })
    },
  )

  await t.test('handles attribute operator matching', async t => {
    // Test starts-with operator
    const startsWithRes = await attr(getState(':attr([version^=1])'))
    t.strictSame(
      [...startsWithRes.partial.nodes].map(n => n.name).sort(),
      ['a', 'c', 'd', 'e', 'f', '@x/y', 'my-project'].sort(),
      'should match attributes with starts-with operator',
    )

    // Test ends-with operator
    const endsWithRes = await attr(getState(':attr([version$=0])'))
    t.strictSame(
      [...endsWithRes.partial.nodes].map(n => n.name).sort(),
      ['@x/y', 'a', 'b', 'c', 'd', 'e', 'f', 'my-project'].sort(),
      'should match attributes with ends-with operator',
    )

    t.matchSnapshot({
      startsWith: [...startsWithRes.partial.nodes]
        .map(n => n.name)
        .sort(),
      endsWith: [...endsWithRes.partial.nodes]
        .map(n => n.name)
        .sort(),
    })
  })

  await t.test('handles an empty partial state', async t => {
    // Create a state with empty partial nodes
    const state = getState(':attr([scripts])')
    state.partial.nodes.clear()
    state.partial.edges.clear()

    const res = await attr(state)
    t.strictSame(
      [...res.partial.nodes].map(n => n.name),
      [],
      'should return empty array when starting with empty partial state',
    )
    t.matchSnapshot({
      nodes: [...res.partial.nodes].map(n => n.name),
      edges: [...res.partial.edges].map(e => e.name),
    })
  })

  await t.test('invalid parameter handling', async t => {
    await t.rejects(
      attr(getState(':attr(>)')),
      /Failed to parse :attr selector/,
      'should throw error for invalid parameters',
    )
  })
})
