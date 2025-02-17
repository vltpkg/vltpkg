import t from 'tap'
import { Query, walk } from '../src/index.ts'
import {
  getCycleGraph,
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from './fixtures/graph.ts'
import { type ParserState, type PostcssNode } from '../src/types.ts'
import { copyGraphSelectionState } from './fixtures/selector.ts'

type TestCase = [string, string[]]

const testBrokenState = (): ParserState => {
  const graph = getSimpleGraph()
  const initial = {
    nodes: new Set(graph.nodes.values()),
    edges: new Set(graph.edges.values()),
  }
  const current = { type: 'bork' } as unknown as PostcssNode
  const state: ParserState = {
    cancellable: async () => {},
    collect: {
      nodes: new Set(),
      edges: new Set(),
    },
    current,
    initial: copyGraphSelectionState(initial),
    partial: copyGraphSelectionState(initial),
    walk,
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
    ['.dev', ['b', 'c', 'd', 'e', 'f', '@x/y']], // retrieve deps of dev type
    [':root > .dev', ['b', '@x/y']], // mixed with a combinator
    [':root > .dev[name=b]', ['b']], // specific node
    [':root > [name=b].dev', ['b']], // specific node backwards
    [':root > *[name=b].dev', ['b']], // specific node backwards with universal
    [':root > .dev[name=b] ~ *', ['a', 'e', '@x/y']], // retrieves its siblings
    [':root > .optional', []], // no direct optional dep
    [':root .optional', ['f']], // optional descendent found
    [':root *', ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // all descendents from root
    ['[name=a]', ['a']], // select by name
    [':root :has([name])', ['b', 'd']], // combined has example, filtering any descendent that has direct deps with a name
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
    ['[name=d], [name=d] > *', ['d', 'e', 'f']], // select a package and its dependencies
    [
      ':root > *, .prod, [name=a], :has(.dev, .optional)',
      ['a', 'b', 'e', '@x/y', 'my-project', 'd'],
    ],
    ['#a', ['a']], // identifier
  ])

  const query = new Query({ graph })
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
  const query = new Query({ graph })
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
    [':root > :root > .prod > *', ['b']], // mixed selectors
  ])
  const query = new Query({ graph })
  for (const [q, expected] of queryToExpected) {
    t.strictSame(
      (await query.search(q)).nodes.map(i => i.name),
      expected,
      `query > "${q}"`,
    )
  }
})

t.test('bad search argument', async t => {
  const graph = getSimpleGraph()
  const query = new Query({ graph })
  await t.rejects(
    query.search(null as unknown as string),
    /Query search argument needs to be a string/,
    'should throw a type error',
  )
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
    new Query({ graph: getSimpleGraph() }).search('foo'),
    /Unsupported selector/,
    'should throw an unsupported selector error',
  )
})

t.test('trying to use string selectors', async t => {
  await t.rejects(
    new Query({ graph: getSimpleGraph() }).search('"foo"'),
    /Unsupported selector/,
    'should throw an unsupported selector error',
  )
})

t.test('cancellable search', async t => {
  const graph = getSingleWorkspaceGraph()
  const query = new Query({ graph })
  const ac = new AbortController()
  const q = ':root > * > *'
  await t.rejects(
    new Promise((_, reject) => {
      void query.search(q, ac.signal).catch(err => {
        reject(err as Error)
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
