import { inspect } from 'node:util'
import t from 'tap'
import { ConfigFileData } from '@vltpkg/config'
import { Spec } from '@vltpkg/spec'
import { Graph } from '../../src/graph.js'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.js'

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
  },
} as ConfigFileData

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
        baz: '^1.0.0',
      },
    },
  )
  if (!bar) throw new Error('failed to place bar')
  const baz = graph.placePackage(
    bar,
    'dependencies',
    Spec.parse('baz', '^1.0.0'),
    {
      name: 'baz',
      version: '1.0.0',
      dist: {
        tarball: 'https://registry.vlt.sh/baz',
        integrity: 'sha512-deadbeef',
      },
    },
  )
  if (!baz) throw new Error('failed to place baz')
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
  t.matchSnapshot(
    inspect(humanReadableOutput(graph)),
    'should print human readable output',
  )
})
