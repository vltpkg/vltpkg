import t from 'tap'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Graph } from '../../src/graph.js'
import { addNodes } from '../../src/ideal/add-nodes.js'
import { asDepID } from '@vltpkg/dep-id'
import { Dependency } from '../../src/dependencies.js'
import { humanReadableOutput } from '../../src/index.js'

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
  },
} satisfies SpecOptions

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')
Object.assign(Spec.prototype, {
  [kCustomInspect]() {
    return `Spec {${this}}`
  },
})

t.test('addNodes', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    dependencies: {
      bar: '^1.0.0',
    },
  }
  const barManifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const graph = new Graph({
    ...configData,
    mainManifest,
  })
  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'bar':
          return barManifest
        case 'foo':
          return fooManifest
      }
    },
  } as PackageInfoClient
  const addEntry = (name: string) =>
    new Map(
      Object.entries({
        foo: {
          spec: Spec.parse(name, '^1.0.0'),
          type: 'prod',
        } satisfies Dependency,
      }),
    )

  t.matchSnapshot(humanReadableOutput(graph), 'initial graph')

  await addNodes({
    add: new Map([[asDepID('file;.'), addEntry('foo')]]),
    graph,
    packageInfo,
  })
  t.matchSnapshot(
    humanReadableOutput(graph),
    'graph with an added foo',
  )

  t.rejects(
    addNodes({
      add: new Map([[asDepID('file;unknown'), addEntry('foo')]]),
      graph,
      packageInfo,
    }),
    /Could not find importer/,
    'should throw an error if finding an unknown importer id',
  )

  await addNodes({
    add: new Map([[asDepID('file;.'), addEntry('foo')]]),
    graph,
    packageInfo,
  })
  t.matchSnapshot(
    humanReadableOutput(graph),
    'graph after adding foo when there is an already existing foo',
  )

  // place a missing package bar on the main importer
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('bar', '^1.0.0'),
  )
  t.matchSnapshot(
    humanReadableOutput(graph),
    'graph with missing package bar',
  )

  // now it should install the package bar to the main importer
  await addNodes({
    add: new Map([[asDepID('file;.'), addEntry('bar')]]),
    graph,
    packageInfo,
  })
  t.matchSnapshot(
    humanReadableOutput(graph),
    'graph after adding a previously missing dependency bar',
  )
})
