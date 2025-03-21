import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import { inspect } from 'node:util'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { asDependency } from '../../src/dependencies.ts'
import type { Dependency } from '../../src/dependencies.ts'
import { Graph } from '../../src/graph.ts'
import { appendNodes } from '../../src/ideal/append-nodes.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'

Object.assign(Spec.prototype, {
  [kCustomInspect](this: Spec) {
    return `Spec {${this}}`
  },
})

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('append a new node to a graph from a registry', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    optionalDependencies: {
      baz: '^1.0.0',
    },
    dependencies: {
      bar: '^1.0.0',
      bundled: '*',
    },
    bundleDependencies: ['bundled'],
  }
  const bazManifest: Manifest = {
    name: 'baz',
    version: '1.0.0',
  }
  const barManifest: Manifest = {
    name: 'bar',
    version: '1.0.0',
    // this optional dependency hits the code paths where it's
    // missing and can't be fetched, but that's ok
    optionalDependencies: {
      borked: '*',
      metaborked: '*',
    },
  }
  const ipsumManifest: Manifest = {
    name: 'ipsum',
    version: '1.0.0',
  }
  const metaborkedManifest: Manifest = {
    name: 'metaborked',
    version: '1.0.0',
    dependencies: {
      borked: '*',
    },
  }
  const mainManifest: Manifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  }
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
  })
  const depFoo = asDependency({
    spec: Spec.parse('foo@^1.0.0'),
    type: 'prod',
  })
  const depBar = asDependency({
    spec: Spec.parse('bar@'),
    type: 'prod',
  })
  const depNamelessGit = asDependency({
    spec: Spec.parseArgs('github:lorem/ipsum'),
    type: 'prod',
  })
  const depBorked = asDependency({
    spec: Spec.parse('borked'),
    type: 'prod',
  })
  const add = new Map([
    ['foo', depFoo],
    ['bar', depBar],
    ['borked', depBorked],
    // nameless specs get their stringified value as the key
    [String(depNamelessGit.spec), depNamelessGit],
  ])
  const packageInfo = {
    async manifest(spec: Spec) {
      if (spec.type === 'git') {
        return ipsumManifest
      }
      switch (spec.name) {
        case 'metaborked':
          return metaborkedManifest
        case 'baz':
          return bazManifest
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
  const scurry = new PathScurry(t.testdirName)
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    scurry,
    configData,
    new Set(),
  )
  t.strictSame(
    [...graph.mainImporter.edgesOut.values()].map(
      e => e.to?.manifest?.name,
    ),
    ['foo'],
    'should have a direct dependency on foo',
  )
  const barPkg = graph.manifests.get(
    joinDepIDTuple(['registry', '', 'bar@1.0.0']),
  )
  if (!barPkg) {
    throw new Error('Package could not be retrieved')
  }
  t.strictSame(
    barPkg.name,
    'bar',
    'should have added to inventory transitive dependencies',
  )
  const bazNodeSet = graph.nodesByName.get('baz')
  t.match(
    bazNodeSet,
    new Set([{ id: joinDepIDTuple(['registry', '', 'baz@1.0.0']) }]),
    'got baz nodes',
  )
  t.equal(bazNodeSet?.size, 1)

  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depBar],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  t.strictSame(
    graph.mainImporter.edgesOut.get('bar')?.spec.semver,
    '',
    'should add a direct dependency on latest bar',
  )

  await t.rejects(
    appendNodes(
      add,
      packageInfo,
      graph,
      graph.mainImporter,
      [depBorked],
      new PathScurry(t.testdirName),
      configData,
      new Set(),
    ),
    /ERR/,
    'should not intercept errors on fetching / parsing manifest',
  )

  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depNamelessGit],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  t.matchSnapshot(
    [...add].map(([name, dep]) => [
      name,
      { spec: String(dep.spec), type: dep.type },
    ]),
    'should have fixed the spec name for the nameless git dep',
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
    projectRoot: t.testdirName,
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
  const depFoo = asDependency({
    spec: Spec.parse('foo', '^1.0.0'),
    type: 'dev',
  })
  const depBar = asDependency({
    spec: Spec.parse('bar', '^1.0.0'),
    type: 'optional',
  })
  const depMissing = asDependency({
    spec: Spec.parse('missing', '^1.0.0'),
    type: 'prod',
  })
  const add = new Map([
    ['foo', depFoo],
    ['bar', depBar],
    ['missing', depMissing],
  ])
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )

  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depBar],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )

  await t.rejects(
    appendNodes(
      add,
      packageInfo,
      graph,
      graph.mainImporter,
      [depMissing],
      new PathScurry(t.testdirName),
      configData,
      new Set(),
    ),
    /failed to resolve dependency/,
    'should throw if failes to create a node for a given manifest',
  )
  t.matchSnapshot(
    inspect(graph, { depth: 4 }),
    'should install different type of deps on different conditions',
  )
})

t.test('append file type of nodes', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    dependencies: {
      bar: 'file:./bar',
      baz: 'file:./baz.tgz',
    },
  }
  const barManifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const bazManifest = {
    name: 'baz',
    version: '1.0.0',
  }
  const linkedManifest = {
    name: 'linked',
    version: '1.0.0',
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      linked: '^1.0.0',
    },
  }
  const graph = new Graph({
    projectRoot: t.testdir({
      bar: { 'package.json': JSON.stringify(barManifest) },
      linked: { 'package.json': JSON.stringify(linkedManifest) },
    }),
    ...configData,
    mainManifest,
  })
  const depFoo = asDependency({
    spec: Spec.parse('foo@^1.0.0'),
    type: 'prod',
  })
  const depLinked = asDependency({
    spec: Spec.parse('linked@file:./linked'),
    type: 'prod',
  })
  const add = new Map([
    ['foo', depFoo],
    ['linked', depLinked],
  ])
  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'bar':
          return barManifest
        case 'baz':
          return bazManifest
        case 'foo':
          return fooManifest
        case 'linked':
          return linkedManifest
        case 'borked':
          throw new Error('ERR')
        default:
          return null
      }
    },
  } as PackageInfoClient
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depLinked],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    new PathScurry(t.testdirName),
    configData,
    new Set(),
  )
  t.matchSnapshot(
    objectLikeOutput(graph),
    'should have a graph with file type dependencies',
  )
})

t.test('resolve against the correct registries', async t => {
  const mainManifest = {
    version: '1.0.0',
    dependencies: {
      bar: 'a:bar@1.x',
      baz: 'b:baz@1.x',
    },
  }
  const abarManifest = {
    name: 'bar',
    version: '1.2.3',
    dependencies: { x: '1.x' },
  }
  const axManifest = {
    name: 'x',
    version: '1.99.99',
    description: 'x on a',
    dependencies: { y: '1' },
  }
  const ayManifest = { name: 'y', version: '1.99.99' }
  const bbazManifest = {
    name: 'baz',
    version: '1.2.3',
    dependencies: { x: '1.x' },
  }
  const bxManifest = {
    name: 'x',
    version: '1.99.99',
    description: 'x on b',
    dependencies: { y: '1000' },
  }
  const byManifest = { name: 'y', version: '1000.0.0' }

  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
  })

  const registries = {
    a: 'https://a.example.com/',
    b: 'https://b.example.com/',
  }

  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'bar':
          switch (spec.registry) {
            case registries.a:
              return abarManifest
            default:
              throw new Error('404 - bar', { cause: { spec } })
          }
        case 'baz':
          switch (spec.registry) {
            case registries.b:
              return bbazManifest
            default:
              throw new Error('404 - baz', { cause: { spec } })
          }
        case 'x':
          switch (spec.registry) {
            case registries.a:
              return axManifest
            case registries.b:
              return bxManifest
            default:
              throw new Error('404 - x', { cause: { spec } })
          }
        case 'y':
          switch (spec.registry) {
            case registries.a:
              return ayManifest
            case registries.b:
              return byManifest
            default:
              throw new Error('404 - y', { cause: { spec } })
          }
        default:
          throw new Error('404 - ' + spec.name, { cause: { spec } })
      }
    },
  } as PackageInfoClient

  const graph = new Graph({
    projectRoot,
    mainManifest,
    registries,
  })
  const deps: Dependency[] = [
    {
      type: 'prod',
      spec: Spec.parse('bar@a:bar@1.x', { registries }),
    },
    {
      type: 'prod',
      spec: Spec.parse('baz@b:bar@1.x', { registries }),
    },
  ]
  const add = new Map(deps.map(dep => [dep.spec.name, dep]))
  await appendNodes(
    add,
    packageInfo,
    graph,
    graph.mainImporter,
    deps,
    new PathScurry(t.testdirName),
    {
      registries,
    },
    new Set(),
  )
  t.matchSnapshot(inspect(graph, { colors: false }))
})
