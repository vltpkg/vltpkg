import t from 'tap'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'
import { Graph } from '../../src/graph.js'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.js'

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    custom: 'http://example.com',
    npm: 'https://registry.npmjs.org',
  },
} satisfies SpecOptions

t.test('human-readable-output', async t => {
  const graph = new Graph(
    {
      mainManifest: {
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
          bar: '^1.0.0',
          missing: '^1.0.0',
        },
      },
    },
    configData,
  )
  const foo = graph.placePackage(
    graph.mainImporter,
    'dependencies',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  t.ok(foo)
  const bar = graph.placePackage(
    graph.mainImporter,
    'dependencies',
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
    'dependencies',
    Spec.parse('baz', 'custom:bar@^1.0.0', configData as SpecOptions),
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
    'dependencies',
    Spec.parse('missing', '^1.0.0'),
  )
  graph.placePackage(
    baz,
    'dependencies',
    Spec.parse('foo', '^1.0.0'),
    {
      name: 'foo',
      version: '1.0.0',
    },
  )
  const extraneous = graph.placePackage(
    bar,
    'dependencies',
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
    humanReadableOutput(graph),
    'should print human readable output',
  )
})

t.test('workspaces', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt-workspaces.json': JSON.stringify({
      packages: ['./packages/*'],
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
  const graph = new Graph(
    {
      mainManifest,
      monorepo,
    },
    configData,
  )
  t.matchSnapshot(
    humanReadableOutput(graph),
    'should print human readable workspaces output',
  )
})

t.test('cycle', async t => {
  const graph = new Graph(
    {
      mainManifest: {
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          a: '^1.0.0',
        },
      },
    },
    configData,
  )
  const a = graph.placePackage(
    graph.mainImporter,
    'dependencies',
    Spec.parse('a', '^1.0.0'),
    {
      name: 'a',
      version: '1.0.0',
    },
  )
  if (!a) {
    throw new Error('missing package a')
  }
  const b = graph.placePackage(
    a,
    'dependencies',
    Spec.parse('b', '^1.0.0'),
    {
      name: 'b',
      version: '1.0.0',
      dependencies: {
        a: '^1.0.0',
      },
    },
  )
  if (!b) {
    throw new Error('missing package b')
  }
  graph.placePackage(b, 'dependencies', Spec.parse('a', '^1.0.0'), {
    name: 'a',
    version: '1.0.0',
  })
  t.matchSnapshot(
    humanReadableOutput(graph),
    'should print cycle human readable output',
  )
})
