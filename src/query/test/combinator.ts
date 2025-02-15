import t from 'tap'
import { combinator } from '../src/combinator.ts'
import { walk } from '../src/index.ts'
import { getCycleGraph, getSimpleGraph } from './fixtures/graph.ts'
import {
  copyGraphSelectionState,
  getGraphSelectionState,
  selectorFixture,
} from './fixtures/selector.ts'
import type { TestCase } from './fixtures/types.ts'
import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import type { GraphSelectionState } from '../src/types.ts'

const testCombinator = selectorFixture(combinator)

t.test('combinator', async t => {
  const simpleGraph = getSimpleGraph()
  const all: GraphSelectionState = {
    edges: new Set<EdgeLike>(simpleGraph.edges),
    nodes: new Set<NodeLike>(simpleGraph.nodes.values()),
  }
  const root = {
    edges: new Set<EdgeLike>(),
    nodes: new Set<NodeLike>([simpleGraph.mainImporter]),
  }
  const b = getGraphSelectionState(simpleGraph, 'b')
  const d = getGraphSelectionState(simpleGraph, 'd')
  const bd: GraphSelectionState = {
    edges: new Set<EdgeLike>([...b.edges, ...d.edges]),
    nodes: new Set<NodeLike>([...b.nodes, ...d.nodes]),
  }
  const e = getGraphSelectionState(simpleGraph, 'e')
  const f = getGraphSelectionState(simpleGraph, 'f')
  const empty: GraphSelectionState = {
    edges: new Set(),
    nodes: new Set(),
  }
  const queryToExpected = new Set<TestCase>([
    // child combinator
    ['>', all, ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // direct children of all nodes
    ['>', root, ['a', 'b', 'e', '@x/y']], // from root
    ['>', d, ['e', 'f']], // from transitive dep
    ['>', bd, ['c', 'd', 'e', 'f']], // from mutiple deps
    ['>', e, []], // from node with no deps
    ['>', empty, []], // from empty nodes
    // subsequent sibling combinator
    ['~', all, ['b', 'e', '@x/y', 'a', 'd', 'c', 'f']], // siblings of all nodes
    ['~', f, ['e']], // leaf node with a sibling
    ['~', d, ['c']], // transitive node
    ['~', e, ['a', 'b', '@x/y', 'f']], // node with siblings at multiple locations
    ['~', root, []], // root has no siblings
    ['~', empty, []], // sibling of empty nodes
    // descendent combinator
    [' ', root, ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // from root
    [' ', f, []], // leaf node
    [' ', empty, []], // empty list of nodes
    [' ', d, ['e', 'f']], // transitive node
    [' ', b, ['c', 'd', 'e', 'f']], // direct dep
  ])
  const initial = copyGraphSelectionState(all)
  for (const [query, partial, expected] of queryToExpected) {
    const res = await testCombinator(
      { value: query, type: 'combinator' },
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

  await t.test('cycle', async t => {
    const cycleGraph = getCycleGraph()
    const all: GraphSelectionState = {
      edges: new Set<EdgeLike>(cycleGraph.edges),
      nodes: new Set<NodeLike>(cycleGraph.nodes.values()),
    }
    const root = {
      edges: new Set<EdgeLike>(),
      nodes: new Set<NodeLike>([cycleGraph.mainImporter]),
    }
    const a = getGraphSelectionState(cycleGraph, 'a')
    const b = getGraphSelectionState(cycleGraph, 'b')
    const queryToExpected = new Set<TestCase>([
      ['>', all, ['a', 'b']], // direct children of all nodes
      ['>', a, ['b']], // direct children of a
      ['>', b, ['a']], // direct children of b
      [' ', root, ['a', 'b']], // descendents of :root
      [' ', a, ['b', 'a']], // descendents of a
      [' ', b, ['a', 'b']], // descendents of b
      ['~', root, []], // siblings of :root
      ['~', a, []], // siblings of a
      ['~', b, []], // siblings of b
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const result = await testCombinator(
        { value: query, type: 'combinator' },
        initial,
        copyGraphSelectionState(partial),
      )
      t.strictSame(
        result.nodes.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
      t.matchSnapshot(
        {
          edges: result.edges.map(i => i.name).sort(),
          nodes: result.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })

  // space between tags are not descendent combinators
  await t.test('ignore spaces between tags', async t => {
    const test = selectorFixture(walk)
    const result = await test(
      '* { * }',
      all,
      copyGraphSelectionState(all),
    )
    t.strictSame(
      result.nodes.map(i => i.name),
      [...all.nodes].map(i => i.name),
      'should not treat spaces between tags as descendent combinators',
    )
  })
})

t.test('bad selector type', async t => {
  await t.rejects(
    testCombinator('.dev'),
    /Mismatching query node/,
    'should throw an error',
  )
})

t.test('usnupported combinator', async t => {
  await t.rejects(
    testCombinator({ value: '+', type: 'combinator' }),
    /Unsupported combinator: \+/,
    'should throw an error',
  )
})

t.test('usnupported combinator [loose mode]', async t => {
  await t.resolves(
    testCombinator(
      { value: '+', type: 'combinator' },
      undefined,
      undefined,
      true,
    ),
    'should resolve with no error',
  )
})
