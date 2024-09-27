import { joinDepIDTuple } from '@vltpkg/dep-id'
import { EdgeLike, NodeLike } from '@vltpkg/graph'
import { ManifestMinified } from '@vltpkg/types'
import type { Attribute } from 'postcss-selector-parser'
import t from 'tap'
import {
  attribute,
  filterAttributes,
  getManifestPropertyValues,
} from '../src/attribute.js'
import {
  getMissingNodeGraph,
  getSimpleGraph,
} from './fixtures/graph.js'
import {
  copyGraphSelectionState,
  getGraphSelectionState,
  selectorFixture,
} from './fixtures/selector.js'
import { TestCase } from './fixtures/types.js'
import { GraphSelectionState, ParserState } from '../src/types.js'

const testAttr = selectorFixture(attribute)

t.test('attribute', async t => {
  const simpleGraph = getSimpleGraph()
  const all: GraphSelectionState = {
    edges: new Set<EdgeLike>(simpleGraph.edges),
    nodes: new Set<NodeLike>(simpleGraph.nodes.values()),
  }
  const b = getGraphSelectionState(simpleGraph, 'b')
  const empty: GraphSelectionState = {
    edges: new Set(),
    nodes: new Set(),
  }

  const queryToExpected = new Set<TestCase>([
    [
      '[version="1.0.0"]',
      all,
      ['my-project', 'a', 'c', 'd', 'e', 'f', '@x/y'],
    ], // attribute matches all
    [
      '[name]',
      all,
      ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y'],
    ], // attribute has any content
    ['[nonexistingattribute]', all, []], // non existing attribute
    ['[name="@x/y"]', all, ['@x/y']], // attribute matches scoped quoted
    ['[name^=m]', all, ['my-project']], // attribute starts with value
    ['[name^="m"]', all, ['my-project']], // attribute starts with value
    ['[name^=@x]', all, ['@x/y']], // attribute starts with scope
    ['[name^="@x"]', all, ['@x/y']], // attribute starts with scope
    ['[name$=project]', all, ['my-project']], // attribute ends with value
    ['[name$="project"]', all, ['my-project']], // attribute ends with value
    ['[name~=project]', all, ['my-project']], // attribute contains word
    ['[name~="project"]', all, ['my-project']], // attribute contains word
    ['[name~=notfound]', all, []], // attribute contains not found
    ['[name~="notfound"]', all, []], // attribute contains not found
    ['[name*=pro]', all, ['my-project']], // attribute contains string
    ['[name*="pro"]', all, ['my-project']], // attribute contains string
    ['[name|=my]', all, ['my-project']], // attribute starts with hyphened string
    ['[name|="my"]', all, ['my-project']], // attribute starts with hyphened string
    ['[name|="a"]', all, ['a']], // also matches on exact match
    ['[name="A"]', all, []], // case sensitive by default
    ['[name="A" i]', all, ['a']], // case insensitive flag
    ['[name="A" s]', all, []], // case insensitive flag
    ['[name="a"]', empty, []], // no matches if starting from empty partial
    ['[name="a"]', b, []], // no matches if node can't be find in partial
    ['[name="b"]', b, ['b']], // matches single node found
    ['[keywords=something]', all, ['c']], // matches item in array prop
    ['[keywords=missing]', all, []], // can not match missing item in array
  ])
  const initial = {
    edges: new Set(all.edges),
    nodes: new Set(all.nodes),
  }
  for (const [query, partial, expected] of queryToExpected) {
    const res = await testAttr(
      query,
      initial,
      copyGraphSelectionState(partial),
    )
    t.strictSame(
      res.nodes.map(i => i.name),
      expected,
      `query > "${query}"`,
    )
    t.matchSnapshot(
      {
        edges: res.edges.map(i => i.name).sort(),
        nodes: res.nodes.map(i => i.name).sort(),
      },
      `query > "${query}"`,
    )
  }

  await t.test('missing node', async t => {
    const missingNodeGraph = getMissingNodeGraph()
    const all: GraphSelectionState = {
      edges: new Set<EdgeLike>(missingNodeGraph.edges),
      nodes: new Set<NodeLike>(missingNodeGraph.nodes.values()),
    }
    const queryToExpected = new Set<TestCase>([
      ['[name]', all, ['node-missing-project']], // root node has a name
      ['[name=a]', all, []], // can't match missing node
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const res = await testAttr(
        query,
        initial,
        copyGraphSelectionState(partial),
      )
      t.strictSame(
        res.nodes.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
      t.matchSnapshot(
        {
          edges: res.edges.map(i => i.name).sort(),
          nodes: res.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })
})

t.test('bad selector type', async t => {
  await t.rejects(
    testAttr('.dev'),
    /Mismatching query node/,
    'should throw an error',
  )
})

t.test('bad operator', async t => {
  await t.rejects(
    testAttr('[name==foo]'),
    /Unsupported attribute operator: +=/,
    'should throw an error',
  )
})

t.test('bad operator [loose mode]', async t => {
  await t.resolves(
    testAttr('[name==foo]', undefined, undefined, true),
    'should resolve with no error',
  )
})

t.test(
  'unquotted scoped names are not supported by the parser',
  async t => {
    await t.rejects(
      testAttr('[name=@x/y]'),
      /Unexpected "\/" found./,
      'should throw an error',
    )
  },
)

t.test('getManifestPropertyValues', async t => {
  const simpleGraph = getSimpleGraph()
  const b = simpleGraph.nodes.get(
    joinDepIDTuple(['registry', '', 'b@1.0.0']),
  )!

  t.strictSame(
    getManifestPropertyValues(
      b,
      ['scripts', 'postinstall'],
      'postinstall',
    ),
    ['postinstall'],
    'should return the postinstall script value',
  )

  t.strictSame(
    getManifestPropertyValues(b, ['contributors'], 'contributors'),
    ['[object Object]'],
    'should return a stringified object value',
  )

  t.strictSame(
    getManifestPropertyValues(b, ['contributors', 'name'], 'name'),
    ['Ruy Adorno'],
    'should return the value from a array-nested object',
  )

  b.manifest = { foo: 1 } as ManifestMinified
  t.strictSame(
    getManifestPropertyValues(b, ['foo'], 'foo'),
    ['1'],
    'should return values as strings',
  )

  b.manifest = { keywords: [undefined, 'foo'] } as ManifestMinified
  t.strictSame(
    getManifestPropertyValues(b, ['keywords'], 'keywords'),
    ['', 'foo'],
    'should turn falsy values into empty strings',
  )

  b.manifest = 'bad manifest' as ManifestMinified
  t.strictSame(
    getManifestPropertyValues(b, ['name'], 'name'),
    undefined,
    'should not return results from a bad manifest',
  )

  delete b.manifest
  t.strictSame(
    getManifestPropertyValues(b, ['name'], 'name'),
    undefined,
    'should not return results from a missing manifest',
  )
})

t.test('filterAttributes', async t => {
  const simpleGraph = getSimpleGraph()
  const all: GraphSelectionState = {
    edges: new Set<EdgeLike>(simpleGraph.edges),
    nodes: new Set<NodeLike>(simpleGraph.nodes.values()),
  }
  const state = {
    collect: {
      edges: new Set<EdgeLike>(),
      nodes: new Set<NodeLike>(),
    },
    current: { type: 'attribute', value: 'postinstall' } as Attribute,
    initial: copyGraphSelectionState(all),
    partial: all,
    loose: false,
    walk: async (state: ParserState) => state,
  }
  filterAttributes(
    state,
    (attr: string) => !!attr,
    'postinstall',
    'scripts',
    false,
    ['scripts', 'postinstall'],
  )
  t.matchSnapshot(
    {
      edges: [...state.partial.edges].map(i => i.name).sort(),
      nodes: [...state.partial.nodes].map(i => i.name).sort(),
    },
    'should have filtered out nodes with postinstall script only',
  )
})
