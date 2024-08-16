import t from 'tap'
import { Query, walk } from '../src/index.js'
import {
  getCycleGraph,
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from './fixtures/graph.js'
import { ParserState, PostcssNode } from '../src/types.js'
import { EdgeLike } from '@vltpkg/graph'

type TestCase = [string, string[]]

const testState = (): ParserState => {
  const graph = getSimpleGraph()
  const initial = [...graph.nodes.values()]
  const current = { type: 'bork' } as unknown as PostcssNode
  const edges = new Set<EdgeLike>()
  for (const node of initial) {
    for (const edge of node.edgesOut.values()) {
      edges.add(edge)
    }
  }
  const state: ParserState = {
    collect: new Set(),
    current,
    initial: {
      nodes: new Set(initial),
      edges: new Set(edges),
    },
    partial: {
      nodes: new Set(initial),
      edges: new Set(edges),
    },
    walk,
  }
  return state
}

t.test('simple graph', async t => {
  const nodes = [...getSimpleGraph().nodes.values()]
  const queryToExpected = new Set<TestCase>([
    ['', []], // should match no deps on missing query
    ['*', ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // universal
    ['*', ['my-project', 'a', 'b', 'c', 'd', 'e', 'f', '@x/y']], // repeat, cache-hit
    ['* >*', ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // dependencies
    [':root', ['my-project']], // select :root
    [':root > *', ['a', 'b', 'e', '@x/y']], // direct deps of :root
    [':root > :root', ['my-project']], // :root always places a ref to root
    ['.dev', ['b', 'c', 'd', 'e', 'f', '@x/y']], // retrieve deps of dev type
    [':root > .dev', ['b', 'e', '@x/y']], // mixed with a combinator
    [':root > .dev[name=b]', ['b']], // specific node
    [':root > [name=b].dev', ['b']], // specific node backwards
    [':root > *[name=b].dev', ['b']], // specific node backwards with universal
    [':root > .dev[name=b] ~ *', ['a', 'e', '@x/y']], // retrieves its siblings
    [':root > .optional', []], // no direct optional dep
    [':root .optional', ['f']], // optional descendent found
    [':root *', ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // all descendents from root
    ['[name=a]', ['a']], // select by name
    [':root > [name=a]', ['a']], // select children by name
    [':root > [name=d] [name=b]', []], // no direct descendent with that name
    [':root > [name=d] [name=e]', []], // descendent found by name
    [':root .dev[name=d] ~ .dev[name=c]', ['c']], // fully qualified
    [':root [name^=@x]', ['@x/y']], // attribute starts with value
    ['/* do something */ :root [name^=@x]', ['@x/y']], // support comments
    [':root > *{&[name=a]}', ['a']], // support nesting
    [':root > * { &[name=a] }', ['a']], // support nesting with spaces
    [':root > * { &[name=a], &[name=b] }', ['a', 'b']], // support multiple nesting selectors
    ['[name=b], [name=c], [name=f]', ['b', 'c', 'f']], // select by name
    [
      ':root > *, .prod, [name=a], :has(.dev, .optional)',
      ['a', 'b', 'e', '@x/y', 'my-project', 'd'],
    ],
    ['#a', ['a']], // identifier
  ])

  const query = new Query({ nodes })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q)).map(i => i.name),
      expected,
      `query > "${q}"`,
    )
  }
})

t.test('workspace', async t => {
  const nodes = [...getSingleWorkspaceGraph().nodes.values()]
  const queryToExpected = new Map<string, string[]>([
    ['', []], // should match no deps on missing query
    ['*', ['ws', 'w']], // universal
    [':root', ['ws']], // select :root
    [':root > *', []], // direct deps of :root
    [':root > :root', ['ws']], // :root always places a ref to root
    ['/* do something */ [name^=w]', ['ws', 'w']], // support comments
  ])
  const query = new Query({ nodes })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q)).map(i => i.name),
      expected,
      `query > "${q}"`,
    )
  }
})

t.test('cycle', async t => {
  const nodes = [...getCycleGraph().nodes.values()]
  const queryToExpected = new Set<TestCase>([
    ['', []], // should match no deps on missing query
    ['*', ['cycle-project', 'a', 'b']], // universal
    [':root', ['cycle-project']], // select :root
    [':root > *', ['a']], // direct deps of :root
    [':root > :root', ['cycle-project']], // :root always places a ref to root
    ['/* do something */ [name^=a]', ['a']], // support comments
    [':root > :root > .prod > *', ['b']], // mixed selectors
  ])
  const query = new Query({ nodes })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q)).map(i => i.name),
      expected,
      `query > "${q}"`,
    )
  }
})

t.test('bad selector type', async t => {
  await t.rejects(
    walk(testState()),
    /Missing parser for query node: bork/,
    'should throw a parser error',
  )
})

t.test('bad selector type [loose mode]', async t => {
  await t.resolves(
    walk({ ...testState(), loose: true }),
    'should resolve with no error',
  )
})

t.test('trying to use tag selectors', async t => {
  await t.rejects(
    new Query({ nodes: [...getSimpleGraph().nodes.values()] }).search(
      'foo',
    ),
    /Unsupported selector/,
    'should throw an unsupported selector error',
  )
})

t.test('trying to use string selectors', async t => {
  await t.rejects(
    new Query({ nodes: [...getSimpleGraph().nodes.values()] }).search(
      '"foo"',
    ),
    /Unsupported selector/,
    'should throw an unsupported selector error',
  )
})
