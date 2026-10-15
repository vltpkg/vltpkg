import t from 'tap'
import { Query } from '../../src/index.ts'
import { getSimpleGraph } from '../fixtures/graph.ts'
import type { Test } from 'tap'
import type { QueryOptions } from '../../src/index.ts'

type Opts = Pick<QueryOptions, 'partSelectors'>

const search = (
  q: string,
  opts: Opts = { partSelectors: ['skill'] },
) => {
  const graph = getSimpleGraph()
  return new Query({
    edges: graph.edges,
    nodes: new Set(graph.nodes.values()),
    importers: graph.importers,
    securityArchive: undefined,
    ...opts,
  }).search(q, { signal: new AbortController().signal })
}

const parts = async (q: string) =>
  (await search(q)).parts?.map(({ nodes, ...p }) => ({
    ...p,
    nodes: nodes.map(n => n.name).sort(),
  }))

type QueryErr = Error & {
  cause: { code: string; found: string; wanted?: string }
}
const errorOf = async (q: string, opts?: Opts) =>
  search(q, opts).then(
    () => {
      throw new Error(`expected ${q} to throw`)
    },
    (er: unknown) => er as QueryErr,
  )

const fails = async (
  t: Test,
  queries: string[],
  message: string,
  opts?: Opts,
) => {
  for (const q of queries) {
    const er = await errorOf(q, opts)
    t.equal(er.message, message, q)
    t.equal(er.cause.code, 'EQUERY', q)
  }
}

t.test('patterns', async t => {
  const cases: [string, string[]][] = [
    ['#a:skill(find-skills)', ['find-skills']],
    ['#a:skill("my skill")', ['my skill']],
    [
      '#a:skill(vercel*, *-review, a*b*c, *, **)',
      ['vercel*', '*-review', 'a*b*c', '*', '**'],
    ],
    [
      '#a:skill(X, my.skill, a_b, 3d-print, -x)',
      ['X', 'my.skill', 'a_b', '3d-print', '-x'],
    ],
    ['#a:skill("my "*)', ['my *']],
    ['#a:skill(a\\ b)', ['a b']],
    ['#a:skill(/* c */ a)', ['a']],
    ['#a:skill("it\'s")', ["it's"]],
    ['#a:skill(x)/* c */ /* d */', ['x']],
  ]
  for (const [q, patterns] of cases) {
    t.strictSame(
      await parts(q),
      [{ name: 'skill', patterns, nodes: ['a'] }],
      q,
    )
  }
})

t.test('never filters nodes', async t => {
  const nodesOf = async (q: string) => (await parts(q))?.[0]?.nodes
  t.strictSame(await nodesOf(':skill(x)'), [
    '@x/y',
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'my-project',
  ])
  t.strictSame(await nodesOf('#b :skill(x)'), ['c', 'd', 'e', 'f'])
  t.strictSame(await nodesOf(':root > :skill(x)'), [
    '@x/y',
    'a',
    'b',
    'e',
  ])
})

t.test('specificity', async t => {
  t.strictSame((await search('#a:skill(x)')).specificity, {
    idCounter: 1,
    commonCounter: 1,
  })
})

t.test('errors', async t => {
  await fails(
    t,
    [
      '#a:skill(x) > #b',
      '#a:skill(x):prod',
      '#a:skill(x):skill(y)',
      ':not(#a:skill(x))',
      ':is(#a:skill(x))',
      ':has(#a:skill(x))',
      '#b, #a:skill(x) > *',
    ],
    ':skill() must end a top-level selector',
  )
  await fails(
    t,
    [
      '#a:skill',
      '#a:skill()',
      '#a:skill( )',
      '#a:skill(a,)',
      '#a:skill(/* c */)',
      '#a:skill("")',
    ],
    'Missing skill name in :skill()',
  )
  await fails(
    t,
    ['#a:skill(a b)', '#a:skill(x > y)', '#b, #a:skill(a b)'],
    'Invalid skill name in :skill(), quote names with spaces',
  )
  await fails(
    t,
    ["#a:skill('b c')", "#a:skill(x, 'y')", "#a:skill('y'*)"],
    'Invalid skill name in :skill(), use double quotes',
  )
  await fails(
    t,
    [
      '#a:skill(#x)',
      '#a:skill(:prod)',
      '#a:skill([x])',
      '#a:skill(a|b)',
      '#a:skill(|a)',
      '#a:skill(a|*)',
      '#a:skill(a&b)',
    ],
    'Invalid skill name in :skill()',
  )
  t.equal((await errorOf('#a:skill(a b)')).cause.found, ':skill(a b)')
  t.equal(
    (await errorOf('#a:skill(x) > #b')).cause.found,
    ':skill(x)',
  )
})

t.test('opt-in', async t => {
  const queries = ['#a:skill(x)', '#a, #b:skill(x)', '#a:skill()']
  const message =
    ':skill() only applies to --allow-skills and vlt skills'
  for (const opts of [{}, { partSelectors: [] }]) {
    await fails(t, queries, message, opts)
    // position is checked first
    await fails(
      t,
      [':not(#a:skill(x))'],
      ':skill() must end a top-level selector',
      opts,
    )
  }
})

t.test('typo', async t => {
  const er = await errorOf('#a:skills(x)')
  t.equal(er.message, 'Unsupported pseudo-class: :skills')
  t.equal(er.cause.wanted, ':skill')
  // loose in a comma list: silently empty
  t.strictSame(await parts('#a, #b:skills(x)'), [
    { nodes: ['a'] },
    { nodes: [] },
  ])
})
