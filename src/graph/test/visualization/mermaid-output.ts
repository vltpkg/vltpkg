import t from 'tap'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { Graph } from '../../src/graph.ts'
import { mermaidOutput } from '../../src/visualization/mermaid-output.ts'
import { loadActualGraph } from '../fixtures/actual.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('human-readable-output', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        foo: '^1.0.0',
        bar: '^1.0.0',
        missing: '^1.0.0',
      },
    },
  })
  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  t.ok(foo)
  const bar = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('bar', '^1.0.0'),
    {
      name: 'bar',
      version: '1.0.0',
      dependencies: {
        baz: '^1.0.0',
      },
    },
  )
  if (!bar) throw new Error('failed to place bar')
  const baz = graph.placePackage(
    bar,
    'prod',
    Spec.parse('baz', '^1.0.0'),
    {
      name: 'baz',
      version: '1.0.0',
      dist: {
        tarball: 'https://registry.vlt.sh/baz',
      },
    },
  )
  if (!baz) throw new Error('failed to place baz')
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('missing', '^1.0.0'),
  )
  graph.placePackage(baz, 'prod', Spec.parse('foo', '^1.0.0'), {
    name: 'foo',
    version: '1.0.0',
  })
  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print mermaid output',
  )
})

t.test('actual graph', async t => {
  const graph = loadActualGraph(t)
  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print from an actual loaded graph',
  )

  t.test('selected packages', async t => {
    const edges = [...graph.edges].filter(e => e.name === 'baz')
    const nodes = [
      graph.nodes.get(
        joinDepIDTuple(['registry', 'custom', 'baz@1.0.0']),
      )!,
    ]
    t.matchSnapshot(
      mermaidOutput({
        edges,
        importers: graph.importers,
        nodes,
      }),
      'should print selected packages',
    )
  })
})

t.test('workspaces', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt-project.json': JSON.stringify({
      workspaces: { packages: ['./packages/*'] },
    }),
    packages: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
        }),
      },
    },
  })
  const monorepo = Monorepo.load(dir)
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
    monorepo,
  })
  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print workspaces mermaid output',
  )
})

t.test('cycle', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        a: '^1.0.0',
      },
    },
  })
  const a = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('a', '^1.0.0'),
    {
      name: 'a',
      version: '1.0.0',
    },
  )
  if (!a) {
    throw new Error('missing package a')
  }
  const b = graph.placePackage(a, 'prod', Spec.parse('b', '^1.0.0'), {
    name: 'b',
    version: '1.0.0',
    dependencies: {
      a: '^1.0.0',
    },
  })
  if (!b) {
    throw new Error('missing package b')
  }
  graph.placePackage(b, 'prod', Spec.parse('a', '^1.0.0'), {
    name: 'a',
    version: '1.0.0',
  })
  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should print cycle mermaid output',
  )
})
