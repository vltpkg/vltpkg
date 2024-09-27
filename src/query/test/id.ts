import t from 'tap'
import { id } from '../src/id.js'
import { getSimpleGraph } from './fixtures/graph.js'
import {
  copyGraphSelectionState,
  getGraphSelectionState,
  selectorFixture,
} from './fixtures/selector.js'
import { TestCase } from './fixtures/types.js'
import { GraphSelectionState } from '../src/types.js'
import { EdgeLike, NodeLike } from '@vltpkg/graph'

const testId = selectorFixture(id)

t.test('id', async t => {
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
    ['#my-project', all, ['my-project']], // select root node
    ['#a', all, ['a']], // direct dep
    ['#f', all, ['f']], // transitive dep
    ['#a', b, []], // missing from partial
    ['#b', b, ['b']], // exact match from partial
    ['#a', empty, []], // no partial
  ])
  const initial = copyGraphSelectionState(all)
  for (const [query, partial, expected] of queryToExpected) {
    const res = await testId(
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

t.test('bad selector type', async t => {
  await t.rejects(
    testId(':foo'),
    /Mismatching query node/,
    'should throw an error',
  )
})
