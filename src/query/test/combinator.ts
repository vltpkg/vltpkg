import t from 'tap'
import { combinator } from '../src/combinator.js'
import { walk } from '../src/index.js'
import { getCycleGraph, getSimpleGraph } from './fixtures/graph.js'
import { selectorFixture } from './fixtures/selector.js'
import { TestCase } from './fixtures/types.js'

const testCombinator = selectorFixture(combinator)

t.test('combinator', async t => {
  const simpleGraph = getSimpleGraph()
  const all = [...simpleGraph.nodes.values()]
  const b = simpleGraph.nodes.get(';;b@1.0.0')!
  const d = simpleGraph.nodes.get(';;d@1.0.0')!
  const e = simpleGraph.nodes.get(';;e@1.0.0')!
  const f = simpleGraph.nodes.get(';;f@1.0.0')!
  const queryToExpected = new Set<TestCase>([
    // child combinator
    ['>', all, ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // direct children of all nodes
    ['>', [simpleGraph.mainImporter], ['a', 'b', 'e', '@x/y']], // from root
    ['>', [d], ['e', 'f']], // from transitive dep
    ['>', [b, d], ['c', 'd', 'e', 'f']], // from mutiple deps
    ['>', [e], []], // from node with no deps
    ['>', [], []], // from empty nodes
    // subsequent sibling combinator
    ['~', all, ['b', 'e', '@x/y', 'a', 'd', 'c', 'f']], // siblings of all nodes
    ['~', [f], ['e']], // leaf node with a sibling
    ['~', [d], ['c']], // transitive node
    ['~', [e], ['a', 'b', '@x/y', 'f']], // node with siblings at multiple locations
    ['~', [simpleGraph.mainImporter], []], // root has no siblings
    ['~', [], []], // sibling of empty nodes
    // descendent combinator
    ['>', all, ['a', 'b', 'e', '@x/y', 'c', 'd', 'f']], // descendents of all nodes
    [
      ' ',
      [simpleGraph.mainImporter],
      ['a', 'b', 'e', '@x/y', 'c', 'd', 'f'],
    ], // from root
    [' ', [f], []], // leaf node
    [' ', [], []], // empty list of nodes
    [' ', [d], ['e', 'f']], // transitive node
    [' ', [b], ['c', 'd', 'e', 'f']], // direct dep
  ])
  const initial = [...simpleGraph.nodes.values()]
  for (const [query, partial, expected] of queryToExpected) {
    const res = await testCombinator(
      { value: query, type: 'combinator' },
      initial,
      partial,
    )
    t.strictSame(
      res.map(i => i.name),
      expected,
      `query > "${query}"`,
    )
  }

  await t.test('cycle', async t => {
    const cycleGraph = getCycleGraph()
    const all = [...cycleGraph.nodes.values()]
    const a = cycleGraph.nodes.get(';;a@1.0.0')!
    const b = cycleGraph.nodes.get(';;b@1.0.0')!
    const queryToExpected = new Set<TestCase>([
      ['>', all, ['a', 'b']], // direct children of all nodes
      ['>', [a], ['b']], // direct children of a
      ['>', [b], ['a']], // direct children of b
      [' ', [cycleGraph.mainImporter], ['a', 'b']], // descendents of :root
      [' ', [a], ['b', 'a']], // descendents of a
      [' ', [b], ['a', 'b']], // descendents of b
      ['~', [cycleGraph.mainImporter], []], // siblings of :root
      ['~', [a], []], // siblings of a
      ['~', [b], []], // siblings of b
    ])
    for (const [query, partial, expected] of queryToExpected) {
      const initial = [...cycleGraph.nodes.values()]
      const result = await testCombinator(
        { value: query, type: 'combinator' },
        initial,
        partial,
      )
      t.strictSame(
        result.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
    }
  })

  // space between tags are not descendent combinators
  await t.test('ignore spaces between tags', async t => {
    const test = selectorFixture(walk)
    const result = await test('* { * }', all, all)
    t.strictSame(
      result.map(i => i.name),
      all.map(i => i.name),
      'should not treat spaces between tags as descendent combinators',
    )
  })
})

t.test('bad selector type', async t => {
  await t.rejects(
    testCombinator('.dev', [], []),
    /Mismatching query node/,
    'should throw an error',
  )
})

t.test('usnupported combinator', async t => {
  await t.rejects(
    testCombinator({ value: '+', type: 'combinator' }, [], []),
    /Unsupported combinator: \+/,
    'should throw an error',
  )
})

t.test('usnupported combinator [loose mode]', async t => {
  await t.resolves(
    testCombinator({ value: '+', type: 'combinator' }, [], [], true),
    'should resolve with no error',
  )
})
