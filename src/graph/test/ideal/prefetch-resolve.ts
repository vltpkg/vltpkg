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
const packageInfo = (
  seen: [string, ResolveRequest][],
  released: string[] = [],
) =>
  ({
    prefetchResolve: (registry: string, request: ResolveRequest) => {
      seen.push([registry, request])
      return () => released.push('release')
    },
  }) as unknown as PackageInfoClient

/** An importer, with the edges its starting graph already has. */
const importer = (
  manifest: Record<string, unknown>,
  edges: Record<string, unknown>[] = [],
) => ({
  manifest,
  edgesOut: new Map(edges.map(e => [e.name as string, e])),
})

/** An importer edge that resolves `name@spec` to a node, or to nothing. */
const edge = (
  name: string,
  spec: string,
  to?: { name: string; version: string },
  valid = true,
) => ({ name, spec: { bareSpec: spec }, to, valid: () => valid })

t.test('prefetchResolve', async t => {
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

    prefetchResolve(graph, packageInfo(seen), options)
    t.equal(seen.length, 1, 'one request')
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

  t.test(
    'keeps scoped-registry names out, and their scopes in stop',
    async t => {
      const seen: [string, ResolveRequest][] = []
      const graph = graphOf(
        [
          importer({
            dependencies: { a: '^1.0.0', '@corp/ui': '^2.0.0' },
          }),
        ],
        [
          { name: '@corp/util', version: '1.0.0', manifest: {} },
          { name: 'x', version: '1.0.0', manifest: {} },
        ],
      )
      prefetchResolve(graph, packageInfo(seen), {
        ...options,
        'scoped-registries': { '@corp': 'https://corp.example/' },
      })
      const request = seen[0]![1]
      t.strictSame(request.roots, [{ name: 'a', spec: '^1.0.0' }])
      t.strictSame(request.have, ['x@1.0.0'])
      t.strictSame(request.stop, { scopes: ['@corp'] })
    },
  )

  t.test(
    'leaves out a root the starting graph satisfies',
    async t => {
      const seen: [string, ResolveRequest][] = []
      const a = { name: 'a', version: '1.2.0', manifest: {} }
      const graph = graphOf(
        [
          importer({ dependencies: { a: '^1.0.0', b: '^2.0.0' } }, [
            edge('a', '^1.0.0', a),
          ]),
        ],
        [a],
      )
      prefetchResolve(graph, packageInfo(seen), options)
      t.strictSame(
        seen[0]![1].roots,
        [{ name: 'b', spec: '^2.0.0' }],
        'only the root the graph has nothing for',
      )
      t.strictSame(seen[0]![1].have, ['a@1.2.0'])
    },
  )

  t.test(
    'sends nothing for a graph that satisfies every root',
    async t => {
      const seen: [string, ResolveRequest][] = []
      const a = { name: 'a', version: '1.2.0' }
      const graph = graphOf(
        [
          importer({ dependencies: { a: '^1.0.0' } }, [
            edge('a', '^1.0.0', a),
          ]),
        ],
        [a],
      )
      const end = prefetchResolve(graph, packageInfo(seen), options)
      t.strictSame(
        seen,
        [],
        'a lockfile install asks the server nothing',
      )
      t.doesNotThrow(end, 'and there is nothing to end')
    },
  )

  t.test(
    'sends a root whose spec moved on from its edge',
    async t => {
      const seen: [string, ResolveRequest][] = []
      const a = { name: 'a', version: '1.2.0' }
      const graph = graphOf(
        [
          importer({ dependencies: { a: '^2.0.0' } }, [
            edge('a', '^1.0.0', a),
          ]),
        ],
        [a],
      )
      prefetchResolve(graph, packageInfo(seen), options)
      t.strictSame(seen[0]![1].roots, [{ name: 'a', spec: '^2.0.0' }])
    },
  )

  t.test('sends a root whose edge is missing or invalid', async t => {
    const seen: [string, ResolveRequest][] = []
    const a = { name: 'a', version: '1.2.0', manifest: {} }
    const graph = graphOf(
      [
        importer({ dependencies: { a: '^1.0.0', b: '^1.0.0' } }, [
          edge('a', '^1.0.0', a, false),
          edge('b', '^1.0.0', undefined),
        ]),
      ],
      [a],
    )
    prefetchResolve(graph, packageInfo(seen), options)
    t.strictSame(seen[0]![1].roots, [
      { name: 'a', spec: '^1.0.0' },
      { name: 'b', spec: '^1.0.0' },
    ])
  })

  t.test(
    'hands back the function that releases the resolve',
    async t => {
      const seen: [string, ResolveRequest][] = []
      const released: string[] = []
      const graph = graphOf([
        importer({ dependencies: { a: '^1.0.0' } }),
      ])
      const release = prefetchResolve(
        graph,
        packageInfo(seen, released),
        options,
      )
      t.strictSame(released, [], 'not released by starting it')
      release()
      t.strictSame(released, ['release'])
    },
  )

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
    const end = prefetchResolve(graph, packageInfo(seen), {
      ...options,
      modifiers: {},
    })
    t.strictSame(seen, [])
    t.doesNotThrow(end)
  })

  t.test('skips when there are no registry roots', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({ dependencies: { g: 'github:o/r' } }),
    ])
    prefetchResolve(graph, packageInfo(seen), options)
    t.strictSame(seen, [])
  })

  t.test('skips without a default registry', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      importer({ dependencies: { a: '^1.0.0' } }),
    ])
    prefetchResolve(graph, packageInfo(seen), {
      registries: {},
    })
    t.strictSame(seen, [])
  })

  t.test('skips an importer with no manifest', async t => {
    const seen: [string, ResolveRequest][] = []
    const graph = graphOf([
      { manifest: undefined, edgesOut: new Map() },
    ])
    prefetchResolve(graph, packageInfo(seen), options)
    t.strictSame(seen, [])
  })
})
