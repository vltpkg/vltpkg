import { inspect } from 'node:util'
import t from 'tap'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Graph } from '../src/graph.js'
import { appendNodes } from '../src/append-nodes.js'

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

t.test('append a new node to a graph from a registry', async t => {
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
    dependencies: {
      foo: '^1.0.0',
    },
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
        case 'borked':
          throw new Error('ERR')
        default:
          return null
      }
    },
  } as PackageInfoClient
  t.strictSame(
    graph.mainImporter.edgesOut.size,
    0,
    'has no direct dependency yet',
  )
  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [Spec.parse('foo@^1.0.0')],
    'dependencies',
    configData,
  )
  t.strictSame(
    [...graph.mainImporter.edgesOut.values()].map(
      e => e.to?.manifest?.name,
    ),
    ['foo'],
    'should have a direct dependency on foo',
  )
  const barPkg = graph.manifests.get('registry;;bar@1.0.0')
  if (!barPkg) {
    throw new Error('Package could not be retrieved')
  }
  t.strictSame(
    barPkg.name,
    'bar',
    'should have added to inventory transitive dependencies',
  )

  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [Spec.parse('bar')],
    'dependencies',
    configData,
  )
  t.strictSame(
    graph.mainImporter.edgesOut.get('bar')?.spec.semver,
    '',
    'should add a direct dependency on latest bar',
  )

  await t.rejects(
    appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [Spec.parse('borked')],
      'dependencies',
      configData,
    ),
    /ERR/,
    'should not intercept errors on fetching / parsing manifest',
  )
})

t.test('append different type of dependencies', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    devDependencies: {
      baz: '^1.0.0',
    },
  }
  const barManifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    devDependencies: {
      foo: '^1.0.0',
    },
    optionalDependencies: {
      bar: '^1.0.0',
    },
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
        default:
          return null
      }
    },
  } as PackageInfoClient
  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [Spec.parse('foo', '^1.0.0')],
    'devDependencies',
    configData,
  )

  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [Spec.parse('bar', '^1.0.0')],
    'optionalDependencies',
    configData,
  )

  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [Spec.parse('missing', '^1.0.0')],
    'dependencies',
    configData,
  )
  t.matchSnapshot(
    inspect(graph, { depth: 3 }),
    'should install different type of deps on different conditions',
  )
})
