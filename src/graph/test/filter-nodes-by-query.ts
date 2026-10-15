import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import t from 'tap'
import type { Test } from 'tap'
import {
  assertQuery,
  filterNodesByQuery,
  filterNodesByQueryParts,
} from '../src/filter-nodes-by-query.ts'
import { Graph } from '../src/graph.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: { npm: 'https://registry.npmjs.org/' },
} satisfies SpecOptions

const setup = (t: Test) => {
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
  const bar = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('bar@^1.0.0', configData),
    { name: 'bar', version: '1.0.0' },
  )
  if (!foo || !bar) throw new Error('failed to place deps')
  return { graph, foo, bar }
}

t.test('filterNodesByQuery', async t => {
  const { graph, foo } = setup(t)

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
  // allow-scripts, reify: no part selectors
  await t.rejects(filterNodesByQuery(graph, '#foo:skill(x)'), {
    message: /:skill\(\) only applies/,
  })
})

t.test('filterNodesByQueryParts', async t => {
  const { graph, foo, bar } = setup(t)
  for (const q of [undefined, '', ':not(*)']) {
    t.strictSame(
      await filterNodesByQueryParts(graph, q),
      { ids: new Set(), parts: [] },
      `${q} selects nothing`,
    )
  }
  const all = new Set(graph.nodes.keys())
  t.strictSame(
    await filterNodesByQueryParts(graph, '*'),
    { ids: all, parts: [{ ids: all }] },
    '* selects all, one plain part',
  )
  const { ids, parts } = await filterNodesByQueryParts(
    graph,
    '#foo, #bar:skill(x, "a b", v*)',
  )
  t.strictSame(ids, new Set([foo.id, bar.id]))
  t.strictSame(parts, [
    { ids: new Set([foo.id]) },
    { ids: new Set([bar.id]), patterns: ['x', 'a b', 'v*'] },
  ])
  t.notOk('patterns' in parts[0]!, 'plain part has no patterns')
  t.strictSame(
    await filterNodesByQueryParts(graph, '#nope:skill(x)'),
    { ids: new Set(), parts: [{ ids: new Set(), patterns: ['x'] }] },
    'a part may match nothing',
  )
})

t.test('fails closed w/o security data', async t => {
  const { graph, foo, bar } = setup(t)
  const mock = async (scanned: string[], timedOut?: boolean) =>
    t.mockImport<typeof import('../src/filter-nodes-by-query.ts')>(
      '../src/filter-nodes-by-query.ts',
      {
        '@vltpkg/security-archive': {
          ...(await import('@vltpkg/security-archive')),
          SecurityArchive: {
            start: async () => ({
              has: (id: string) => scanned.includes(id),
              get: () => undefined,
              timedOut,
            }),
          },
        },
      },
    )
  const { filterNodesByQuery, filterNodesByQueryParts } = await mock([
    foo.id,
  ])
  // bar: registry pkg, not scanned; root: not from a registry
  const all = new Set(graph.nodes.keys())
  t.strictSame(
    await filterNodesByQuery(graph, ':not(:malware)'),
    new Set([graph.mainImporter.id, foo.id]),
  )
  // kept, for callers to drop and report
  t.strictSame(
    await filterNodesByQueryParts(graph, ':not(:malware):skill(x)'),
    {
      ids: all,
      parts: [{ ids: all, patterns: ['x'] }],
      unscanned: { ids: new Set([bar.id]), reason: 'unscanned' },
    },
  )
  const timedOut = await mock([], true)
  t.strictSame(
    (await timedOut.filterNodesByQueryParts(graph, ':not(:malware)'))
      .unscanned,
    { ids: new Set([foo.id, bar.id]), reason: 'timeout' },
  )
  const scanned = await mock([foo.id, bar.id])
  t.strictSame(
    await scanned.filterNodesByQueryParts(graph, ':not(:malware)'),
    { ids: all, parts: [{ ids: all }] },
    'all scanned: no unscanned',
  )
})

t.test('assertQuery', async t => {
  for (const q of ['*', '#foo', ':root > *', ':not(:malware)']) {
    await t.resolves(assertQuery(q, 'allow-skills'), q)
  }
  for (const q of ['#foo:skill(x)', ':root > :skill(a*)']) {
    await t.resolves(assertQuery(q, 'allow-skills', ['skill']), q)
  }
  await t.rejects(assertQuery('#foo:skill(x)', 'allow-scripts'), {
    message:
      /^Invalid --allow-scripts query: :skill\(\) only applies/,
    cause: { code: 'EUSAGE', found: '#foo:skill(x)' },
  })
  // typos: suggestions
  await t.rejects(
    assertQuery('#foo:skills(x)', 'allow-skills', ['skill']),
    { cause: { code: 'EUSAGE', validOptions: [':skill'] } },
  )
  await t.rejects(assertQuery(':pr', 'allow-skills'), {
    cause: { validOptions: [':fs', ':is', ':peer', ':prod', ':v'] },
  })
  const none = await assertQuery('#foo[', 'allow-skills').then(
    () => ({ cause: {} }),
    (e: unknown) => e as { cause: object },
  )
  t.notOk('validOptions' in none.cause, 'no suggestions')
  for (const q of ['#foo:skill(x) > *', '#foo:skills(x)']) {
    await t.rejects(
      assertQuery(q, 'allow-skills', ['skill']),
      {
        message: /^Invalid --allow-skills query: /,
        cause: { code: 'EUSAGE', found: q },
      },
      q,
    )
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
