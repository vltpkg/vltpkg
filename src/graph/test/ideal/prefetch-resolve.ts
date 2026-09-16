import t from 'tap'
import type {
  PackageInfoClient,
  ResolveRequest,
} from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import { prefetchResolve } from '../../src/ideal/prefetch-resolve.ts'
import type { Graph } from '../../src/graph.ts'

const options = {
  registry: 'https://registry.npmjs.org/',
  registries: { npm: 'https://registry.npmjs.org/' },
} as SpecOptions

/** A graph stub with importers and nodes. */
const graphOf = (
  importers: Record<string, any>[],
  nodes: Record<string, any>[] = [],
): Graph =>
  ({
    importers: new Set(importers),
    nodes: new Map(nodes.map((n, i) => [`node-${i}`, n])),
  }) as unknown as Graph

/** A PackageInfoClient stub that records what it was asked to resolve. */
const packageInfo = (seen: [string, ResolveRequest][]) =>
  ({
    prefetchResolve: (registry: string, request: ResolveRequest) => {
      seen.push([registry, request])
    },
  }) as unknown as PackageInfoClient

const importer = (manifest: Record<string, unknown>) => ({ manifest })

t.test('does nothing at all when the flag is off', async t => {
  t.intercept(process, 'env', { value: { ...process.env } })
  delete (process.env as Record<string, string>).VLT_BATCH_RESOLVE
  const seen: [string, ResolveRequest][] = []
  const graph = graphOf([importer({ dependencies: { a: '^1.0.0' } })])

  t.equal(prefetchResolve(graph, packageInfo(seen), options), 0)
  t.strictSame(seen, [], 'the client is never touched')
})

t.test('with the flag on', async t => {
  t.beforeEach(t =>
    t.intercept(process, 'env', {
      value: { ...process.env, VLT_BATCH_RESOLVE: '1' },
    }),
  )

  t.test('collects deps of every importer, deduplicated', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({
        dependencies: { a: '^1.0.0' },
        devDependencies: { b: '~2.0.0' },
        optionalDependencies: { c: '3.x' },
      }),
      importer({ dependencies: { a: '^1.0.0', d: 'latest' } }),
    ])

    t.equal(prefetchResolve(graph, packageInfo(seen), options), 4)
    const [registry, request] = seen[0]!
    t.equal(registry, options.registry)
    t.strictSame(request.roots, [
      { name: 'a', spec: '^1.0.0' },
      { name: 'b', spec: '~2.0.0' },
      { name: 'c', spec: '3.x' },
      { name: 'd', spec: 'latest' },
    ])
  })

  t.test('sends the platform it resolves for', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({ dependencies: { a: '^1.0.0' } }),
    ])
    prefetchResolve(graph, packageInfo(seen), options)

    const { platform } = seen[0]![1]
    t.equal(platform?.os, process.platform)
    t.equal(platform?.cpu, process.arch)
    t.equal(platform?.node, process.versions.node)
  })

  t.test('leaves protocol specs to the client', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({
        dependencies: {
          a: '^1.0.0',
          g: 'github:org/repo#v1',
          w: 'workspace:*',
          f: 'file:../f',
          weird: 123,
        },
      }),
    ])
    prefetchResolve(graph, packageInfo(seen), options)
    t.strictSame(
      seen[0]![1].roots.map(r => r.name),
      ['a'],
    )
  })

  t.test('puts scoped-registry scopes in stop', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({ dependencies: { a: '^1.0.0' } }),
    ])
    prefetchResolve(graph, packageInfo(seen), {
      ...options,
      'scoped-registries': { '@corp': 'https://corp.example/' },
    })
    t.strictSame(seen[0]![1].stop, { scopes: ['@corp'] })
  })

  t.test('sends held versions as have', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf(
      [importer({ dependencies: { a: '^1.0.0' } })],
      [
        { name: 'x', version: '1.0.0', manifest: { name: 'x' } },
        { name: 'bare' },
      ],
    )
    prefetchResolve(graph, packageInfo(seen), options)
    t.strictSame(seen[0]![1].have, ['x@1.0.0'])
  })

  t.test('skips entirely when modifiers are active', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({ dependencies: { a: '^1.0.0' } }),
    ])
    t.equal(
      prefetchResolve(graph, packageInfo(seen), {
        ...options,
        modifiers: {},
      }),
      0,
    )
    t.strictSame(seen, [])
  })

  t.test('skips when there are no registry roots', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({ dependencies: { g: 'github:o/r' } }),
    ])
    t.equal(prefetchResolve(graph, packageInfo(seen), options), 0)
    t.strictSame(seen, [])
  })

  t.test('skips without a default registry', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({ dependencies: { a: '^1.0.0' } }),
    ])
    t.equal(
      prefetchResolve(graph, packageInfo(seen), {
        registries: {},
      }),
      0,
    )
    t.strictSame(seen, [])
  })

  t.test('skips an importer with no manifest', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([{ manifest: undefined }])
    t.equal(prefetchResolve(graph, packageInfo(seen), options), 0)
  })
})
