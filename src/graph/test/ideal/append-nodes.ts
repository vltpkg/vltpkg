import { hydrate, joinDepIDTuple } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { parse as parseVersion } from '@vltpkg/semver'
import { asNormalizedManifest } from '@vltpkg/types'
import type { Manifest } from '@vltpkg/types'
import { inspect } from 'node:util'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { Test } from 'tap'
import { asDependency } from '../../src/dependencies.ts'
import type { Dependency } from '../../src/dependencies.ts'
import { Graph } from '../../src/graph.ts'
import { appendNodes } from '../../src/ideal/append-nodes.ts'
import { peerSpecKey } from '../../src/ideal/peers.ts'
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
import type { ExtractResult } from '../../src/reify/extract-node.ts'
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

/** Build a single-entry `specs` map for a `PeerContextEntry` test fixture. */
const oneSpec = (spec: Spec) => new Map([[peerSpecKey(spec), spec]])

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
    'extract peer-suffixed node when actual has no matching base',
    async t => {
      const fooManifest = {
        name: 'foo',
        version: '1.0.0',
        peerDependencies: { react: '^18' },
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
          if (spec.name === 'react') {
            return { name: 'react', version: '18.0.0' }
          }
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

      const extractPromises: Promise<ExtractResult>[] = []
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

      if (extractPromises.length > 0) {
        await Promise.all(extractPromises)
      }

      const foo = [...idealGraph.nodes.values()].find(
        n => n.name === 'foo',
      )
      t.ok(foo?.peerSetHash, 'foo carries a provisional peer suffix')
      t.ok(extractedNodes.includes('foo'), 'foo was extracted')
    },
  )

  t.test(
    'skip extraction for peer-suffixed node whose base is in actual',
    async t => {
      const fooManifest = {
        name: 'foo',
        version: '1.0.0',
        peerDependencies: { react: '^18' },
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
      actualGraph.placePackage(
        actualGraph.mainImporter,
        'prod',
        Spec.parse('foo', '^1.0.0'),
        fooManifest,
      )

      const extractedNodes: string[] = []

      const packageInfo = {
        async manifest(spec: Spec) {
          if (spec.name === 'foo') return fooManifest
          if (spec.name === 'react') {
            return { name: 'react', version: '18.0.0' }
          }
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

      const extractPromises: Promise<ExtractResult>[] = []
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

      if (extractPromises.length > 0) {
        await Promise.all(extractPromises)
      }

      const foo = [...idealGraph.nodes.values()].find(
        n => n.name === 'foo',
      )
      t.ok(foo?.peerSetHash, 'foo carries a provisional peer suffix')
      t.notOk(
        extractedNodes.includes('foo'),
        'foo was not extracted: same base already in actual',
      )
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

t.test('a dangling optional peer forks the shared copy', async t => {
  // `a`'s copy of `v` has a dangling optional peer `p`; the main importer
  // places `p` at this level (an explicit add, absent from its manifest),
  // so it cannot share that copy
  const setup = (peerRange: string, resolved?: boolean) => {
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest: { name: 'my-project', version: '1.0.0' },
    })
    const a = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('a', '^1.0.0', configData),
      { name: 'a', version: '1.0.0', dependencies: { v: '^1.0.0' } },
    )!
    const v = graph.placePackage(
      a,
      'prod',
      Spec.parse('v', '^1.0.0', configData),
      {
        name: 'v',
        version: '1.0.0',
        peerDependencies: { p: peerRange },
        peerDependenciesMeta: { p: { optional: true } },
      },
    )!
    const pSpec = Spec.parse('p', peerRange, configData)
    graph.addEdge(
      'peerOptional',
      pSpec,
      v,
      resolved ?
        graph.placePackage(
          a,
          'prod',
          Spec.parse('p', '^1.0.0', configData),
          {
            name: 'p',
            version: '1.0.0',
          },
        )!
      : undefined,
    )
    const fetched: string[] = []
    const packageInfo = {
      async manifest(spec: Spec) {
        fetched.push(spec.name)
        switch (spec.name) {
          case 'v':
            return {
              name: 'v',
              version: '1.5.0',
              peerDependencies: { p: peerRange },
              peerDependenciesMeta: { p: { optional: true } },
            }
          case 'p':
            return { name: 'p', version: '1.0.0' }
          /* c8 ignore next 2 */
          default:
            return null
        }
      },
    } as unknown as PackageInfoClient
    const deps = [
      asDependency({
        spec: Spec.parse('v', '^1.0.0', configData),
        type: 'prod',
      }),
      asDependency({
        spec: Spec.parse('p', '^1.0.0', configData),
        type: 'prod',
      }),
    ]
    return { graph, v, fetched, packageInfo, deps }
  }

  await t.test(
    'the fork keeps the version it forked from',
    async t => {
      const { graph, v, fetched, packageInfo, deps } = setup('^1.0.0')
      await appendNodes(
        packageInfo,
        graph,
        graph.mainImporter,
        deps,
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        new Map(deps.map(d => [d.spec.name, d])),
      )
      const copy = graph.mainImporter.edgesOut.get('v')?.to
      t.not(copy, v, 'the shared copy was not reused')
      t.equal(
        copy?.version,
        '1.0.0',
        'the fork keeps 1.0.0, not 1.5.0',
      )
      t.equal(
        copy?.edgesOut.get('p')?.to?.name,
        'p',
        'and the optional peer is linked',
      )
      t.equal(
        v.edgesOut.get('p')?.to,
        undefined,
        "a's copy still dangles",
      )
      t.strictSame(
        fetched,
        ['p'],
        'the fork reused the existing manifest',
      )
    },
  )

  await t.test(
    'a resolved peer conflict still re-fetches',
    async t => {
      // pins today's behaviour: only the dangling-peer fork keeps the
      // version, a CHECK 1 conflict re-resolves the range
      const { graph, fetched, packageInfo, deps } = setup('*', true)
      const p2 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('p', '^2.0.0', configData),
        { name: 'p', version: '2.0.0' },
      )!
      const peerContext = graph.peerContexts[0]!
      peerContext.set('p', {
        active: true,
        specs: new Map([
          [
            peerSpecKey(Spec.parse('p', '^2.0.0', configData)),
            Spec.parse('p', '^2.0.0', configData),
          ],
        ]),
        target: p2,
        type: 'prod',
        contextDependents: new Set(),
      })
      await appendNodes(
        packageInfo,
        graph,
        graph.mainImporter,
        [deps[0]!],
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        new Map([['v', deps[0]!]]),
      )
      t.equal(
        graph.mainImporter.edgesOut.get('v')?.to?.version,
        '1.5.0',
        'the range was re-resolved',
      )
      t.strictSame(fetched, ['v'])
    },
  )
})

t.test('a dual declaration is placed once', async t => {
  const manifests: Record<string, Manifest> = {
    d: {
      name: 'd',
      version: '1.0.0',
      dependencies: { c: '^1.0.0' },
      peerDependencies: { c: '*' },
    },
    o: {
      name: 'o',
      version: '1.0.0',
      optionalDependencies: { c: '^1.0.0' },
      peerDependencies: { c: '*' },
    },
    m: {
      name: 'm',
      version: '1.0.0',
      dependencies: { c: '^1.0.0' },
      peerDependencies: { c: '*' },
      peerDependenciesMeta: { c: { optional: true } },
    },
    c: { name: 'c', version: '1.0.0' },
  }
  const packageInfo = {
    async manifest(spec: Spec) {
      /* c8 ignore next */
      return manifests[spec.name] ?? null
    },
  } as PackageInfoClient

  for (const [dep, expected] of [
    ['d', 'prod'],
    ['o', 'optional'],
    ['m', 'prod'],
  ] as const) {
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        dependencies: { [dep]: '^1.0.0' },
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
    const node = graph.nodesByName.get(dep)!.values().next().value!
    const edges = [...node.edgesOut.values()].filter(
      e => e.name === 'c',
    )
    t.equal(edges.length, 1, `${dep}: one edge to c`)
    t.equal(edges[0]?.type, expected, `${dep}: type is ${expected}`)
    t.ok(edges[0]?.to, `${dep}: c is placed`)
  }
})

t.test('a dual declaration with a transient add', async t => {
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest: { name: 'my-project', version: '1.0.0' },
  })
  const manifests: Record<string, Manifest> = {
    foo: {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: { c: '*' },
    },
    c: { name: 'c', version: '1.0.0' },
  }
  const packageInfo = {
    async manifest(spec: Spec) {
      /* c8 ignore next */
      return manifests[spec.name] ?? null
    },
  } as PackageInfoClient

  const fooDep = asDependency({
    spec: Spec.parse('foo', 'file:foo'),
    type: 'prod',
  })
  const transientAdd = new Map() as TransientAddMap
  transientAdd.set(
    joinDepIDTuple(['file', 'foo']),
    new Map([
      [
        'c',
        asDependency({
          spec: Spec.parse('c', '^1.0.0'),
          type: 'prod',
        }),
      ],
    ]),
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
    undefined, // modifiers
    undefined, // modifierRefs
    undefined, // extractPromises
    undefined, // actual
    undefined, // seenExtracted
    undefined, // remover
    transientAdd,
  )

  const foo = graph.nodesByName.get('foo')!.values().next().value!
  const edges = [...foo.edgesOut.values()].filter(e => e.name === 'c')
  t.equal(edges.length, 1, 'one edge to c')
  t.equal(edges[0]?.type, 'prod', 'the transient type wins')
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
          }
        case 'peer-dep':
          return {
            name: 'peer-dep',
            version: '1.0.0',
          }
        case 'peer-optional-dep':
          return {
            name: 'peer-optional-dep',
            version: '1.0.0',
          }
        case 'lib-a':
          return {
            name: 'lib-a',
            version: '1.0.0',
            dependencies: {
              'shared-dep': '^1.0.0',
            },
          }
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
          }
        case 'shared-dep':
          return {
            name: 'shared-dep',
            version: '1.0.0',
          }
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

    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0foo`, fooNode.id],
    ])

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

  t.test(
    'lockfile-provided custom resolved value preserved during placement',
    async t => {
      // Regression test for custom resolved nodes (such as JSR)
      // losing their resolved tarball URL. `setResolved()` would
      // set resolved to undefined, causing lockfile mutations.
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }

      // JSR config extending base configData
      const jsrConfig: SpecOptions = {
        ...configData,
        'jsr-registries': {
          jsr: 'https://npm.jsr.io/',
        },
      }

      const graph = new Graph({
        projectRoot: t.testdirName,
        ...jsrConfig,
        mainManifest,
      })

      // Simulate a lockfile-provided JSR node
      const jsrId = joinDepIDTuple([
        'registry',
        'jsr',
        '@jsr/std__semver@1.0.8',
      ])
      const expectedTarballURL =
        'https://npm.jsr.io/~/11/@jsr/std__semver/1.0.8.tgz'

      // Manifest without dist.tarball, this is the case when reading from the node_modules dir
      const jsrManifest = asNormalizedManifest({
        name: '@jsr/std__semver',
        version: '1.0.8',
        // No dist.tarball - this is what causes setResolved() to fail
      })

      // Place the node as if loaded from lockfile
      const jsrNode = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('@jsr/std__semver', 'jsr:^1.0.8', jsrConfig),
        jsrManifest,
        jsrId,
      )!

      // Simulate lockfile state
      jsrNode.detached = true
      jsrNode.resolved = expectedTarballURL
      const jsrSpec = Spec.parse(
        '@jsr/std__semver',
        'jsr:^1.0.8',
        jsrConfig,
      )
      graph.lockedResolutions = new Map([
        [`${graph.mainImporter.id}\0${jsrSpec.name}`, jsrNode.id],
      ])

      // Remove the edge so we can re-add it via appendNodes
      const jsrEdge = graph.mainImporter.edgesOut.get(
        '@jsr/std__semver',
      )
      if (jsrEdge) {
        graph.mainImporter.edgesOut.delete('@jsr/std__semver')
        jsrNode.edgesIn.delete(jsrEdge)
      }

      // packageInfo that throws if manifest is called
      // (detached path should short-circuit manifest fetching)
      const packageInfo = {
        async manifest() {
          throw new Error(
            'manifest() should not be called for detached node',
          )
        },
      } as unknown as PackageInfoClient

      // Re-add the dependency via appendNodes
      const jsrDep = asDependency({
        spec: Spec.parse('@jsr/std__semver', 'jsr:^1.0.8', jsrConfig),
        type: 'prod',
      })

      await appendNodes(
        packageInfo,
        graph,
        graph.mainImporter,
        [jsrDep],
        new PathScurry(t.testdirName),
        jsrConfig,
        new Set<DepID>(),
        new Map([['@jsr/std__semver', jsrDep]]),
      )

      // Assert resolved URL is preserved
      t.equal(
        jsrNode.resolved,
        expectedTarballURL,
        'lockfile-provided resolved URL should be preserved',
      )

      // Assert edge exists and has correct spec
      const edge = graph.mainImporter.edgesOut.get('@jsr/std__semver')
      t.ok(edge, 'edge should be re-added')
      t.equal(edge?.to?.id, jsrId, 'edge should target the JSR node')
      t.equal(
        edge?.spec.bareSpec,
        'jsr:^1.0.8',
        'edge spec should remain jsr:^1.0.8',
      )
    },
  )
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

    // Create existing edge to peer-incompatible foo@1.0.0
    // This forces findCompatibleResolution to prefer the existing edge target
    // before calling graph.findResolution(), triggering the fallback loop
    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      fooManifest10,
      foo10.id,
    )

    // Verify existing edge is engaged
    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      foo10.id,
      'setup: existing edge points to peer-incompatible foo@1.0.0',
    )

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

    // peerContext expects react183 with spec >=18.3.0, making foo10 incompatible
    // (it peers to react182 which doesn't satisfy >=18.3.0)
    const peerContext = graph.peerContexts[0]!
    peerContext.set('react', {
      active: true,
      specs: oneSpec(Spec.parse('react', '>=18.3.0', configData)),
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
  'applies fork requests when peer edge target does not satisfy spec',
  async t => {
    // Test that fork request application (L802-812 in append-nodes.ts) is triggered
    // when checkPeerEdgesCompatible() generates a forkEntry for a genuine peer conflict.
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // Create react nodes
    const react17 = graph.placePackage(
      graph.mainImporter,
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

    // Create ui-component with ACTUAL peer edge to react@17
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
    graph.addEdge(
      'peer',
      Spec.parse('react', '^18.0.0', configData),
      uiComponent,
      react17,
    )

    // Create parent (fromNode) that declares react@^18.0.0
    const parent = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('parent', '^1.0.0', configData),
      {
        name: 'parent',
        version: '1.0.0',
        dependencies: {
          'ui-component': '^1.0.0',
          react: '^18.0.0',
        },
      },
    )!

    // Create existing edge from parent to ui-component
    graph.addEdge(
      'prod',
      Spec.parse('ui-component', '^1.0.0', configData),
      parent,
      uiComponent,
    )

    // Verify existing edge setup
    t.equal(
      parent.edgesOut.get('ui-component')?.to?.id,
      uiComponent.id,
      'setup: parent has existing edge to ui-component',
    )

    // Setup peer context with react@18 target
    const peerContext = graph.peerContexts[0]!
    peerContext.set('react', {
      active: true,
      specs: oneSpec(Spec.parse('react', '^18.0.0', configData)),
      target: react18,
      type: 'prod',
      contextDependents: new Set(),
    })

    // Clear resolution caches
    graph.resolutions.clear()
    graph.resolutionsReverse.clear()

    // Capture before state for assertion
    const peerContextsBefore = graph.peerContexts.length

    const packageInfo = {
      async manifest(spec: Spec) {
        // Provide manifests to allow processing, fork logic should still trigger
        switch (spec.name) {
          case 'ui-component':
            return {
              name: 'ui-component',
              version: '1.0.0',
              peerDependencies: { react: '^18.0.0' },
            }
          case 'react':
            if (spec.bareSpec.includes('17')) {
              return { name: 'react', version: '17.0.0' }
            }
            return { name: 'react', version: '18.3.0' }
          default:
            throw new Error('unexpected manifest fetch: ' + spec.name)
        }
      },
    } as unknown as PackageInfoClient

    // Call appendNodes with fromNode=parent, deps=[ui-component]
    const uiDep = asDependency({
      spec: Spec.parse('ui-component', '^1.0.0', configData),
      type: 'prod',
    })
    await appendNodes(
      packageInfo,
      graph,
      parent,
      [uiDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['ui-component', uiDep]]),
    )

    // Assert fork occurred
    t.ok(
      graph.peerContexts.length > peerContextsBefore,
      'should have created new peer context (fork applied)',
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
      specs: oneSpec(Spec.parse('react', '^18.0.0', configData)),
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
    // Test that candidate fallback loop is triggered when first candidate
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
      specs: oneSpec(Spec.parse('react', '^18.0.0', configData)),
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

t.test(
  'resolves registry specs to workspace packages when name and version match',
  async t => {
    // When a workspace package is referenced with a plain semver
    // spec (e.g. "@scope/lib-a": "^1.0.0"), vlt should resolve it
    // to the local workspace package if the version satisfies the
    // range — matching npm/pnpm/yarn behavior.
    const mainManifest = {
      name: 'my-monorepo',
      version: '1.0.0',
    }
    const libAManifest = {
      name: '@scope/lib-a',
      version: '1.2.3',
    }
    const libBManifest = {
      name: '@scope/lib-b',
      version: '2.0.0',
      dependencies: {
        // plain registry spec that should resolve to workspace
        '@scope/lib-a': '^1.0.0',
      },
    }

    const dir = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      packages: {
        'lib-a': {
          'package.json': JSON.stringify(libAManifest),
        },
        'lib-b': {
          'package.json': JSON.stringify(libBManifest),
        },
      },
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['packages/*'] },
      }),
    })

    const scurry = new PathScurry(dir)
    const packageJson = new PackageJson()
    const monorepo = new Monorepo(dir, {
      config: { packages: ['packages/*'] },
      scurry,
      packageJson,
      load: { paths: ['packages/lib-a', 'packages/lib-b'] },
    })

    const graph = new Graph({
      projectRoot: dir,
      mainManifest,
      monorepo,
      ...configData,
    })

    // lib-a and lib-b workspace nodes should exist as importers
    const libANode = [...graph.importers].find(
      n => n.name === '@scope/lib-a',
    )
    const libBNode = [...graph.importers].find(
      n => n.name === '@scope/lib-b',
    )
    t.ok(libANode, 'lib-a should be an importer')
    t.ok(libBNode, 'lib-b should be an importer')

    // Mock packageInfo that should NOT be called for @scope/lib-a
    // since it should resolve from the workspace
    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === '@scope/lib-a') {
          throw new Error(
            'Should not fetch @scope/lib-a from registry — ' +
              'it should resolve from workspace',
          )
        }
        return null
      },
    } as unknown as PackageInfoClient

    // Create a dep that uses a plain registry spec
    // for a workspace package
    const dep = asDependency({
      spec: Spec.parse('@scope/lib-a', '^1.0.0', configData),
      type: 'prod',
    })

    // Append nodes from lib-b's perspective
    await appendNodes(
      packageInfo,
      graph,
      libBNode!,
      [dep],
      scurry,
      configData,
      new Set<DepID>(),
      new Map([['@scope/lib-a', dep]]),
    )

    // Verify lib-b now has an edge to the workspace lib-a node
    const edge = libBNode!.edgesOut.get('@scope/lib-a')
    t.ok(edge, 'lib-b should have edge to @scope/lib-a')
    t.equal(
      edge?.to?.id,
      libANode!.id,
      'edge should point to the workspace lib-a node',
    )
    t.equal(
      edge?.to?.importer,
      true,
      'resolved node should be a workspace importer',
    )
  },
)

t.test(
  'does NOT resolve registry spec to workspace when version is out of range',
  async t => {
    const mainManifest = {
      name: 'my-monorepo',
      version: '1.0.0',
    }
    const libAManifest = {
      name: '@scope/lib-a',
      version: '1.2.3',
    }

    const dir = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      packages: {
        'lib-a': {
          'package.json': JSON.stringify(libAManifest),
        },
      },
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['packages/*'] },
      }),
    })

    const scurry = new PathScurry(dir)
    const packageJson = new PackageJson()
    const monorepo = new Monorepo(dir, {
      config: { packages: ['packages/*'] },
      scurry,
      packageJson,
      load: { paths: ['packages/lib-a'] },
    })

    const graph = new Graph({
      projectRoot: dir,
      mainManifest,
      monorepo,
      ...configData,
    })

    // Mock packageInfo that should be called because version
    // doesn't match (workspace is 1.2.3, spec wants ^2.0.0)
    let fetchCalled = false
    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === '@scope/lib-a') {
          fetchCalled = true
          return {
            name: '@scope/lib-a',
            version: '2.0.0',
          }
        }
        return null
      },
    } as PackageInfoClient

    const dep = asDependency({
      spec: Spec.parse('@scope/lib-a', '^2.0.0', configData),
      type: 'prod',
    })

    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [dep],
      scurry,
      configData,
      new Set<DepID>(),
      new Map([['@scope/lib-a', dep]]),
    )

    t.ok(
      fetchCalled,
      'should have fetched from registry when version out of range',
    )
    // The edge should point to the registry version, not the workspace
    const edge = graph.mainImporter.edgesOut.get('@scope/lib-a')
    t.ok(edge, 'should have edge to @scope/lib-a')
    t.equal(
      edge?.to?.id,
      joinDepIDTuple(['registry', '', '@scope/lib-a@2.0.0']),
      'should resolve to registry version, not workspace',
    )
  },
)

t.test(
  'workspace: spec that does not match workspace version throws descriptive error',
  async t => {
    const mainManifest = {
      name: 'my-monorepo',
      version: '1.0.0',
    }
    const libAManifest = {
      name: '@scope/lib-a',
      version: '1.0.0',
    }
    const consumerManifest = {
      name: 'consumer',
      version: '1.0.0',
      dependencies: {
        '@scope/lib-a': 'workspace:^2.0.0',
      },
    }

    const dir = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      packages: {
        'lib-a': {
          'package.json': JSON.stringify(libAManifest),
        },
        consumer: {
          'package.json': JSON.stringify(consumerManifest),
        },
      },
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['packages/*'] },
      }),
    })

    const scurry = new PathScurry(dir)
    const packageJson = new PackageJson()
    const monorepo = new Monorepo(dir, {
      config: { packages: ['packages/*'] },
      scurry,
      packageJson,
      load: {
        paths: ['packages/lib-a', 'packages/consumer'],
      },
    })

    const graph = new Graph({
      projectRoot: dir,
      mainManifest,
      monorepo,
      ...configData,
    })

    const packageInfo = {
      async manifest() {
        throw new Error('should not fetch from registry')
      },
    } as unknown as PackageInfoClient

    const consumerNode = [...graph.importers].find(
      n => n.name === 'consumer',
    )
    t.ok(consumerNode, 'consumer should be an importer')

    const dep = asDependency({
      spec: Spec.parse(
        '@scope/lib-a',
        'workspace:^2.0.0',
        configData,
      ),
      type: 'prod',
    })

    await t.rejects(
      appendNodes(
        packageInfo,
        graph,
        consumerNode!,
        [dep],
        scurry,
        configData,
        new Set<DepID>(),
        new Map([['@scope/lib-a', dep]]),
      ),
      {
        message:
          /workspace dependency.*does not match the local workspace version/,
      },
      'should throw a descriptive error about version mismatch',
    )
  },
)

t.test(
  'workspace: spec for a non-existent workspace throws descriptive error',
  async t => {
    const mainManifest = {
      name: 'my-monorepo',
      version: '1.0.0',
    }
    const consumerManifest = {
      name: 'consumer',
      version: '1.0.0',
      dependencies: {
        'nonexistent-ws': 'workspace:*',
      },
    }

    const dir = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      packages: {
        consumer: {
          'package.json': JSON.stringify(consumerManifest),
        },
      },
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['packages/*'] },
      }),
    })

    const scurry = new PathScurry(dir)
    const packageJson = new PackageJson()
    const monorepo = new Monorepo(dir, {
      config: { packages: ['packages/*'] },
      scurry,
      packageJson,
      load: { paths: ['packages/consumer'] },
    })

    const graph = new Graph({
      projectRoot: dir,
      mainManifest,
      monorepo,
      ...configData,
    })

    const packageInfo = {
      async manifest() {
        throw new Error('should not fetch from registry')
      },
    } as unknown as PackageInfoClient

    const consumerNode = [...graph.importers].find(
      n => n.name === 'consumer',
    )
    t.ok(consumerNode, 'consumer should be an importer')

    const dep = asDependency({
      spec: Spec.parse('nonexistent-ws', 'workspace:*', configData),
      type: 'prod',
    })

    await t.rejects(
      appendNodes(
        packageInfo,
        graph,
        consumerNode!,
        [dep],
        scurry,
        configData,
        new Set<DepID>(),
        new Map([['nonexistent-ws', dep]]),
      ),
      {
        message: /no workspace found matching/,
      },
      'should throw a descriptive error about missing workspace',
    )
  },
)

t.test('broken optional dep is not silently dropped', async t => {
  const mainManifest = asNormalizedManifest({
    name: 'my-project',
    version: '1.0.0',
  })
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
  })
  const packageInfo = {
    async manifest() {
      // what normalizeManifest throws for a traversing name
      throw error('Invalid package name', {
        code: 'EINVALIDNAME',
        found: '../../forbidden',
      })
    },
  } as unknown as PackageInfoClient
  const dep = asDependency({
    spec: Spec.parse('broken', '^1.0.0'),
    type: 'optional',
  })

  await t.rejects(
    appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [dep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['broken', dep]]),
    ),
    { cause: { code: 'EINVALIDNAME' } },
  )
})

t.test(
  'optionalDependencies overrides dependencies for same name',
  async t => {
    // Reproduces the bug where packages like esbuild@0.18.20 and
    // typescript@7.0.2 list platform-specific deps in BOTH `dependencies`
    // AND `optionalDependencies`. Per npm semantics, optionalDependencies
    // should override dependencies for the same name. Without the fix,
    // the node is first created as non-optional (from `dependencies`),
    // and the later `optionalDependencies` entry cannot recover the
    // `optional` flag due to the `&&=` operator in `placePackage`.
    const parentManifest: Manifest = {
      name: 'parent-pkg',
      version: '1.0.0',
      // Same package listed in both dependencies and optionalDependencies
      // (this is the pattern used by esbuild@0.18.20, typescript@7.0.2)
      dependencies: {
        'platform-dep': '1.0.0',
      },
      optionalDependencies: {
        'platform-dep': '1.0.0',
      },
    }
    const platformDepManifest: Manifest = {
      name: 'platform-dep',
      version: '1.0.0',
      // Platform fields that do NOT match the current platform
      os: ['aix'],
      cpu: ['ppc64'],
    }
    const mainManifest = asNormalizedManifest({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        'parent-pkg': '^1.0.0',
      },
    })
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    const depParent = asDependency({
      spec: Spec.parse('parent-pkg@^1.0.0'),
      type: 'prod',
    })
    const packageInfo = {
      async manifest(spec: Spec) {
        switch (spec.name) {
          case 'parent-pkg':
            return parentManifest
          case 'platform-dep':
            return platformDepManifest
          default:
            return null
        }
      },
    } as PackageInfoClient

    const scurry = new PathScurry(t.testdirName)
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [depParent],
      scurry,
      configData,
      new Set<DepID>(),
    )

    // Find the platform-dep node
    const platformDepId = joinDepIDTuple([
      'registry',
      '',
      'platform-dep@1.0.0',
    ])
    const platformDepNode = graph.nodes.get(platformDepId)
    t.ok(platformDepNode, 'platform-dep node exists in graph')

    // The critical assertion: the node must be optional
    // Without the fix, it would be non-optional because `dependencies`
    // was processed first, creating the node with optional=false
    t.ok(
      platformDepNode?.isOptional(),
      'platform-dep node is optional (optionalDependencies wins over dependencies)',
    )

    // The edge from parent-pkg to platform-dep should be optional
    const parentId = joinDepIDTuple([
      'registry',
      '',
      'parent-pkg@1.0.0',
    ])
    const parentNode = graph.nodes.get(parentId)
    t.ok(parentNode, 'parent-pkg node exists')

    // Check that there's only ONE edge from parent to platform-dep (deduped)
    const edges = [...(parentNode?.edgesOut.values() ?? [])].filter(
      e => e.spec.name === 'platform-dep',
    )
    t.equal(
      edges.length,
      1,
      'only one edge from parent to platform-dep (deduped)',
    )
    t.equal(edges[0]?.type, 'optional', 'the edge type is optional')
  },
)

t.test(
  'optionalDependencies override works in deep transitive chains',
  async t => {
    // Reproduces the scenario where the parent with overlapping deps
    // is reached via a deep transitive chain (like esbuild@0.18.20
    // via drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils)
    const deepParentManifest: Manifest = {
      name: 'deep-parent',
      version: '1.0.0',
      dependencies: {
        'deep-platform-dep': '1.0.0',
      },
      optionalDependencies: {
        'deep-platform-dep': '1.0.0',
      },
    }
    const deepPlatformDepManifest: Manifest = {
      name: 'deep-platform-dep',
      version: '1.0.0',
      os: ['win32'],
      cpu: ['ia32'],
    }
    const middleManifest: Manifest = {
      name: 'middle-pkg',
      version: '1.0.0',
      dependencies: {
        'deep-parent': '^1.0.0',
      },
    }
    const topManifest: Manifest = {
      name: 'top-pkg',
      version: '1.0.0',
      dependencies: {
        'middle-pkg': '^1.0.0',
      },
    }
    const mainManifest = asNormalizedManifest({
      name: 'my-project',
      version: '1.0.0',
      devDependencies: {
        'top-pkg': '^1.0.0',
      },
    })
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    const depTop = asDependency({
      spec: Spec.parse('top-pkg@^1.0.0'),
      type: 'dev',
    })
    const packageInfo = {
      async manifest(spec: Spec) {
        switch (spec.name) {
          case 'top-pkg':
            return topManifest
          case 'middle-pkg':
            return middleManifest
          case 'deep-parent':
            return deepParentManifest
          case 'deep-platform-dep':
            return deepPlatformDepManifest
          default:
            return null
        }
      },
    } as PackageInfoClient

    const scurry = new PathScurry(t.testdirName)
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [depTop],
      scurry,
      configData,
      new Set<DepID>(),
    )

    // The deep-platform-dep node must be optional even through the
    // multi-level transitive chain
    const depId = joinDepIDTuple([
      'registry',
      '',
      'deep-platform-dep@1.0.0',
    ])
    const node = graph.nodes.get(depId)
    t.ok(node, 'deep-platform-dep node exists')
    t.ok(
      node?.isOptional(),
      'deep-platform-dep is optional in deep transitive chain',
    )
    t.ok(node?.dev, 'deep-platform-dep is also marked as dev')
  },
)

t.test(
  'lockedResolutions reuses the lockfile target after resetEdges',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      { name: 'foo', version: '1.0.0' },
    )!
    const foo11 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      { name: 'foo', version: '1.1.0' },
    )!

    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0foo`, foo11.id],
    ])
    graph.resetEdges()

    let manifestCalled = false
    const packageInfo = {
      async manifest(spec: Spec) {
        manifestCalled = true
        throw new Error('unexpected manifest fetch: ' + spec.name)
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

    t.notOk(manifestCalled, 'locked target reuse skips manifest()')
    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      foo11.id,
      'rebuild keeps the locked 1.1.0 instead of the first satisfying 1.0.0',
    )
    t.equal(
      foo11.detached,
      false,
      'reusing a locked target reattaches the node',
    )
  },
)

t.test(
  'lockedResolutions ignores a snapshot whose name does not match the spec',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const bar = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('bar', '^1.0.0', configData),
      { name: 'bar', version: '1.0.0' },
    )!

    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0foo`, bar.id],
    ])
    graph.resetEdges()

    const fooManifest = { name: 'foo', version: '1.0.0' }
    const packageInfo = {
      async manifest() {
        return fooManifest
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

    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.name,
      'foo',
      'mismatched locked name is not reused',
    )
    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
    )
  },
)

/**
 * Graph with a locked `foo@1.2.3` and a packageInfo that resolves the
 * `latest` dist-tag to `foo@2.0.0`, recording every fetched spec.
 */
const distTagFixture = (t: Test) => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }
  const graph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
  })

  const foo = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('foo', '^1.0.0', configData),
    { name: 'foo', version: '1.2.3' },
  )!

  graph.lockedResolutions = new Map([
    [`${graph.mainImporter.id}\0foo`, foo.id],
  ])
  graph.resetEdges()

  const fetched: string[] = []
  const packageInfo = {
    async manifest(spec: Spec) {
      fetched.push(String(spec))
      if (spec.final.distTag !== 'latest') {
        throw new Error(`unexpected manifest fetch: ${spec}`)
      }
      return { name: 'foo', version: '2.0.0' }
    },
  } as unknown as PackageInfoClient

  const fooDep = asDependency({
    spec: Spec.parse('foo', 'latest', configData),
    type: 'prod',
  })

  return { graph, foo, fetched, packageInfo, fooDep }
}

t.test(
  'a lockfile dist-tag edge reuses the lock without fetching',
  async t => {
    const { graph, foo, fetched, packageInfo, fooDep } =
      distTagFixture(t)

    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
    )

    t.strictSame(
      fetched,
      [],
      'dist-tag lock reuses the snapshot node',
    )
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to?.id, foo.id)
  },
)

t.test(
  'a manifest-derived dist-tag entry is not explicit',
  async t => {
    const { graph, foo, fetched, packageInfo, fooDep } =
      distTagFixture(t)

    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      // the user asked for something else entirely
      new Map([[graph.mainImporter.id, new Set(['bar'])]]),
    )

    t.strictSame(fetched, [], 'no fetch for a manifest-derived tag')
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to?.id, foo.id)
  },
)

t.test(
  'an explicit dist-tag add re-resolves the tag even when a lock fits',
  async t => {
    const { graph, foo, fetched, packageInfo, fooDep } =
      distTagFixture(t)

    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Map([[graph.mainImporter.id, new Set(['foo'])]]),
    )

    t.strictSame(fetched, ['foo@latest'], 'the tag was resolved')
    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.version,
      '2.0.0',
    )
    graph.gc()
    t.notOk(graph.nodes.get(foo.id), 'the locked copy is gone')
  },
)

t.test(
  'an explicit dist-tag add ignores attached same-name copies',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    const bar = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('bar', '^1.0.0', configData),
      { name: 'bar', version: '1.0.0', dependencies: { foo: '^1' } },
    )!
    const foo = graph.placePackage(
      bar,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      { name: 'foo', version: '1.2.3' },
    )!

    const packageInfo = {
      async manifest() {
        return { name: 'foo', version: '2.0.0' }
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', 'latest', configData),
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
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Map([[graph.mainImporter.id, new Set(['foo'])]]),
    )

    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.version,
      '2.0.0',
    )
    t.equal(bar.edgesOut.get('foo')?.to?.id, foo.id, 'bar untouched')
    t.equal(graph.nodesByName.get('foo')?.size, 2)
  },
)

t.test(
  'an explicit dist-tag add still links a workspace by name',
  async t => {
    const mainManifest = { name: 'my-monorepo', version: '1.0.0' }
    const wsManifest = { name: 'ws', version: '1.0.0' }
    const dir = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      packages: {
        ws: { 'package.json': JSON.stringify(wsManifest) },
      },
      'vlt.json': JSON.stringify({
        workspaces: { packages: ['packages/*'] },
      }),
    })
    const scurry = new PathScurry(dir)
    const monorepo = new Monorepo(dir, {
      config: { packages: ['packages/*'] },
      scurry,
      packageJson: new PackageJson(),
      load: { paths: ['packages/ws'] },
    })
    const graph = new Graph({
      projectRoot: dir,
      mainManifest,
      monorepo,
      ...configData,
    })
    const wsNode = [...graph.importers].find(n => n.name === 'ws')!

    const packageInfo = {
      async manifest(spec: Spec) {
        throw new Error(`unexpected manifest fetch: ${spec}`)
      },
    } as unknown as PackageInfoClient

    const wsDep = asDependency({
      spec: Spec.parse('ws', 'latest', configData),
      type: 'prod',
    })
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [wsDep],
      scurry,
      configData,
      new Set<DepID>(),
      new Map([['ws', wsDep]]),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Map([[graph.mainImporter.id, new Set(['ws'])]]),
    )

    t.equal(graph.mainImporter.edgesOut.get('ws')?.to?.id, wsNode.id)
  },
)

t.test(
  'a transitive dist-tag dependency still reuses an existing copy',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    const foo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      { name: 'foo', version: '1.2.3' },
    )!

    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name !== 'baz') {
          throw new Error(`unexpected manifest fetch: ${spec}`)
        }
        return {
          name: 'baz',
          version: '1.0.0',
          dependencies: { foo: 'latest' },
        }
      },
    } as unknown as PackageInfoClient

    const bazDep = asDependency({
      spec: Spec.parse('baz', '^1.0.0', configData),
      type: 'prod',
    })
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [bazDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['baz', bazDep]]),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Map([[graph.mainImporter.id, new Set(['baz'])]]),
    )

    const baz = graph.mainImporter.edgesOut.get('baz')?.to
    t.equal(baz?.edgesOut.get('foo')?.to?.id, foo.id)
  },
)

t.test(
  'an explicit dist-tag add skips locked-version hydration',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    // a lockfile node loaded without node_modules has no manifest
    const lockedId = joinDepIDTuple(['registry', '', 'foo@1.2.3'])
    const foo = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      undefined,
      lockedId,
    )!
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0foo`, foo.id],
    ])
    graph.resetEdges()

    const fetched: string[] = []
    const packageInfo = {
      async manifest(spec: Spec) {
        fetched.push(String(spec))
        return { name: 'foo', version: '2.0.0' }
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', 'latest', configData),
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
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      new Map([[graph.mainImporter.id, new Set(['foo'])]]),
    )

    t.strictSame(fetched, ['foo@latest'], 'no hydration fetch')
  },
)

t.test(
  'an explicit optional add that fails to resolve throws',
  async t => {
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
      async manifest() {
        throw error('Could not resolve')
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', 'latest', configData),
      type: 'optional',
    })
    const call = (explicit?: Map<DepID, Set<string>>) =>
      appendNodes(
        packageInfo,
        graph,
        graph.mainImporter,
        [fooDep],
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        new Map([['foo', fooDep]]),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        explicit,
      )

    await t.rejects(
      call(new Map([[graph.mainImporter.id, new Set(['foo'])]])),
      { message: 'Could not resolve' },
      'explicit optional add surfaces the resolution error',
    )
    await t.resolves(
      call(),
      'a manifest-derived optional dep is still swallowed',
    )
    t.notOk(graph.mainImporter.edgesOut.get('foo')?.to)
  },
)

t.test(
  'lockedResolutions matches a lockfile node by spec.final.name',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const jsrConfig: SpecOptions = {
      ...configData,
      'jsr-registries': {
        jsr: 'https://npm.jsr.io/',
      },
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...jsrConfig,
      mainManifest,
    })
    const jsrId = joinDepIDTuple([
      'registry',
      'jsr',
      '@jsr/std__semver@1.0.8',
    ])
    const jsrNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('@jsr/std__semver', 'jsr:^1.0.8', jsrConfig),
      { name: '@jsr/std__semver', version: '1.0.8' },
      jsrId,
    )!

    const alias = Spec.parse(
      'semver',
      'jsr:@std/semver@^1.0.8',
      jsrConfig,
    )
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0${alias.name}`, jsrNode.id],
    ])
    graph.resetEdges()

    let manifestCalled = false
    const packageInfo = {
      async manifest() {
        manifestCalled = true
        throw new Error('unexpected manifest fetch')
      },
    } as unknown as PackageInfoClient

    const semverDep = asDependency({
      spec: alias,
      type: 'prod',
    })
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [semverDep],
      new PathScurry(t.testdirName),
      jsrConfig,
      new Set<DepID>(),
      new Map([[alias.name, semverDep]]),
    )

    t.notOk(manifestCalled, 'JSR alias lock skips manifest()')
    t.equal(
      graph.mainImporter.edgesOut.get(alias.name)?.to?.id,
      jsrNode.id,
    )
  },
)

t.test(
  'lockedResolutions ignores a lock when the spec moved off the registry',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const regNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      { name: 'foo', version: '1.0.0' },
    )!
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0foo`, regNode.id],
    ])
    graph.resetEdges()

    let manifestCalled = false
    const packageInfo = {
      async manifest() {
        manifestCalled = true
        return { name: 'foo', version: '1.0.0' }
      },
    } as unknown as PackageInfoClient

    const gitSpec = Spec.parse('foo', 'github:a/b', configData)
    const fooDep = asDependency({ spec: gitSpec, type: 'prod' })
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

    t.ok(manifestCalled, 'git spec fetches instead of reusing lock')
    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      joinDepIDTuple(['git', 'github:a/b', '']),
      'resolves to a fresh git node, not the locked registry node',
    )
  },
)

t.test(
  'lockedResolutions never reuses a git lock for a registry spec',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const gitNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', 'github:a/b', configData),
      { name: 'foo', version: '9.9.9' },
    )!
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0foo`, gitNode.id],
    ])
    graph.resetEdges()

    const packageInfo = {
      async manifest() {
        return { name: 'foo', version: '1.0.0' }
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

    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      'resolves fresh from the registry, not the locked git node',
    )
  },
)

t.test(
  'lockedResolutions rejects a lock from a different registry',
  async t => {
    const customConfig: SpecOptions = {
      ...configData,
      registries: {
        ...configData.registries,
        custom: 'http://example.com/',
      },
    }
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...customConfig,
      mainManifest,
    })

    const customNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', 'custom:foo@^1.0.0', customConfig),
      { name: 'foo', version: '1.0.0' },
    )!
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0foo`, customNode.id],
    ])
    graph.resetEdges()

    const packageInfo = {
      async manifest() {
        return { name: 'foo', version: '1.0.0' }
      },
    } as unknown as PackageInfoClient

    const fooDep = asDependency({
      spec: Spec.parse('foo', '^1.0.0', customConfig),
      type: 'prod',
    })
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [fooDep],
      new PathScurry(t.testdirName),
      customConfig,
      new Set<DepID>(),
      new Map([['foo', fooDep]]),
    )

    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      'default-registry spec never reuses the custom-registry lock',
    )
  },
)

t.test(
  'lockedResolutions rejects a lock outside the requested range',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const foo2 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^2.0.0', configData),
      { name: 'foo', version: '2.0.0' },
    )!
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0foo`, foo2.id],
    ])
    graph.resetEdges()

    const packageInfo = {
      async manifest() {
        return { name: 'foo', version: '1.0.0' }
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

    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      'out-of-range lock is not reused',
    )
  },
)

t.test(
  'lockedResolutions rejects a lock with an unparseable version',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const jsrConfig: SpecOptions = {
      ...configData,
      'jsr-registries': {
        jsr: 'https://npm.jsr.io/',
      },
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...jsrConfig,
      mainManifest,
    })
    const weirdId = joinDepIDTuple([
      'registry',
      'jsr',
      '@jsr/std__semver@not-a-version',
    ])
    const weirdNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('@jsr/std__semver', 'jsr:^1.0.8', jsrConfig),
      { name: '@jsr/std__semver', version: 'not-a-version' },
      weirdId,
    )!
    const alias = Spec.parse(
      'semver',
      'jsr:@std/semver@^1.0.8',
      jsrConfig,
    )
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0${alias.name}`, weirdNode.id],
    ])
    graph.resetEdges()

    let manifestCalled = false
    const packageInfo = {
      async manifest() {
        manifestCalled = true
        return { name: '@jsr/std__semver', version: '1.0.8' }
      },
    } as unknown as PackageInfoClient

    const semverDep = asDependency({ spec: alias, type: 'prod' })
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [semverDep],
      new PathScurry(t.testdirName),
      jsrConfig,
      new Set<DepID>(),
      new Map([[alias.name, semverDep]]),
    )

    t.ok(manifestCalled, 'unparseable locked version forces a fetch')
    t.equal(
      graph.mainImporter.edgesOut.get(alias.name)?.to?.version,
      '1.0.8',
      'resolves a fresh node instead of the unparseable lock',
    )
  },
)

t.test(
  'lockedResolutions falls back to the base id for provisional peer parents',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // two satisfying candidates; findResolution would pick 1.0.2 first
    graph.addNode(joinDepIDTuple(['registry', '', 'x@1.0.2']), {
      name: 'x',
      version: '1.0.2',
    })
    const x103 = graph.addNode(
      joinDepIDTuple(['registry', '', 'x@1.0.3']),
      { name: 'x', version: '1.0.3' },
    )

    // the lockfile captured dup's x target under dup's base id; the
    // rebuild will mint a provisional peer.0 id for dup, missing the
    // exact-id key
    graph.lockedResolutions = new Map([
      [
        `${joinDepIDTuple(['registry', '', 'dup@1.0.0'])}\0x`,
        x103.id,
      ],
    ])

    const dupManifest = {
      name: 'dup',
      version: '1.0.0',
      peerDependencies: { x: '^1.0.0' },
    }
    const packageInfo = {
      async manifest(spec: Spec) {
        if (spec.name === 'dup') return dupManifest
        return { name: 'x', version: '1.0.3' }
      },
    } as unknown as PackageInfoClient

    const dupDep = asDependency({
      spec: Spec.parse('dup', '^1.0.0', configData),
      type: 'prod',
    })
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [dupDep],
      new PathScurry(t.testdirName),
      configData,
      new Set<DepID>(),
      new Map([['dup', dupDep]]),
    )

    const dupNode = graph.mainImporter.edgesOut.get('dup')?.to
    t.ok(dupNode, 'dup was placed')
    t.match(dupNode?.id, /peer\.0/, 'dup got a provisional peer id')
    t.equal(
      dupNode?.edgesOut.get('x')?.to,
      x103,
      'base-id lock keeps the captured x@1.0.3 over first-satisfying',
    )
  },
)

t.test(
  'lockedResolutions reuses a jsr dist-tag lock via the loose fallback',
  async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const jsrConfig: SpecOptions = {
      ...configData,
      'jsr-registries': {
        jsr: 'https://npm.jsr.io/',
      },
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...jsrConfig,
      mainManifest,
    })
    const jsrId = joinDepIDTuple([
      'registry',
      'jsr',
      '@jsr/std__semver@1.0.8',
    ])
    const jsrNode = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('@jsr/std__semver', 'jsr:^1.0.8', jsrConfig),
      { name: '@jsr/std__semver', version: '1.0.8' },
      jsrId,
    )!
    const alias = Spec.parse(
      'semver',
      'jsr:@std/semver@latest',
      jsrConfig,
    )
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0${alias.name}`, jsrNode.id],
    ])
    graph.resetEdges()

    let manifestCalled = false
    const packageInfo = {
      async manifest() {
        manifestCalled = true
        throw new Error('unexpected manifest fetch')
      },
    } as unknown as PackageInfoClient

    const semverDep = asDependency({ spec: alias, type: 'prod' })
    await appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [semverDep],
      new PathScurry(t.testdirName),
      jsrConfig,
      new Set<DepID>(),
      new Map([[alias.name, semverDep]]),
    )

    t.notOk(manifestCalled, 'dist-tag jsr lock skips manifest()')
    t.equal(
      graph.mainImporter.edgesOut.get(alias.name)?.to?.id,
      jsrNode.id,
      'source-compatible dist-tag lock is reused',
    )
  },
)

t.test('locked version fetch without node_modules', async t => {
  const mainManifest = { name: 'my-project', version: '1.0.0' }
  const setup = (
    t: Test,
    {
      id,
      name = 'foo',
      version = '1.1.0',
      edgeName = 'foo',
      options = configData,
    }: {
      id: DepID
      name?: string
      version?: string
      edgeName?: string
      options?: SpecOptions
    },
  ) => {
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...options,
      mainManifest,
    })
    // shaped like lockfile/load-nodes.ts with no actual graph: name,
    // version, resolved and integrity, but no manifest
    const locked = graph.addNode(
      id,
      undefined,
      undefined,
      name,
      version,
    )
    locked.resolved = `https://old.example/${name}/-/${name}-1.1.0.tgz`
    locked.integrity = 'sha512-deadbeef'
    locked.resolvedFromLockfile = true
    graph.lockedResolutions = new Map([
      [`${graph.mainImporter.id}\0${edgeName}`, locked.id],
    ])
    graph.resetEdges()
    return { graph, locked }
  }

  const recorder = (
    answer: (spec: Spec) => Manifest | Promise<Manifest>,
  ) => {
    const calls: { spec: string; registry?: string }[] = []
    const packageInfo = {
      async manifest(spec: Spec) {
        calls.push({
          spec: String(spec),
          registry: spec.final.registry,
        })
        return answer(spec)
      },
    } as unknown as PackageInfoClient
    return { calls, packageInfo }
  }

  // exact specs answer their own version, ranges answer a newer one
  const byVersion = (name: string) => (spec: Spec) => {
    const v = parseVersion(spec.final.semver ?? '')
    return { name, version: v ? String(v) : '1.2.0' }
  }

  const run = (
    t: Test,
    graph: Graph,
    packageInfo: PackageInfoClient,
    dep: Dependency,
    options: SpecOptions = configData,
  ) =>
    appendNodes(
      packageInfo,
      graph,
      graph.mainImporter,
      [dep],
      new PathScurry(t.testdirName),
      options,
      new Set<DepID>(),
      new Map([[dep.spec.name, dep]]),
    )

  const fooId = joinDepIDTuple(['registry', '', 'foo@1.1.0'])
  const foo12Id = joinDepIDTuple(['registry', '', 'foo@1.2.0'])
  const fooDep = () =>
    asDependency({
      spec: Spec.parse('foo', '^1.0.0', configData),
      type: 'prod',
    })

  await t.test('pins the locked version', async t => {
    const { graph, locked } = setup(t, { id: fooId })
    const { calls, packageInfo } = recorder(byVersion('foo'))
    await run(t, graph, packageInfo, fooDep())
    t.strictSame(calls, [
      { spec: 'foo@1.1.0', registry: configData.registry },
    ])
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to, locked)
    t.equal(locked.detached, false)
    t.equal(locked.manifest?.version, '1.1.0')
    t.equal(locked.integrity, 'sha512-deadbeef')
    t.equal(locked.resolvedFromLockfile, true)
    t.notOk(graph.nodes.has(foo12Id), 'newest satisfying not placed')
  })

  await t.test('falls back when the exact fetch rejects', async t => {
    const { graph, locked } = setup(t, { id: fooId })
    const { calls, packageInfo } = recorder(spec => {
      if (spec.final.semver === '1.1.0') throw new Error('gone')
      return { name: 'foo', version: '1.2.0' }
    })
    await run(t, graph, packageInfo, fooDep())
    t.strictSame(
      calls.map(c => c.spec),
      ['foo@1.1.0', 'foo@^1.0.0'],
    )
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to?.id, foo12Id)
    t.equal(locked.detached, true, 'locked node left for gc')
  })

  await t.test('falls back on a version mismatch', async t => {
    const { graph } = setup(t, { id: fooId })
    const { calls, packageInfo } = recorder(() => ({
      name: 'foo',
      version: '1.2.0',
    }))
    await run(t, graph, packageInfo, fooDep())
    t.strictSame(
      calls.map(c => c.spec),
      ['foo@1.1.0', 'foo@^1.0.0'],
    )
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to?.id, foo12Id)
  })

  await t.test('range fetch runs once after a mismatch', async t => {
    const { graph } = setup(t, { id: fooId })
    const { calls, packageInfo } = recorder(spec => {
      if (spec.final.semver === '1.1.0') {
        return { name: 'foo', version: '1.2.0' }
      }
      throw new Error('range boom')
    })
    await t.rejects(
      run(t, graph, packageInfo, fooDep()),
      /range boom/,
    )
    t.equal(calls.length, 2)
  })

  await t.test('preserves an alias', async t => {
    const { graph, locked } = setup(t, { id: fooId, edgeName: 'bar' })
    const { calls, packageInfo } = recorder(byVersion('foo'))
    const dep = asDependency({
      spec: Spec.parse('bar', 'npm:foo@^1.0.0', configData),
      type: 'prod',
    })
    await run(t, graph, packageInfo, dep)
    t.strictSame(
      calls.map(c => c.spec),
      ['bar@npm:foo@1.1.0'],
    )
    t.equal(graph.mainImporter.edgesOut.get('bar')?.to, locked)
  })

  const customId = joinDepIDTuple(['registry', 'custom', 'foo@1.1.0'])
  const withCustom = (url: string): SpecOptions => ({
    ...configData,
    registries: { ...configData.registries, custom: url },
  })

  await t.test('preserves a named registry', async t => {
    const options = withCustom('https://registry.example.com/')
    const { graph, locked } = setup(t, { id: customId, options })
    const { calls, packageInfo } = recorder(byVersion('foo'))
    const dep = asDependency({
      spec: Spec.parse('foo', 'custom:foo@^1.0.0', options),
      type: 'prod',
    })
    await run(t, graph, packageInfo, dep, options)
    t.strictSame(calls, [
      {
        spec: 'foo@custom:foo@1.1.0',
        registry: 'https://registry.example.com/',
      },
    ])
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to, locked)
  })

  await t.test('re-parses a remapped named registry', async t => {
    const oldOptions = withCustom('https://old.example/')
    const options = withCustom('https://new.example/')
    // the dep-id memo ignores options, so a stale entry survives
    hydrate(customId, 'foo', oldOptions)
    t.not(
      hydrate(customId, 'foo', options).final.registry,
      'https://new.example/',
      'memo returns the stale registry',
    )
    const { graph, locked } = setup(t, { id: customId, options })
    const { calls, packageInfo } = recorder(byVersion('foo'))
    const dep = asDependency({
      spec: Spec.parse('foo', 'custom:foo@^1.0.0', options),
      type: 'prod',
    })
    await run(t, graph, packageInfo, dep, options)
    t.strictSame(calls, [
      {
        spec: 'foo@custom:foo@1.1.0',
        registry: 'https://new.example/',
      },
    ])
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to, locked)
    // known gap: the lockfile tarball from the old URL is kept, same
    // as with node_modules present
    t.equal(
      locked.resolved,
      'https://old.example/foo/-/foo-1.1.0.tgz',
    )
  })

  await t.test('does not pin across a registry mismatch', async t => {
    const oldOptions = withCustom('https://old.example/')
    const options = withCustom('https://new.example/')
    const { graph } = setup(t, { id: customId, options })
    const { calls, packageInfo } = recorder(byVersion('foo'))
    // edge spec resolved against the old URL, install options moved on
    const dep = asDependency({
      spec: Spec.parse('foo', 'custom:foo@^1.0.0', oldOptions),
      type: 'prod',
    })
    await run(t, graph, packageInfo, dep, options)
    t.strictSame(calls, [
      {
        spec: 'foo@custom:foo@^1.0.0',
        registry: 'https://old.example/',
      },
    ])
    t.equal(
      graph.mainImporter.edgesOut.get('foo')?.to?.id,
      joinDepIDTuple(['registry', 'custom', 'foo@1.2.0']),
    )
  })

  await t.test('skips a git lock', async t => {
    const gitId = joinDepIDTuple(['git', 'github:a/b', 'main'])
    const { graph, locked } = setup(t, {
      id: gitId,
      name: 'b',
      version: '',
      edgeName: 'b',
    })
    const { calls, packageInfo } = recorder(() => ({
      name: 'b',
      version: '1.0.0',
    }))
    const dep = asDependency({
      spec: Spec.parse('b', 'github:a/b#main', configData),
      type: 'prod',
    })
    await run(t, graph, packageInfo, dep)
    t.strictSame(
      calls.map(c => c.spec),
      ['b@github:a/b#main'],
    )
    t.equal(graph.mainImporter.edgesOut.get('b')?.to, locked)
  })

  await t.test('skips a registry lock without a version', async t => {
    const { graph } = setup(t, { id: fooId, version: '' })
    const { calls, packageInfo } = recorder(byVersion('foo'))
    await run(t, graph, packageInfo, fooDep())
    t.strictSame(
      calls.map(c => c.spec),
      ['foo@^1.0.0'],
    )
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to?.id, foo12Id)
  })

  await t.test(
    'hydrates a node shared by two edges once',
    async t => {
      const { graph, locked } = setup(t, { id: fooId })
      graph.lockedResolutions?.set(
        `${graph.mainImporter.id}\0foo2`,
        locked.id,
      )
      const { calls, packageInfo } = recorder(byVersion('foo'))
      const fooDep2 = asDependency({
        spec: Spec.parse('foo2', 'npm:foo@^1.0.0', configData),
        type: 'prod',
      })
      await appendNodes(
        packageInfo,
        graph,
        graph.mainImporter,
        [fooDep(), fooDep2],
        new PathScurry(t.testdirName),
        configData,
        new Set<DepID>(),
        new Map([
          ['foo', fooDep()],
          ['foo2', fooDep2],
        ]),
      )
      t.strictSame(
        calls.map(c => c.spec),
        ['foo@1.1.0'],
      )
      t.equal(graph.mainImporter.edgesOut.get('foo')?.to, locked)
      t.equal(graph.mainImporter.edgesOut.get('foo2')?.to, locked)
    },
  )

  await t.test('optional dep swallows both failures', async t => {
    const { graph } = setup(t, { id: fooId })
    const { calls, packageInfo } = recorder(() => {
      throw new Error('nope')
    })
    const dep = asDependency({
      spec: Spec.parse('foo', '^1.0.0', configData),
      type: 'optional',
    })
    await run(t, graph, packageInfo, dep)
    t.equal(calls.length, 2)
    t.equal(graph.mainImporter.edgesOut.get('foo')?.to, undefined)
  })
})
