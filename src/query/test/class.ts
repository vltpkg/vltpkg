import t from 'tap'
import { classFn } from '../src/class.js'
import {
  getCycleGraph,
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from './fixtures/graph.js'
import { selectorFixture } from './fixtures/selector.js'
import { TestCase } from './fixtures/types.js'

const testClass = selectorFixture(classFn)

t.test('class', async t => {
  const simpleGraph = getSimpleGraph()
  const all = [...simpleGraph.nodes.values()]
  const b = simpleGraph.nodes.get(';;b@1.0.0')!
  const queryToExpected = new Set<TestCase>([
    ['.prod', all, ['a']], // prod-only deps
    ['.dev', all, ['b', 'c', 'd', 'e', 'f', '@x/y']], // all dev deps and their deps
    ['.optional', all, ['f']], // optional deps only
    ['.peer', all, []], // no peer deps
    ['.workspace', all, []], // no workspaces
    ['.prod', [], []], // no matches from an empty partial
    ['.dev', [b], ['b']], // single result found
    ['.optional', [b], []], // no matches if no item is found in partial
  ])
  const initial = [...simpleGraph.nodes.values()]
  for (const [query, partial, expected] of queryToExpected) {
    const res = await testClass(query, initial, partial)
    t.strictSame(
      res.map(i => i.name),
      expected,
      `query > "${query}"`,
    )
  }

  await t.test('.workspace', async t => {
    const wsGraph = getSingleWorkspaceGraph()
    const all = [...wsGraph.nodes.values()]
    const queryToExpected = new Set<TestCase>([
      ['.prod', all, []], // no prod dep on this graph
      ['.dev', all, []], // no dev dep on this graph
      ['.optional', all, []], // no optional dep on this graph
      ['.workspace', all, ['w']], // retrieve workspace
    ])
    const initial = [...wsGraph.nodes.values()]
    for (const [query, partial, expected] of queryToExpected) {
      const res = await testClass(query, initial, partial)
      t.strictSame(
        res.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
    }
  })

  await t.test('cycle', async t => {
    const cycleGraph = getCycleGraph()
    const all = [...cycleGraph.nodes.values()]
    const queryToExpected = new Set<TestCase>([
      ['.prod', all, ['a', 'b']], // prod-only deps
      ['.dev', all, []], // no deps found
    ])
    for (const [query, partial, expected] of queryToExpected) {
      const initial = [...cycleGraph.nodes.values()]
      const result = await testClass(query, initial, partial)
      t.strictSame(
        result.map(i => i.name),
        expected,
        `query > "${query}"`,
      )
    }
  })
})

t.test('bad selector type', async t => {
  await t.rejects(
    testClass(':foo', [], []),
    /Mismatching query node/,
    'should throw an error',
  )
})

t.test('usnupported class name', async t => {
  await t.rejects(
    testClass('.nosuchclassname', [], []),
    /Unsupported class: nosuchclassname/,
    'should throw an error',
  )
})

t.test('usnupported class name [loose mode]', async t => {
  await t.resolves(
    testClass('.nosuchclassname', [], [], true),
    'should resolve with no error',
  )
})
