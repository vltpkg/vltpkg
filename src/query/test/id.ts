import { joinDepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import { id } from '../src/id.js'
import { getSimpleGraph } from './fixtures/graph.js'
import { selectorFixture } from './fixtures/selector.js'
import { TestCase } from './fixtures/types.js'

const testId = selectorFixture(id)

t.test('id', async t => {
  const simpleGraph = getSimpleGraph()
  const all = [...simpleGraph.nodes.values()]
  const b = simpleGraph.nodes.get(
    joinDepIDTuple(['registry', '', 'b@1.0.0']),
  )!
  const queryToExpected = new Set<TestCase>([
    ['#my-project', all, ['my-project']], // select root node
    ['#a', all, ['a']], // direct dep
    ['#f', all, ['f']], // transitive dep
    ['#a', [b], []], // missing from partial
    ['#b', [b], ['b']], // exact match from partial
    ['#a', [], []], // no partial
  ])
  const initial = [...simpleGraph.nodes.values()]
  for (const [query, partial, expected] of queryToExpected) {
    const res = await testId(query, initial, partial)
    t.strictSame(
      res.map(i => i.name),
      expected,
      `query > "${query}"`,
    )
  }
})

t.test('bad selector type', async t => {
  await t.rejects(
    testId(':foo', [], []),
    /Mismatching query node/,
    'should throw an error',
  )
})
