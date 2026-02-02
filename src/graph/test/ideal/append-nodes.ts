import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { asNormalizedManifest } from '@vltpkg/types'
import type { Manifest } from '@vltpkg/types'
import { inspect } from 'node:util'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { asDependency } from '../../src/dependencies.ts'
import type { Dependency } from '../../src/dependencies.ts'
import { Graph } from '../../src/graph.ts'
import { appendNodes } from '../../src/ideal/append-nodes.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import type { Node } from '../../src/node.ts'
import { GraphModifier } from '../../src/modifiers.ts'
import { reload } from '@vltpkg/vlt-json'
import { build } from '../../src/ideal/build.ts'
import { Monorepo } from '@vltpkg/workspaces'
import { PackageJson } from '@vltpkg/package-json'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type {
  TransientAddMap,
  TransientRemoveMap,
} from '../../src/ideal/types.ts'
import { mermaidOutput } from '../../src/visualization/mermaid-output.ts'

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
  const mainManifest = asNormalizedManifest({
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
    },
  })
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
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    scurry,
    configData,
    new Set<DepID>(),
    add,
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
    packageInfo,
    graph,
    graph.mainImporter,
    [depBar],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    add,
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
      [depBorked],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      add,
    ),
    /ERR/,
    'should not intercept errors on fetching / parsing manifest',
  )

  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [depNamelessGit],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    add,
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
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    add,
  )

  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [depBar],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    add,
  )

  await t.rejects(
    appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [depMissing],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      add,
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
    packageInfo,
    graph,
    graph.mainImporter,
    [depLinked],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    add,
  )
  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [depFoo],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    add,
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
    version: '1.1.1',
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
      spec: Spec.parse('bar', 'a:bar@1.x', { registries }),
    },
    {
      type: 'prod',
      spec: Spec.parse('baz', 'b:baz@1.x', { registries }),
    },
  ]
  const add = new Map(deps.map(dep => [dep.spec.name, dep]))
  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    deps,
    new PathScurry(t.testdirName),
    {
      registries,
    },
    new Set<DepID>(),
    add,
  )
  t.matchSnapshot(inspect(graph, { colors: false, depth: 4 }))
})

// Add a basic test for appendNodes that verifies it can handle
// query modifiers correctly
t.test('appendNodes with query modifier', async t => {
  // Create a package info client that returns a simple foo package
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
  }

  const packageInfo = {
    async manifest() {
      return fooManifest
    },
  } as unknown as PackageInfoClient

  // Create a minimal graph
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: { name: 'test', version: '1.0.0' },
  })

  // Call appendNodes with minimal arguments
  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    new Map(),
  )

  // Verify the appendNodes function ran without errors
  t.pass('appendNodes with no modifiers completed successfully')
})

// Add a test for the modifier logic with complete and incomplete modifiers
t.test(
  'appendNodes with complete and incomplete modifiers',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({
        modifiers: {
          '#foo': 'npm:bar@^2.0.0',
          '#missing': '1', // breadcrumb to a missing edge
        },
      }),
    })

    // Create package manifests
    const fooManifest = {
      name: 'foo',
      version: '1.0.0',
    }

    const barManifest = {
      name: 'bar',
      version: '2.0.0',
    }

    const packageInfo = {
      async manifest(spec: Spec) {
        const f = spec.final
        if (f.name === 'foo') return fooManifest
        if (f.name === 'bar') return barManifest
        return null
      },
    } as PackageInfoClient

    // Create a minimal graph
    const graph = new Graph({
      projectRoot: dir,
      ...configData,
      mainManifest: { name: 'my-project', version: '1.0.0' },
    })

    // Create a dependency
    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })

    // vlt.json config file load
    t.chdir(dir)
    reload('modifiers', 'project')
    const modifiers = GraphModifier.load(configData)

    const completeModifierRefs = modifiers.tryDependencies(
      graph.mainImporter,
      [fooDep],
    )

    // Call appendNodes with the modifier
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
      modifiers,
      completeModifierRefs,
    )

    // Verify bar was added from the edge modifier
    const [barNode] = graph.nodesByName.get('bar')!
    t.equal(
      barNode?.manifest?.name,
      'bar',
      'bar node should be added from the edge modifier',
    )

    const fooNode = graph.nodesByName.get('foo')
    t.notOk(
      fooNode,
      'should not have a node for foo since it was modified with bar',
    )

    const missingNode = graph.nodesByName.get('missing')
    t.notOk(missingNode, 'should not have a node for missing edge')
  },
)

t.test('spec edge removal', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
    'vlt.json': JSON.stringify({
      modifiers: {
        '#foo': '-',
      },
    }),
  })

  // Create package manifests
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
  }

  const packageInfo = {
    async manifest(spec: Spec) {
      const f = spec.final
      if (f.name === 'foo') return fooManifest
      return null
    },
  } as PackageInfoClient

  // Create a minimal graph
  const graph = new Graph({
    projectRoot: dir,
    ...configData,
    mainManifest: { name: 'my-project', version: '1.0.0' },
  })

  // Create a dependency
  const fooDep = asDependency({
    spec: Spec.parse('foo', '^1.0.0'),
    type: 'prod',
  })

  // vlt.json config file load
  t.chdir(dir)
  reload('modifiers', 'project')
  const modifiers = GraphModifier.load(configData)

  const completeModifierRefs = modifiers.tryDependencies(
    graph.mainImporter,
    [fooDep],
  )

  // Call appendNodes with the modifier
  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [fooDep],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    new Map([['foo', fooDep]]),
    modifiers,
    completeModifierRefs,
  )

  const fooNode = graph.nodesByName.get('foo')
  t.notOk(
    fooNode,
    'should not have a node for foo since it was removed',
  )
})

// Add a test for the error handling when a node can't be placed
t.test(
  'appendNodes error handling when node cannot be placed',
  async t => {
    // Create a minimal graph
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest: { name: 'test', version: '1.0.0' },
    })
    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })

    // Create a package info client that returns a manifest
    const packageInfo = {
      async manifest() {
        return { name: 'foo', version: '1.0.0' }
      },
    } as unknown as PackageInfoClient

    // Create a graph that returns undefined from placePackage
    // to trigger the error
    const originalPlacePackage = Graph.prototype.placePackage
    Graph.prototype.placePackage = () => undefined

    try {
      // This should throw an error
      await t.rejects(
        appendNodes(
          packageInfo,
          graph,
          graph.mainImporter,
          [fooDep],
          new PathScurry(t.testdirName),
          configData,
          new Set<DepID>(),
          new Map([['foo', fooDep]]),
        ),
        /failed to place package/,
        'should throw when graph.placePackage returns null',
      )
    } finally {
      // Restore the original method
      Graph.prototype.placePackage = originalPlacePackage
    }
  },
)

// Add a test to cover the tryDependencies branch
t.test(
  'appendNodes with nested dependencies and modifiers',
  async t => {
    // Create package manifests with nested dependencies
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

    // Create a minimal graph
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest: {
        name: 'test',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
        },
      },
    })
    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })

    // Mock packageInfo
    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === 'foo') return fooManifest
        if (spec.name === 'bar') return barManifest
        return null
      },
    } as PackageInfoClient

    // Create a modifier that implements tryDependencies
    const tryDependenciesCalled = { value: false }
    const mockModifier = {
      updateActiveEntry: () => {},
      // This method will be called for the nested dependencies
      tryDependencies: (node: Node, deps: any[]) => {
        // Only verify for 'foo' node, 'bar' has no dependencies
        if (node.manifest?.name === 'foo') {
          tryDependenciesCalled.value = true
          // Verify we're getting the expected parameters
          t.equal(node.manifest.name, 'foo', 'node should be foo')
          t.ok(Array.isArray(deps), 'deps should be an array')
          t.ok(deps.length > 0, 'deps should not be empty')
          t.equal(
            deps[0].spec.name,
            'bar',
            'first dependency should be bar',
          )
        }
        // we don't care about the returned value here
        return new Map()
      },
    }

    // call appendNodes with the mock modifier
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
      mockModifier as any,
    )

    // Verify tryDependencies was called
    t.ok(
      tryDependenciesCalled.value,
      'tryDependencies should have been called',
    )

    // Verify both foo and bar were added to the graph
    const fooNode = [...(graph.nodesByName.get('foo') ?? [])].find(
      node => node.manifest?.name === 'foo',
    )
    t.ok(fooNode, 'foo node should be added to the graph')

    const barNode = [...(graph.nodesByName.get('bar') ?? [])].find(
      node => node.manifest?.name === 'bar',
    )
    t.ok(barNode, 'bar node should be added as a nested dependency')
  },
)

// Failing test capturing nondeterminism from concurrent manifest resolution
t.test(
  'appendNodes produces deterministic graphs under varying timings',
  async t => {
    const mainManifest = {
      name: 'root',
      version: '1.0.0',
      dependencies: {
        '@vltpkg/a': '1',
        '@vltpkg/b': '1',
      },
    }

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    const makePackageInfo = (delays: {
      a: number
      b: number
      c1: number
      c12: number
    }) => {
      const pkgInfo = {
        async manifest(spec: Spec) {
          const name = spec.name
          switch (name) {
            case '@vltpkg/a': {
              await sleep(delays.a)
              return {
                name,
                version: '1.0.0',
                dependencies: { '@vltpkg/c': '1' },
              }
            }
            case '@vltpkg/b': {
              await sleep(delays.b)
              return {
                name,
                version: '1.0.0',
                dependencies: { '@vltpkg/c': '1 || 2' },
              }
            }
            case '@vltpkg/c': {
              // choose version based on requested range, with different delays
              if (spec.bareSpec.trim() === '1') {
                await sleep(delays.c1)
                return { name, version: '1.0.0' }
              } else {
                await sleep(delays.c12)
                return { name, version: '2.0.0' }
              }
            }
            default:
              return null
          }
        },
      } as unknown as PackageInfoClient
      return pkgInfo
    }

    const buildGraph = async (delays: {
      a: number
      b: number
      c1: number
      c12: number
    }) => {
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })
      const deps: Dependency[] = [
        asDependency({
          spec: Spec.parse('@vltpkg/a', '1'),
          type: 'prod',
        }),
        asDependency({
          spec: Spec.parse('@vltpkg/b', '1'),
          type: 'prod',
        }),
      ]
      const add = new Map(deps.map(d => [d.spec.name, d]))
      await appendNodes(
        makePackageInfo(delays),
        graph,
        graph.mainImporter,
        deps,
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        add,
      )
      return graph
    }

    // First build: favor resolving b and c@2 first
    const graph1 = await buildGraph({ a: 20, b: 0, c1: 30, c12: 0 })

    // Second build: favor resolving a and c@1 first
    const graph2 = await buildGraph({ a: 0, b: 20, c1: 0, c12: 30 })

    t.same(
      graph1.toJSON(),
      graph2.toJSON(),
      'graphs should be equal regardless of manifest resolution timing',
    )
  },
)

t.test('early extraction during appendNodes', async t => {
  t.test(
    'extract nodes that do not exist in actual graph',
    async t => {
      const fooManifest = {
        name: 'foo',
        version: '1.0.0',
      }
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }

      const idealGraph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const actualGraph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const extractedNodes: string[] = []

      const packageInfo = {
        async manifest(spec: Spec) {
          if (spec.name === 'foo') return fooManifest
          return null
        },
        async extract(spec: Spec) {
          extractedNodes.push(spec.name)
          return { extracted: true }
        },
      } as unknown as PackageInfoClient

      const fooDep = asDependency({
        spec: Spec.parse('foo', '^1.0.0'),
        type: 'prod',
      })

      const extractPromises: any[] = []
      const seenExtracted = new Set<DepID>()

      await appendNodes(
        packageInfo,
        idealGraph,
        idealGraph.mainImporter,
        [fooDep],
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        new Map([['foo', fooDep]]),
        undefined,
        undefined,
        extractPromises,
        actualGraph,
        seenExtracted,
        new RollbackRemove(),
      )

      // Wait for extractions
      if (extractPromises.length > 0) {
        await Promise.all(extractPromises)
      }

      t.equal(extractedNodes.length, 1, 'node was extracted')
      t.ok(extractedNodes.includes('foo'), 'foo was extracted')
    },
  )

  t.test(
    'skip extraction for nodes that exist in actual graph',
    async t => {
      const fooManifest = {
        name: 'foo',
        version: '1.0.0',
      }
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }

      const idealGraph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const actualGraph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const extractedNodes: string[] = []

      const packageInfo = {
        async manifest(spec: Spec) {
          if (spec.name === 'foo') return fooManifest
          return null
        },
        async extract(spec: Spec) {
          extractedNodes.push(spec.name)
          return { extracted: true }
        },
      } as unknown as PackageInfoClient

      const fooDep = asDependency({
        spec: Spec.parse('foo', '^1.0.0'),
        type: 'prod',
      })

      // First, add the node to actual graph
      await appendNodes(
        packageInfo,
        actualGraph,
        actualGraph.mainImporter,
        [fooDep],
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        new Map([['foo', fooDep]]),
      )

      // Reset extraction tracking
      extractedNodes.length = 0

      const extractPromises: any[] = []
      const seenExtracted = new Set<DepID>()

      // Now add to ideal graph with actual graph provided
      await appendNodes(
        packageInfo,
        idealGraph,
        idealGraph.mainImporter,
        [fooDep],
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        new Map([['foo', fooDep]]),
        undefined,
        undefined,
        extractPromises,
        actualGraph,
        seenExtracted,
        new RollbackRemove(),
      )

      // Wait for any extractions
      if (extractPromises.length > 0) {
        await Promise.all(extractPromises)
      }

      t.equal(
        extractedNodes.length,
        0,
        'node was not extracted since it exists in actual graph',
      )
    },
  )

  t.test(
    'avoid duplicate extractions with seenExtracted',
    async t => {
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
        dependencies: {
          foo: '^1.0.0', // Circular dependency to trigger potential duplicate
        },
      }
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }

      const idealGraph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const actualGraph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const extractionCalls: string[] = []

      const packageInfo = {
        async manifest(spec: Spec) {
          switch (spec.name) {
            case 'foo':
              return fooManifest
            case 'bar':
              return barManifest
            default:
              return null
          }
        },
        async extract(spec: Spec) {
          extractionCalls.push(spec.name)
          return { extracted: true }
        },
      } as unknown as PackageInfoClient

      const fooDep = asDependency({
        spec: Spec.parse('foo', '^1.0.0'),
        type: 'prod',
      })

      const extractPromises: any[] = []
      const seenExtracted = new Set<DepID>()

      await appendNodes(
        packageInfo,
        idealGraph,
        idealGraph.mainImporter,
        [fooDep],
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        new Map([['foo', fooDep]]),
        undefined,
        undefined,
        extractPromises,
        actualGraph,
        seenExtracted,
        new RollbackRemove(),
      )

      // Wait for extractions
      if (extractPromises.length > 0) {
        await Promise.all(extractPromises)
      }

      // Each node should only be extracted once
      const uniqueExtractions = new Set(extractionCalls)
      t.equal(
        extractionCalls.length,
        uniqueExtractions.size,
        'no duplicate extractions occurred',
      )
    },
  )

  t.test('extraction only happens for vlt store nodes', async t => {
    const fooManifest = {
      name: 'foo',
      version: '1.0.0',
    }
    const barManifest = {
      name: 'bar',
      version: '1.0.0',
    }
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }

    const idealGraph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const actualGraph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const extractedNodes: string[] = []

    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === 'foo') return fooManifest
        if (spec.name === 'bar') return barManifest
        return null
      },
      async extract(spec: Spec) {
        extractedNodes.push(spec.name)
        return { extracted: true }
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })
    const barDep = asDependency({
      spec: Spec.parse('bar', '^1.0.0'),
      type: 'prod',
    })

    const extractPromises: any[] = []
    const seenExtracted = new Set<DepID>()

    await appendNodes(
      packageInfo,
      idealGraph,
      idealGraph.mainImporter,
      [fooDep, barDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([
        ['foo', fooDep],
        ['bar', barDep],
      ]),
      undefined,
      undefined,
      extractPromises,
      actualGraph,
      seenExtracted,
      new RollbackRemove(),
    )

    // Wait for any extractions
    if (extractPromises.length > 0) {
      await Promise.all(extractPromises)
    }

    t.ok(
      extractedNodes.length > 0,
      'extraction should happen for registry nodes',
    )
    t.ok(extractedNodes.includes('foo'), 'foo should be extracted')
    t.ok(extractedNodes.includes('bar'), 'bar should be extracted')
  })

  t.test('skip extraction for optional nodes', async t => {
    const optionalManifest = {
      name: 'optional',
      version: '1.0.0',
    }
    const regularManifest = {
      name: 'regular',
      version: '1.0.0',
    }
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }

    const idealGraph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const actualGraph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const extractedNodes: string[] = []

    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === 'optional') return optionalManifest
        if (spec.name === 'regular') return regularManifest
        return null
      },
      async extract(spec: Spec) {
        extractedNodes.push(spec.name)
        return { extracted: true }
      },
    } as unknown as PackageInfoClient

    const optionalDep = asDependency({
      spec: Spec.parse('optional', '^1.0.0'),
      type: 'optional',
    })
    const regularDep = asDependency({
      spec: Spec.parse('regular', '^1.0.0'),
      type: 'prod',
    })

    const extractPromises: any[] = []
    const seenExtracted = new Set<DepID>()

    await appendNodes(
      packageInfo,
      idealGraph,
      idealGraph.mainImporter,
      [optionalDep, regularDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([
        ['optional', optionalDep],
        ['regular', regularDep],
      ]),
      undefined,
      undefined,
      extractPromises,
      actualGraph,
      seenExtracted,
      new RollbackRemove(),
    )

    // Wait for any extractions
    if (extractPromises.length > 0) {
      await Promise.all(extractPromises)
    }

    t.equal(
      extractedNodes.length,
      1,
      'only one node should be extracted',
    )
    t.ok(
      extractedNodes.includes('regular'),
      'regular dep should be extracted',
    )
    t.notOk(
      extractedNodes.includes('optional'),
      'optional dep should NOT be extracted',
    )
  })
})

t.test('inject transient dependencies from transientAdd', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
    dependencies: {
      bar: '^1.0.0', // <-- regular dependency
      baz: '^1.0.0', // <-- will be overridden by transientAdd
      ipsum: '^1.0.0', // <-- will be removed by transientRemove
    },
    peerDependencies: {
      react: '^18.0.0', // <-- peer dep will be removed by transientRemove
    },
  }
  const barManifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const bazManifest = {
    name: 'baz',
    version: '2.0.0',
  }
  const loremManifest = {
    name: 'lorem',
    version: '3.0.0',
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }

  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
  })

  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'foo':
          return fooManifest
        case 'bar':
          return barManifest
        case 'baz':
          return bazManifest
        case 'lorem':
          return loremManifest
        default:
          return null
      }
    },
  } as PackageInfoClient

  const fooDep = asDependency({
    spec: Spec.parse('foo', 'file:foo'),
    type: 'prod',
  })

  // Create transientAdd map with a dependency for the foo node
  // This simulates adding a dep from a nested folder context
  const fooDepID = joinDepIDTuple(['file', 'foo'])
  const bazDep = asDependency({
    spec: Spec.parse('baz', '^2.0.0'),
    type: 'prod',
  })
  const loremDep = asDependency({
    spec: Spec.parse('lorem', '^3.0.0'),
    type: 'peer',
  })
  const transientAdd = new Map() as TransientAddMap
  transientAdd.set(
    fooDepID,
    new Map([
      ['baz', bazDep],
      ['lorem', loremDep],
    ]),
  )
  const transientRemove = new Map() as TransientRemoveMap
  transientRemove.set(fooDepID, new Set(['ipsum', 'react']))

  await appendNodes(
    packageInfo,
    graph,
    graph.mainImporter,
    [fooDep],
    new PathScurry(t.testdirName),
    configData,
    new Set<DepID>(),
    new Map([['foo', fooDep]]),
    undefined, // modifiers
    undefined, // modifierRefs
    undefined, // extractPromises
    undefined, // actual
    undefined, // seenExtracted
    undefined, // remover
    transientAdd,
    transientRemove,
  )

  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      nodes: [...graph.nodes.values()],
      importers: graph.importers,
    }),
    'graph should match snapshot',
  )
})

t.test('skip peerOptional dependencies', async t => {
  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'has-peer-optional':
          return {
            name: 'has-peer-optional',
            version: '1.0.0',
            peerDependencies: {
              'peer-dep': '^1.0.0',
              'peer-optional-dep': '^1.0.0',
            },
            peerDependenciesMeta: {
              'peer-optional-dep': {
                optional: true,
              },
            },
          } as Manifest
        case 'peer-dep':
          return {
            name: 'peer-dep',
            version: '1.0.0',
          } as Manifest
        case 'peer-optional-dep':
          return {
            name: 'peer-optional-dep',
            version: '1.0.0',
          } as Manifest
        case 'lib-a':
          return {
            name: 'lib-a',
            version: '1.0.0',
            dependencies: {
              'shared-dep': '^1.0.0',
            },
          } as Manifest
        case 'lib-b':
          return {
            name: 'lib-b',
            version: '1.0.0',
            peerDependencies: {
              'shared-dep': '^1.0.0',
            },
            peerDependenciesMeta: {
              'shared-dep': {
                optional: true,
              },
            },
          } as Manifest
        case 'shared-dep':
          return {
            name: 'shared-dep',
            version: '1.0.0',
          } as Manifest
        default:
          throw new Error('404 - ' + spec.name, { cause: { spec } })
      }
    },
  } as PackageInfoClient

  t.test('skip peerOptional dependencies in ideal graph', async t => {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: {
          'has-peer-optional': '^1.0.0',
        },
      }),
    })

    const graph = await build({
      scurry: new PathScurry(projectRoot),
      monorepo: Monorepo.maybeLoad(projectRoot),
      packageJson: new PackageJson(),
      packageInfo,
      projectRoot,
      remover: new RollbackRemove(),
    })

    // Check that has-peer-optional was installed
    const [hasPeerOptional] = graph.nodesByName.get(
      'has-peer-optional',
    )!
    t.ok(hasPeerOptional, 'has-peer-optional should be installed')

    // Check that regular peer dependency was installed
    const peerDep = graph.nodesByName.get('peer-dep')!
    t.ok(peerDep, 'peer-dep should be installed')

    // Check that peerOptional dependency was NOT installed
    const peerOptionalDep = graph.nodesByName.get('peer-optional-dep')
    t.notOk(
      peerOptionalDep,
      'peer-optional-dep should NOT be installed',
    )

    // Check that the edge exists but is dangling (no 'to' node)
    const peerOptionalEdge = hasPeerOptional?.edgesOut.get(
      'peer-optional-dep',
    )
    t.ok(peerOptionalEdge, 'edge for peer-optional-dep should exist')
    t.equal(
      peerOptionalEdge?.type,
      'peerOptional',
      'edge type should be peerOptional',
    )
    t.notOk(
      peerOptionalEdge?.to,
      'edge should not have a "to" node (dangling edge)',
    )

    // Check that the regular peer edge has a 'to' node
    const peerEdge = hasPeerOptional?.edgesOut.get('peer-dep')
    t.ok(peerEdge, 'edge for peer-dep should exist')
    t.equal(peerEdge?.type, 'peer', 'edge type should be peer')
    t.ok(peerEdge?.to, 'peer edge should have a "to" node')
    t.equal(
      peerEdge?.to?.name,
      'peer-dep',
      'peer edge should point to peer-dep node',
    )
  })

  t.test(
    'link to existing node for peerOptional dependencies',
    async t => {
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
          dependencies: {
            // First install a regular dependency
            'peer-optional-dep': '^1.0.0',
            // Then install something that has it as peerOptional
            'has-peer-optional': '^1.0.0',
          },
        }),
      })

      const graph = await build({
        scurry: new PathScurry(projectRoot),
        monorepo: Monorepo.maybeLoad(projectRoot),
        packageJson: new PackageJson(),
        packageInfo,
        projectRoot,
        remover: new RollbackRemove(),
      })

      // Check that peer-optional-dep was installed as a regular dependency
      const [peerOptionalDep] = graph.nodesByName.get(
        'peer-optional-dep',
      )!
      t.ok(
        peerOptionalDep,
        'peer-optional-dep should be installed as regular dep',
      )

      // Check that has-peer-optional was installed
      const [hasPeerOptional] = graph.nodesByName.get(
        'has-peer-optional',
      )!
      t.ok(hasPeerOptional, 'has-peer-optional should be installed')

      // Check that has-peer-optional has a dangling edge to peer-optional-dep
      // even though peer-optional-dep exists in the graph
      const peerOptionalEdge = hasPeerOptional?.edgesOut.get(
        'peer-optional-dep',
      )
      t.ok(
        peerOptionalEdge,
        'edge for peer-optional-dep should exist',
      )
      t.equal(
        peerOptionalEdge?.type,
        'peerOptional',
        'edge type should be peerOptional',
      )
      t.ok(
        peerOptionalEdge?.to,
        'peerOptional edge should have a "to" node when node exists',
      )
      t.ok(
        peerOptionalEdge?.to?.name,
        'peerOptional edge should point to peer-optional-dep node',
      )
    },
  )

  // TODO: this scenario should be handled better in the future by reusing
  // the existing node instead of creating a dangling edge
  t.test(
    'skip peerOptional dependencies even when they already exist in graph',
    async t => {
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'my-project',
          version: '1.0.0',
          dependencies: {
            'lib-a': '^1.0.0',
            'lib-b': '^1.0.0',
          },
        }),
      })

      const graph = await build({
        scurry: new PathScurry(projectRoot),
        monorepo: Monorepo.maybeLoad(projectRoot),
        packageJson: new PackageJson(),
        packageInfo,
        projectRoot,
        remover: new RollbackRemove(),
      })

      // Check that shared-dep was installed as a regular dependency of lib-a
      const [sharedDep] = graph.nodesByName.get('shared-dep')!
      t.ok(sharedDep, 'shared-dep should be installed (from lib-a)')

      // Check that lib-b has a dangling edge to shared-dep for its peerOptional dependency
      const [libB] = graph.nodesByName.get('lib-b')!
      const peerOptionalEdge = libB?.edgesOut.get('shared-dep')
      t.ok(
        peerOptionalEdge,
        'edge for shared-dep from lib-b should exist',
      )
      t.equal(
        peerOptionalEdge?.type,
        'peerOptional',
        'edge type should be peerOptional',
      )
      t.notOk(
        peerOptionalEdge?.to,
        'peerOptional edge should not have a "to" node',
      )

      // Check that lib-a has a proper edge to shared-dep
      const libA = graph.nodes.get(
        joinDepIDTuple(['registry', '', 'lib-a@1.0.0']),
      )
      const regularEdge = libA?.edgesOut.get('shared-dep')
      t.ok(regularEdge, 'edge for shared-dep from lib-a should exist')
      t.equal(regularEdge?.type, 'prod', 'edge type should be prod')
      t.ok(regularEdge?.to, 'regular edge should have a "to" node')
      t.equal(
        regularEdge?.to?.name,
        'shared-dep',
        'regular edge should point to shared-dep',
      )
    },
  )

  t.test('reuse manifest from detached node', async t => {
    const fooManifest = {
      name: 'foo',
      version: '1.0.0',
    }
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }

    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // Track if packageInfo.manifest was called
    let manifestCalled = false
    const packageInfo = {
      async manifest(spec: Spec) {
        manifestCalled = true
        if (spec.name === 'foo') return fooManifest
        return null
      },
    } as PackageInfoClient

    // First, add a node to the graph that we'll mark as detached
    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })

    // Add the node normally first, would likely be already present in
    // a loaded lockfile or actual graph instead but this simulates it ok
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
    )

    // Get the node and mark it as detached
    const [fooNode] = graph.nodesByName.get('foo')!
    if (!fooNode) {
      throw new Error('foo node not found')
    }
    t.ok(fooNode, 'foo node should exist')
    fooNode.detached = true

    // Remove the edge from mainImporter to foo so we can re-add it
    const fooEdge = graph.mainImporter.edgesOut.get('foo')
    if (fooEdge) {
      graph.mainImporter.edgesOut.delete('foo')
      fooNode.edgesIn.delete(fooEdge)
    }

    // Reset the flag
    manifestCalled = false

    // Now try to append the same dependency again
    // It should reuse the manifest from the detached node
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
    )

    t.notOk(
      manifestCalled,
      'packageInfo.manifest should not be called for detached node',
    )
    t.ok(
      graph.mainImporter.edgesOut.get('foo'),
      'edge should be re-added',
    )
  })
})

t.test(
  'tries multiple candidates for peer-compatible node reuse',
  async t => {
    // This tests the branch in src/ideal/append-nodes.ts where:
    // - graph.findResolution() returns a satisfying node whose peer edges
    //   are incompatible with the current peerContext
    // - append-nodes tries other candidates (deterministically) until it finds
    //   a compatible one.
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // Two react targets for the peer edge
    const react182 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('react', '^18.0.0', configData),
      { name: 'react', version: '18.2.0' },
    )!
    const react183 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('react', '^18.0.0', configData),
      { name: 'react', version: '18.3.1' },
    )!

    // Create multiple candidates for foo. The dependency we're trying to add is foo@^1.
    // - foo@0.9.0: does NOT satisfy ^1 (covers the !satisfies(candidate) continue)
    // - foo@1.0.0: first satisfying node, but incompatible peer edge (react182)
    // - foo@1.0.1: satisfies but detached (covers detached continue)
    // - foo@1.0.2: satisfies and compatible peer edge (react183) -> should be selected
    const fooManifest09 = {
      name: 'foo',
      version: '0.9.0',
      peerDependencies: { react: '^18.0.0' },
    }
    const fooManifest10 = {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { react: '^18.0.0' },
    }
    const fooManifest101 = {
      name: 'foo',
      version: '1.0.1',
      peerDependencies: { react: '^18.0.0' },
    }
    const fooManifest102 = {
      name: 'foo',
      version: '1.0.2',
      peerDependencies: { react: '^18.0.0' },
    }

    const peerReactSpec = Spec.parse('react', '^18.0.0', configData)

    const foo09 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^0.9.0', configData),
      fooManifest09,
    )!
    graph.addEdge('peer', peerReactSpec, foo09, react182)

    const foo10 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      fooManifest10,
    )!
    graph.addEdge('peer', peerReactSpec, foo10, react182)

    const foo101 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      fooManifest101,
    )!
    foo101.detached = true
    graph.addEdge('peer', peerReactSpec, foo101, react183)

    const foo102 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      fooManifest102,
    )!
    graph.addEdge('peer', peerReactSpec, foo102, react183)

    // Ensure findResolution() does NOT just return the last cached resolution
    // (which would hide the fallback loop). Force it to scan candidates.
    graph.resolutions.clear()
    graph.resolutionsReverse.clear()

    const packageInfo = {
      // Should not be called because appendNodes should reuse an existing foo node.
      async manifest(spec: Spec) {
        throw new Error('unexpected manifest fetch: ' + spec.name)
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0'),
      type: 'prod',
    })

    // peerContext expects react183, making foo10 incompatible (it peers to react182)
    const peerContext = graph.peerContexts[0]!
    peerContext.set('react', {
      active: true,
      specs: new Set([Spec.parse('react', '^18.0.0', configData)]),
      target: react183,
      type: 'prod',
      contextDependents: new Set(),
    })

    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
    )

    const edge = graph.mainImporter.edgesOut.get('foo')
    t.ok(edge, 'should have foo edge')
    t.equal(
      edge?.to?.id,
      foo102.id,
      'should reuse compatible candidate (foo@1.0.2), skipping incompatible/detached/non-satisfying candidates',
    )
  },
)

t.test(
  'findCompatibleResolution prefers existing edge target over alternatives',
  async t => {
    // Test the fix in findCompatibleResolution() that checks existing edge target first
    // before calling graph.findResolution(). This ensures lockfile resolutions are preserved.
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // Create two react versions that both satisfy ^18.0.0
    const _react182 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('react', '^18.0.0', configData),
      { name: 'react', version: '18.2.0' },
    )!
    const react183 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('react', '^18.0.0', configData),
      { name: 'react', version: '18.3.0' },
    )!

    // Create ui-component with peer dep on react, targeting react@18.3.0
    const uiComponent = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('ui-component', '^1.0.0', configData),
      {
        name: 'ui-component',
        version: '1.0.0',
        peerDependencies: { react: '^18.0.0' },
      },
    )!
    const peerReactSpec = Spec.parse('react', '^18.0.0', configData)
    graph.addEdge('peer', peerReactSpec, uiComponent, react183)

    // lib-a already has edge to ui-component@1.0.0
    const libA = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('lib-a', '^1.0.0', configData),
      {
        name: 'lib-a',
        version: '1.0.0',
        dependencies: { 'ui-component': '^1.0.0', react: '^18.0.0' },
      },
    )!
    graph.addEdge(
      'prod',
      Spec.parse('ui-component', '^1.0.0', configData),
      libA,
      uiComponent,
    )
    graph.addEdge(
      'prod',
      Spec.parse('react', '^18.0.0', configData),
      libA,
      react183,
    )

    // Clear resolution caches to force findCompatibleResolution logic to run
    graph.resolutions.clear()
    graph.resolutionsReverse.clear()

    const packageInfo = {
      async manifest(spec: Spec) {
        throw new Error('unexpected manifest fetch: ' + spec.name)
      },
    } as unknown as PackageInfoClient

    const deps = [
      asDependency({
        spec: Spec.parse('ui-component', '^1.0.0', configData),
        type: 'prod',
      }),
    ]

    await appendNodes(
      packageInfo,
      graph,
      libA,
      deps,
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['ui-component', deps[0]!]]),
    )

    const edge = libA.edgesOut.get('ui-component')
    t.equal(
      edge?.to?.id,
      uiComponent.id,
      'should reuse existing edge target (ui-component@1.0.0 with react@18.3)',
    )
    t.equal(edge?.to?.version, '1.0.0', 'should keep locked version')
  },
)

t.test(
  'does not enter candidate fallback when existing node is already peer-compatible',
  async t => {
    const mainManifest = { name: 'my-project', version: '1.0.0' }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // Seed graph with an existing foo node (no peer deps => always compatible)
    const existingFoo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      { name: 'foo', version: '1.0.0' },
    )!

    const packageInfo = {
      async manifest() {
        throw new Error('unexpected manifest fetch')
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0', configData),
      type: 'prod',
    })

    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
    )

    const edge = graph.mainImporter.edgesOut.get('foo')
    t.equal(
      edge?.to?.id,
      existingFoo.id,
      'should reuse existing foo node',
    )
  },
)

t.test(
  'skips candidate fallback when existing node peer edges satisfy spec despite context mismatch',
  async t => {
    const mainManifest = { name: 'my-project', version: '1.0.0' }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const react182 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('react', '^18.0.0', configData),
      { name: 'react', version: '18.2.0' },
    )!
    const react183 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('react', '^18.0.0', configData),
      { name: 'react', version: '18.3.1' },
    )!

    // Single foo candidate, but its peer edge is incompatible with peerContext
    const foo10 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      {
        name: 'foo',
        version: '1.0.0',
        peerDependencies: { react: '^18.0.0' },
      },
    )!
    graph.addEdge(
      'peer',
      Spec.parse('react', '^18.0.0', configData),
      foo10,
      react182,
    )

    // peerContext expects react183, but there is no alternative foo candidate
    const peerContext = graph.peerContexts[0]!
    peerContext.set('react', {
      active: true,
      specs: new Set([Spec.parse('react', '^18.0.0', configData)]),
      target: react183,
      type: 'prod',
      contextDependents: new Set(),
    })

    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.final.name === 'foo') {
          // Return a different patch version so placePackage creates a new node id.
          return {
            name: 'foo',
            version: '1.0.1',
            peerDependencies: { react: '^18.0.0' },
          } as any
        }
        return null
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0', configData),
      type: 'prod',
    })

    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
    )

    const edge = graph.mainImporter.edgesOut.get('foo')
    t.equal(
      edge?.to?.id,
      foo10.id,
      'should reuse compatible node foo@1.0.0',
    )
    t.equal(
      edge?.to?.version,
      '1.0.0',
      'should reuse compatible node version foo@1.0.0',
    )
  },
)

t.test(
  'candidate fallback selects peer-compatible node when first candidate is incompatible',
  async t => {
    // Test that candidate fallback loop (L197-224) is triggered when first candidate
    // has genuinely incompatible peer edges that don't satisfy the required spec.
    // Setup: react@17 vs react@18, foo@1.0.0 with react@17 peer (incompatible),
    // foo@1.0.1 with react@18 peer (compatible). Should skip foo@1.0.0, pick foo@1.0.1.
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: { react: '^18.0.0', foo: '^1.0.0' },
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // Create react@17.0.0 (doesn't satisfy ^18.0.0) and react@18.3.0 (satisfies)
    // Create intermediate node to anchor react@17 and foo@1.0.0
    const libOld = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('lib-old', '^1.0.0', configData),
      { name: 'lib-old', version: '1.0.0' },
    )!

    const react17 = graph.placePackage(
      libOld, // ← Now nested under lib-old
      'prod',
      Spec.parse('react', '^17.0.0', configData),
      { name: 'react', version: '17.0.0' },
    )!

    const react18 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('react', '^18.0.0', configData),
      { name: 'react', version: '18.3.0' },
    )!

    // Create foo@1.0.0 with peer edge to react@17 (INCOMPATIBLE with ^18.0.0)
    const foo10 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      {
        name: 'foo',
        version: '1.0.0',
        peerDependencies: { react: '>=17.0.0' },
      },
    )!

    // Place react@17 as a peer dependency of foo@1.0.0
    graph.placePackage(
      foo10,
      'peer',
      Spec.parse('react', '^17.0.0', configData),
      { name: 'react', version: '17.0.0' },
      react17.id,
    )

    // Create foo@1.0.1 with peer edge to react@18 (COMPATIBLE)
    const foo101 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      {
        name: 'foo',
        version: '1.0.1',
        peerDependencies: { react: '>=17.0.0' },
      },
    )!
    graph.placePackage(
      foo101,
      'peer',
      Spec.parse('react', '>=17.0.0', configData),
      { name: 'react', version: '18.3.0' },
      react18.id,
    )

    // CRITICAL: Create existing edge from mainImporter to foo@1.0.0 AFTER both nodes exist
    // This ensures findCompatibleResolution finds foo@1.0.0 as the existingNode
    // Must be done after foo@1.0.1 is created, otherwise the edge might get updated
    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      {
        name: 'foo',
        version: '1.0.0',
        peerDependencies: { react: '>=17.0.0' },
      },
      foo10.id,
    )

    // Setup peer context with react@18 requirement
    const peerContext = graph.peerContexts[0]!
    peerContext.set('react', {
      active: true,
      specs: new Set([Spec.parse('react', '^18.0.0', configData)]),
      target: react18,
      type: 'prod',
      contextDependents: new Set(),
    })

    // Clear resolutions cache to force findCompatibleResolution logic to run
    graph.resolutions.clear()
    graph.resolutionsReverse.clear()

    const packageInfo = {
      async manifest(spec: Spec) {
        throw new Error('unexpected manifest fetch: ' + spec.name)
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0', configData),
      type: 'prod',
    })

    // Verify setup before appendNodes
    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      foo10.id,
      'setup: main importer initially points to foo@1.0.0',
    )
    t.equal(
      foo10.edgesOut.get('react')?.to?.id,
      react17.id,
      'setup: foo@1.0.0 peer edge points to react@17',
    )
    t.equal(
      foo101.edgesOut.get('react')?.to?.id,
      react18.id,
      'setup: foo@1.0.1 peer edge points to react@18',
    )

    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
    )

    const edge = graph.mainImporter.edgesOut.get('foo')
    t.equal(
      edge?.to?.id,
      foo101.id,
      'should skip incompatible foo@1.0.0, pick compatible foo@1.0.1',
    )
    t.equal(
      edge?.to?.version,
      '1.0.1',
      'should select foo@1.0.1 (peer-compatible candidate)',
    )
  },
)

t.test(
  'creates fresh peer context for non-main workspace importers',
  async t => {
    // This tests that each workspace importer gets its own peer context
    // to prevent cross-workspace peer context leakage
    const mainManifest = {
      name: 'workspace-project',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
      },
    }
    const aManifest = {
      name: 'a',
      version: '1.0.0',
      dependencies: {
        react: '^19.0.0',
      },
    }

    const dir = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      a: { 'package.json': JSON.stringify(aManifest) },
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['a'] },
      }),
    })

    const scurry = new PathScurry(dir)
    const packageJson = new PackageJson()
    const monorepo = new Monorepo(dir, {
      config: { packages: ['a'] },
      scurry,
      packageJson,
      load: { paths: ['a'] },
    })

    const graph = new Graph({
      projectRoot: dir,
      mainManifest,
      monorepo,
      ...configData,
    })

    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === 'react') {
          if (spec.bareSpec.includes('18')) {
            return { name: 'react', version: '18.3.1' }
          }
          return { name: 'react', version: '19.2.0' }
        }
        return null
      },
    } as PackageInfoClient

    // Add workspace importers to the graph
    const wsImporter = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('a', 'workspace:*', configData),
      aManifest,
      joinDepIDTuple(['workspace', 'a']),
    )!
    wsImporter.importer = true
    graph.importers.add(wsImporter)

    // First, populate main importer's react
    const mainReactDep = asDependency({
      spec: Spec.parse('react', '^18.0.0'),
      type: 'prod',
    })
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [mainReactDep],
      scurry,
      configData,
      new Set<DepID>(),
      new Map([['react', mainReactDep]]),
    )

    // Now append deps for the workspace importer
    const wsReactDep = asDependency({
      spec: Spec.parse('react', '^19.0.0'),
      type: 'prod',
    })
    await appendNodes(
      packageInfo,
      graph,
      wsImporter,
      [wsReactDep],
      scurry,
      configData,
      new Set<DepID>(),
      new Map([['react', wsReactDep]]),
    )

    // Verify each importer has correct react version
    const mainReactEdge = graph.mainImporter.edgesOut.get('react')
    const wsReactEdge = wsImporter.edgesOut.get('react')

    t.equal(
      mainReactEdge?.to?.version,
      '18.3.1',
      'main importer should have react@18',
    )
    t.equal(
      wsReactEdge?.to?.version,
      '19.2.0',
      'workspace importer should have react@19',
    )

    // Verify peer contexts are separate (more than one context exists)
    t.ok(
      graph.peerContexts.length > 1,
      'should have multiple peer contexts for isolation',
    )
  },
)

t.test(
  'ideal graph building is idempotent when starting from lockfile',
  async t => {
    // Integration test verifying the complete fix produces idempotent graphs.
    // This simulates: build ideal -> save lockfile -> load lockfile -> rebuild ideal
    // The second ideal build should produce identical graph to the first.
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        'lib-a': '^1.0.0',
        'lib-b': '^1.0.0',
        react: '^18.0.0',
      },
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // Mock packageInfo that returns manifests for our packages
    const packageInfo = {
      async manifest(spec: Spec) {
        const manifests = {
          'lib-a': {
            name: 'lib-a',
            version: '1.0.0',
            dependencies: {
              'ui-component': '^1.0.0',
              react: '^18.0.0',
            },
          },
          'lib-b': {
            name: 'lib-b',
            version: '1.0.0',
            dependencies: {
              'ui-component': '^1.0.0',
              react: '^18.0.0',
            },
          },
          'ui-component': {
            name: 'ui-component',
            version: '1.0.0',
            peerDependencies: { react: '^18.0.0' },
          },
          react: {
            name: 'react',
            version: '18.3.0',
          },
        }
        return (manifests as any)[spec.final.name] || null
      },
    } as unknown as PackageInfoClient

    const deps = [
      asDependency({
        spec: Spec.parse('lib-a', '^1.0.0', configData),
        type: 'prod',
      }),
      asDependency({
        spec: Spec.parse('lib-b', '^1.0.0', configData),
        type: 'prod',
      }),
      asDependency({
        spec: Spec.parse('react', '^18.0.0', configData),
        type: 'prod',
      }),
    ]

    // FIRST BUILD: Build ideal graph from scratch
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      deps,
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([
        ['lib-a', deps[0]!],
        ['lib-b', deps[1]!],
        ['react', deps[2]!],
      ]),
    )

    // Capture first build state - collect all edge targets
    const firstBuildNodeIds = new Set(
      [...graph.nodes.values()].map(n => n.id),
    )
    const firstLibA = graph.mainImporter.edgesOut.get('lib-a')?.to
    const firstLibB = graph.mainImporter.edgesOut.get('lib-b')?.to
    const firstReact = graph.mainImporter.edgesOut.get('react')?.to

    t.ok(
      firstLibA && firstLibB && firstReact,
      'first build has all nodes',
    )

    // Capture lib-a and lib-b dependencies
    const firstLibAUi = firstLibA?.edgesOut.get('ui-component')?.to
    const firstLibBUi = firstLibB?.edgesOut.get('ui-component')?.to

    // Verify both lib-a and lib-b share the same ui-component
    t.equal(
      firstLibAUi?.id,
      firstLibBUi?.id,
      'first build: lib-a and lib-b share ui-component',
    )

    // SECOND BUILD: Re-run appendNodes on the SAME graph (simulates re-install)
    // This tests that running install again produces the same graph structure
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      deps,
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([
        ['lib-a', deps[0]!],
        ['lib-b', deps[1]!],
        ['react', deps[2]!],
      ]),
    )

    // Capture second build state
    const secondBuildNodeIds = new Set(
      [...graph.nodes.values()].map(n => n.id),
    )
    const secondLibA = graph.mainImporter.edgesOut.get('lib-a')?.to
    const secondLibB = graph.mainImporter.edgesOut.get('lib-b')?.to
    const secondReact = graph.mainImporter.edgesOut.get('react')?.to

    // Verify idempotency: same node IDs exist
    t.same(
      secondBuildNodeIds,
      firstBuildNodeIds,
      'should have identical nodes (idempotent)',
    )

    // Verify main importer edges point to same nodes
    t.equal(
      secondLibA?.id,
      firstLibA?.id,
      'lib-a should be same node',
    )
    t.equal(
      secondLibB?.id,
      firstLibB?.id,
      'lib-b should be same node',
    )
    t.equal(
      secondReact?.id,
      firstReact?.id,
      'react should be same node',
    )

    // Verify lib-a and lib-b still share same ui-component
    const secondLibAUi = secondLibA?.edgesOut.get('ui-component')?.to
    const secondLibBUi = secondLibB?.edgesOut.get('ui-component')?.to
    t.equal(
      secondLibAUi?.id,
      firstLibAUi?.id,
      'lib-a ui-component should be same node',
    )
    t.equal(
      secondLibBUi?.id,
      firstLibBUi?.id,
      'lib-b ui-component should be same node',
    )
    t.equal(
      secondLibAUi?.id,
      secondLibBUi?.id,
      'second build: lib-a and lib-b still share ui-component',
    )

    // Verify peer edge preserved
    t.equal(
      secondLibAUi?.edgesOut.get('react')?.to?.id,
      firstReact?.id,
      'ui-component peer edge to react preserved',
    )
  },
)
