import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.ts'
import { loadActualGraph } from '../fixtures/actual.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    custom: 'http://example.com',
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
    'dev',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  t.ok(foo)
  const bar = graph.placePackage(
    graph.mainImporter,
    'optional',
    Spec.parse('bar', '^1.0.0'),
    {
      name: 'bar',
      version: '1.0.0',
      dependencies: {
        baz: 'custom:baz@^1.0.0',
      },
    },
  )
  if (!bar) throw new Error('failed to place bar')
  const baz = graph.placePackage(
    bar,
    'dev',
    Spec.parse('baz', 'custom:baz@^1.0.0', configData as SpecOptions),
    {
      name: 'baz',
      version: '1.0.0',
      dist: {
        tarball: 'http://example.com/baz',
        integrity: 'sha512-deadbeef',
      },
    },
  )
  if (!baz) throw new Error('failed to place baz')
  baz.setResolved()
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('missing', '^1.0.0'),
  )
  graph.placePackage(baz, 'prod', Spec.parse('foo', '^1.0.0'), {
    name: 'foo',
    version: '1.0.0',
  })
  const extraneous = graph.placePackage(
    bar,
    'prod',
    Spec.parse(
      'extraneous',
      'extraneous@^1.0.0',
      configData as SpecOptions,
    ),
    {
      name: 'extraneous',
      version: '1.0.0',
    },
  )
  if (!extraneous) throw new Error('failed to place extraneous')
  const [edge] = extraneous.edgesIn
  if (!edge) {
    throw new Error('failed to find extraneous edge')
  }
  graph.extraneousDependencies.add(edge)
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
    'should print human readable output',
  )
})

t.test('actual graph', async t => {
  const graph = loadActualGraph(t)
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
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
      humanReadableOutput(
        {
          edges,
          highlightSelection: true,
          importers: graph.importers,
          nodes,
        },
        {},
      ),
      'should print selected packages',
    )
  })

  t.test('colors', async t => {
    t.matchSnapshot(
      humanReadableOutput(
        {
          edges: [...graph.edges],
          highlightSelection: false,
          importers: graph.importers,
          nodes: [...graph.nodes.values()],
        },
        { colors: true },
      ),
      'should use colors',
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
    'vlt.json': JSON.stringify({
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
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
    'should print human readable workspaces output',
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
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
    'should print cycle human readable output',
  )
})

t.test('nameless package', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {},
  })
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
    'should fallback to printing package id if name is missing',
  )
})

t.test('versionless package', async t => {
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
  graph.placePackage(
    graph.mainImporter,
    'optional',
    Spec.parse('a', '^1.0.0'),
    { name: 'a' },
  )
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
    'should skip printing version number',
  )
})

t.test('aliased package', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        a: 'npm:@myscope/foo@^1.0.0',
      },
    },
  })
  graph.placePackage(
    graph.mainImporter,
    'optional',
    Spec.parse('a', 'npm:@myscope/foo@^1.0.0'),
    { name: '@myscope/foo', version: '1.0.0' },
  )
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
    'should print both edge and node names',
  )
})

t.test('confused package', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        'different-name': '^1.0.0',
      },
    },
  })
  graph.placePackage(
    graph.mainImporter,
    'optional',
    Spec.parse('different-name', '^1.0.0'),
    { name: 'actual-name', version: '1.0.0' },
  )
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
    'should print both spec and manifest names when they differ',
  )
})

t.test('missing optional', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      optionalDependencies: {
        a: '^1.0.0',
      },
    },
  })
  graph.placePackage(
    graph.mainImporter,
    'optional',
    Spec.parse('a', '^1.0.0'),
  )
  t.matchSnapshot(
    humanReadableOutput(
      {
        edges: [...graph.edges],
        highlightSelection: false,
        importers: graph.importers,
        nodes: [...graph.nodes.values()],
      },
      {},
    ),
    'should print missing optional package',
  )

  t.test('colors', async t => {
    t.matchSnapshot(
      humanReadableOutput(
        {
          edges: [...graph.edges],
          highlightSelection: false,
          importers: graph.importers,
          nodes: [...graph.nodes.values()],
        },
        { colors: true },
      ),
      'should use colors',
    )
  })
})
