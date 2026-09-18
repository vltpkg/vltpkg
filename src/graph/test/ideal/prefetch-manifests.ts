import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import { prefetchManifests } from '../../src/ideal/prefetch-manifests.ts'
import type { Graph } from '../../src/graph.ts'

const options = {
  registry: 'https://registry.npmjs.org/',
  registries: { npm: 'https://registry.npmjs.org/' },
} as SpecOptions

/** A graph stub holding just the nodes the prefetch walks. */
const graphOf = (nodes: Record<string, any>[]): Graph =>
  ({
    nodes: new Map(nodes.map(n => [n.id, n])),
  }) as unknown as Graph

/** A PackageInfoClient stub that records what it was asked to prefetch. */
const packageInfo = (seen: unknown[][]) =>
  ({
    prefetchManifests: (wanted: unknown[]) => {
      seen.push(wanted)
    },
  }) as unknown as PackageInfoClient

const registryNode = (name: string, version: string) => ({
  id: joinDepIDTuple(['registry', '', `${name}@${version}`]),
  name,
  version,
})

t.test('does nothing at all when the flag is off', async t => {
  t.intercept(process, 'env', { value: {} })
  const seen: unknown[][] = []
  const graph = graphOf([registryNode('a', '1.0.0')])

  t.equal(prefetchManifests(graph, packageInfo(seen), options), 0)
  t.strictSame(seen, [], 'the client is never touched')
})

t.test('with the flag on', async t => {
  t.beforeEach(() =>
    t.intercept(process, 'env', {
      value: { VLT_BATCH_MANIFESTS: '1' },
    }),
  )

  t.test('asks for every bare registry node', async t => {
    const seen: unknown[][] = []
    const graph = graphOf([
      registryNode('a', '1.0.0'),
      registryNode('@scope/b', '2.3.4'),
    ])

    t.equal(prefetchManifests(graph, packageInfo(seen), options), 2)
    t.strictSame(seen[0], [
      {
        registry: 'https://registry.npmjs.org/',
        name: 'a',
        version: '1.0.0',
      },
      {
        registry: 'https://registry.npmjs.org/',
        name: '@scope/b',
        version: '2.3.4',
      },
    ])
  })

  t.test('skips nodes that already carry a manifest', async t => {
    const seen: unknown[][] = []
    const graph = graphOf([
      { ...registryNode('a', '1.0.0'), manifest: { name: 'a' } },
      registryNode('b', '1.0.0'),
    ])

    prefetchManifests(graph, packageInfo(seen), options)
    t.strictSame(
      (seen[0] as { name: string }[]).map(w => w.name),
      ['b'],
    )
  })

  t.test('skips nodes with no name to ask under', async t => {
    const seen: unknown[][] = []
    const graph = graphOf([
      { id: joinDepIDTuple(['registry', '', 'a@1.0.0']) },
    ])

    prefetchManifests(graph, packageInfo(seen), options)
    t.strictSame(seen[0], [])
  })

  t.test('skips anything not fetched from a registry', async t => {
    const seen: unknown[][] = []
    const graph = graphOf([
      { id: joinDepIDTuple(['file', './local']), name: 'local' },
      {
        id: joinDepIDTuple(['git', 'github:a/b', 'main']),
        name: 'b',
      },
      registryNode('keep', '1.0.0'),
    ])

    prefetchManifests(graph, packageInfo(seen), options)
    t.strictSame(
      (seen[0] as { name: string }[]).map(w => w.name),
      ['keep'],
    )
  })

  t.test('skips an id that will not hydrate', async t => {
    const seen: unknown[][] = []
    const graph = graphOf([{ id: 'nonsense', name: 'a' }])

    prefetchManifests(graph, packageInfo(seen), options)
    t.strictSame(seen[0], [], 'a bad id is left to the per-name path')
  })
})
