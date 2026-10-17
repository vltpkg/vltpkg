import t from 'tap'
import postcssSelectorParser from 'postcss-selector-parser'
import type { EdgeLike, NodeLike } from '@vltpkg/types'
import type { HasSkills, ParserState } from '../../src/types.ts'
import { skills } from '../../src/pseudo/skills.ts'
import { getSimpleGraph } from '../fixtures/graph.ts'

const getState = (
  query: string,
  hasSkills?: HasSkills,
  loose?: boolean,
) => {
  const graph = getSimpleGraph()
  const current = postcssSelectorParser().astSync(query).first.first
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
    collect: { edges: new Set(), nodes: new Set() },
    cancellable: async () => {},
    walk: async i => i,
    retries: 0,
    securityArchive: undefined,
    importers: new Set(graph.importers),
    signal: new AbortController().signal,
    specificity: { idCounter: 0, commonCounter: 0 },
    hasSkills,
    loose,
  }
  return state
}

const names = (state: ParserState) => ({
  nodes: [...state.partial.nodes].map(n => n.name).sort(),
  edges: [...state.partial.edges].map(e => e.name).sort(),
})

t.test('matches packages the provider says ship skills', async t => {
  const asked: string[] = []
  const hasSkills: HasSkills = async (node: NodeLike) => {
    asked.push(String(node.name))
    await new Promise(r => setTimeout(r, 0))
    return node.name === 'a' || node.name === 'd'
  }
  const state = getState(':skills', hasSkills)
  // edge with no node: dropped
  state.partial.edges.add({ name: 'gone' } as EdgeLike)
  const res = await skills(state)
  t.strictSame(names(res), { nodes: ['a', 'd'], edges: ['a', 'd'] })
  t.matchSnapshot(names(res))
  t.strictSame(
    asked.sort(),
    ['@x/y', 'a', 'b', 'c', 'd', 'e', 'f', 'my-project'],
    'asked once per node',
  )
})

t.test('none', async t => {
  const res = await skills(getState(':skills', async () => false))
  t.strictSame(names(res), { nodes: [], edges: [] })
})

t.test('no provider', async t => {
  await t.rejects(skills(getState(':skills')), {
    message: 'The :skills selector is not supported here',
    cause: { code: 'EQUERY', found: ':skills' },
  })
})

t.test('arguments', async t => {
  for (const q of [':skills(x)', ':skills()']) {
    await t.rejects(
      skills(getState(q, async () => true)),
      {
        message: ':skills takes no arguments',
        cause: { code: 'EQUERY', found: q, wanted: ':skill' },
      },
      q,
    )
    const res = await skills(getState(q, async () => true, true))
    t.strictSame(names(res), { nodes: [], edges: [] }, `${q} loose`)
  }
})
