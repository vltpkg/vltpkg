import t from 'tap'
import { classFn } from '../src/class.ts'
import {
  getCycleGraph,
  getMissingNodeGraph,
  getSimpleGraph,
  getSingleWorkspaceGraph,
} from './fixtures/graph.ts'
import {
  copyGraphSelectionState,
  getGraphSelectionState,
  selectorFixture,
} from './fixtures/selector.ts'
import { type TestCase } from './fixtures/types.ts'
import { type GraphSelectionState } from '../src/types.ts'
import { type EdgeLike, type NodeLike } from '@vltpkg/graph'

const testClass = selectorFixture(classFn)

t.test('class', async t => {
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
    ['.prod', all, ['a', 'e']], // prod-only deps
    ['.dev', all, ['b', 'c', 'd', 'e', 'f', '@x/y']], // all dev deps and their deps
    ['.optional', all, ['f']], // optional deps only
    ['.peer', all, []], // no peer deps
    ['.workspace', all, []], // no workspaces
    ['.prod', empty, []], // no matches from an empty partial
    ['.dev', b, ['b']], // single result found
    ['.optional', b, []], // no matches if no item is found in partial
  ])
  const initial = copyGraphSelectionState(all)
  for (const [query, partial, expected] of queryToExpected) {
    const res = await testClass(
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

  await t.test('workspace', async t => {
    const wsGraph = getSingleWorkspaceGraph()
    const all: GraphSelectionState = {
      edges: new Set<EdgeLike>(wsGraph.edges),
      nodes: new Set<NodeLike>(wsGraph.nodes.values()),
    }
    const queryToExpected = new Set<TestCase>([
      ['.prod', all, []], // no prod dep on this graph
      ['.dev', all, []], // no dev dep on this graph
      ['.optional', all, []], // no optional dep on this graph
      ['.workspace', all, ['w']], // retrieve workspace
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const res = await testClass(
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
          edges: [],
          nodes: res.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })

  await t.test('cycle', async t => {
    const cycleGraph = getCycleGraph()
    const all: GraphSelectionState = {
      edges: new Set<EdgeLike>(cycleGraph.edges),
      nodes: new Set<NodeLike>(cycleGraph.nodes.values()),
    }
    const queryToExpected = new Set<TestCase>([
      ['.prod', all, ['a', 'b']], // prod-only deps
      ['.dev', all, []], // no deps found
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const res = await testClass(
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
          edges: [],
          nodes: res.nodes.map(i => i.name).sort(),
        },
        `query > "${query}"`,
      )
    }
  })

  await t.test('missing node', async t => {
    const missingNodeGraph = getMissingNodeGraph()
    const all: GraphSelectionState = {
      edges: new Set<EdgeLike>(missingNodeGraph.edges),
      nodes: new Set<NodeLike>(missingNodeGraph.nodes.values()),
    }
    const queryToExpected = new Set<TestCase>([
      ['.prod', all, []], // can't match missing node
      ['.dev', all, []], // can't match missing node
      ['.workspace', all, []], // can't match missing node
    ])
    const initial = copyGraphSelectionState(all)
    for (const [query, partial, expected] of queryToExpected) {
      const res = await testClass(
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
    testClass(':foo'),
    /Mismatching query node/,
    'should throw an error',
  )
})

t.test('usnupported class name', async t => {
  await t.rejects(
    testClass('.nosuchclassname'),
    /Unsupported class: nosuchclassname/,
    'should throw an error',
  )
})

t.test('usnupported class name [loose mode]', async t => {
  await t.resolves(
    testClass('.nosuchclassname', undefined, undefined, true),
    'should resolve with no error',
  )
})
