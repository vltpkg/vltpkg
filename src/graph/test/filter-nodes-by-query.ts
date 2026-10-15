import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import t from 'tap'
import {
  assertQuery,
  filterNodesByQuery,
} from '../src/filter-nodes-by-query.ts'
import { Graph } from '../src/graph.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: { npm: 'https://registry.npmjs.org/' },
} satisfies SpecOptions

t.test('filterNodesByQuery', async t => {
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  const graph = new Graph({
    ...configData,
    mainManifest: { name: 'root', version: '1.0.0' },
    projectRoot,
  })
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo@^1.0.0', configData),
    { name: 'foo', version: '1.0.0' },
  )
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('bar@^1.0.0', configData),
    { name: 'bar', version: '1.0.0' },
  )
  if (!foo) throw new Error('failed to place foo')

  for (const q of [undefined, '', ':not(*)']) {
    t.strictSame(
      await filterNodesByQuery(graph, q),
      new Set(),
      `${q} selects nothing`,
    )
  }
  t.strictSame(
    await filterNodesByQuery(graph, '*'),
    new Set(graph.nodes.keys()),
    '* selects all',
  )
  t.strictSame(
    await filterNodesByQuery(graph, '#foo'),
    new Set([foo.id]),
    'query selects matches',
  )
})

t.test('assertQuery', async t => {
  for (const q of ['*', '#foo', ':root > *', ':not(:malware)']) {
    await t.resolves(assertQuery(q, 'allow-skills'), q)
  }
  for (const q of ['#foo[', ':nope', 'a,,b', ':not(']) {
    await t.rejects(
      assertQuery(q, 'allow-skills'),
      {
        message: /^Invalid --allow-skills query: /,
        cause: { code: 'EUSAGE', found: q },
      },
      q,
    )
  }
})
