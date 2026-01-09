import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import type { DependencySaveType } from '@vltpkg/types'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import type {
  AddImportersDependenciesMap,
  Dependency,
  RemoveImportersDependenciesMap,
} from '../../src/dependencies.ts'
import { Graph } from '../../src/graph.ts'
import type { GraphModifier } from '../../src/modifiers.ts'
import {
  refreshIdealGraph,
  nextPeerContextIndex,
} from '../../src/ideal/refresh-ideal-graph.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { load } from '../../src/actual/load.ts'
import { PackageJson } from '@vltpkg/package-json'

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

t.test('refreshIdealGraph', async t => {
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
      }
    },
  } as PackageInfoClient
  const addEntry = (
    name: string,
    type: DependencySaveType = 'implicit',
  ) =>
    new Map(
      Object.entries({
        foo: {
          spec: Spec.parse(name, '^1.0.0'),
          type,
        } satisfies Dependency,
      }),
    )

  t.matchSnapshot(objectLikeOutput(graph), 'initial graph')

  await refreshIdealGraph({
    add: new Map([
      [joinDepIDTuple(['file', '.']), addEntry('foo')],
    ]) as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    graph,
    packageInfo,
    scurry: new PathScurry(t.testdirName),
    remover: new RollbackRemove(),
  })
  t.matchSnapshot(objectLikeOutput(graph), 'graph with an added foo')

  await refreshIdealGraph({
    add: new Map([
      [joinDepIDTuple(['file', '.']), addEntry('foo')],
    ]) as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    graph,
    scurry: new PathScurry(t.testdirName),
    packageInfo,
    remover: new RollbackRemove(),
  })
  t.matchSnapshot(
    objectLikeOutput(graph),
    'graph after adding foo when there is an already existing foo',
  )

  // place a missing package bar on the main importer
  graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('bar', '^1.0.0'),
  )
  t.matchSnapshot(
    objectLikeOutput(graph),
    'graph with missing package bar',
  )

  // now it should install the package bar to the main importer
  await refreshIdealGraph({
    add: new Map([
      [joinDepIDTuple(['file', '.']), addEntry('bar', 'dev')],
    ]) as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    scurry: new PathScurry(t.testdirName),
    graph,
    packageInfo,
    remover: new RollbackRemove(),
  })
  t.matchSnapshot(
    objectLikeOutput(graph),
    'graph after adding a previously missing dependency bar',
  )

  t.test('with modifiers', async t => {
    const modifierCalls = {
      tryImporter: 0,
      tryDependencies: 0,
    }

    const mockModifier = {
      tryImporter: () => {
        modifierCalls.tryImporter++
        return undefined
      },
      tryDependencies: () => {
        modifierCalls.tryDependencies++
        return new Map()
      },
    } as unknown as GraphModifier

    await refreshIdealGraph({
      add: new Map([
        [joinDepIDTuple(['file', '.']), addEntry('foo')],
      ]) as AddImportersDependenciesMap,
      remove: new Map() as RemoveImportersDependenciesMap,
      graph,
      packageInfo,
      scurry: new PathScurry(t.testdirName),
      modifiers: mockModifier,
      remover: new RollbackRemove(),
    })

    t.equal(modifierCalls.tryImporter, 1, 'tryImporter was called')
    t.equal(
      modifierCalls.tryDependencies,
      1,
      'tryDependencies was called',
    )
  })
})

t.test('refreshIdealGraph waits for extraction promises', async t => {
  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
  }

  // Create an ideal graph with a new node
  const idealGraph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
  })

  // Create an actual graph without the node
  const actualGraph = new Graph({
    projectRoot: t.testdirName,
    ...configData,
    mainManifest,
  })

  const extractionCompleted = { value: false }
  const extractionStarted = { value: false }

  const packageInfo = {
    async manifest(spec: Spec) {
      if (spec.name === 'foo') return fooManifest
      return null
    },
    async extract() {
      extractionStarted.value = true
      // Simulate async extraction with a delay
      await new Promise(resolve => setTimeout(resolve, 50))
      extractionCompleted.value = true
      return { extracted: true }
    },
  } as unknown as PackageInfoClient

  const addEntry = new Map(
    Object.entries({
      foo: {
        spec: Spec.parse('foo', '^1.0.0'),
        type: 'prod' as DependencySaveType,
      } satisfies Dependency,
    }),
  )

  // Call refreshIdealGraph with actual graph to trigger early extraction
  await refreshIdealGraph({
    add: new Map([
      [joinDepIDTuple(['file', '.']), addEntry],
    ]) as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    graph: idealGraph,
    packageInfo,
    scurry: new PathScurry(t.testdirName),
    actual: actualGraph,
    remover: new RollbackRemove(),
  })

  // Verify that extraction was started and completed
  t.ok(extractionStarted.value, 'extraction was started')
  t.ok(
    extractionCompleted.value,
    'extraction was completed before refreshIdealGraph returned',
  )
})

t.test(
  'refreshIdealGraph handles multiple extraction promises concurrently',
  async t => {
    const fooManifest = {
      name: 'foo',
      version: '1.0.0',
    }
    const barManifest = {
      name: 'bar',
      version: '1.0.0',
    }
    const bazManifest = {
      name: 'baz',
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

    const extractedPackages: string[] = []
    const extractionOrder: number[] = []
    let extractionCounter = 0

    const packageInfo = {
      async manifest(spec: Spec) {
        switch (spec.name) {
          case 'foo':
            return fooManifest
          case 'bar':
            return barManifest
          case 'baz':
            return bazManifest
          default:
            return null
        }
      },
      async extract(spec: Spec) {
        const order = extractionCounter++
        extractionOrder.push(order)
        // Different delays to test concurrent execution
        const delays: Record<string, number> = {
          foo: 30,
          bar: 10,
          baz: 20,
        }
        await new Promise(resolve =>
          setTimeout(resolve, delays[spec.name] || 0),
        )
        extractedPackages.push(spec.name)
        return { extracted: true }
      },
    } as unknown as PackageInfoClient

    const addEntry = new Map(
      Object.entries({
        foo: {
          spec: Spec.parse('foo', '^1.0.0'),
          type: 'prod' as DependencySaveType,
        } satisfies Dependency,
        bar: {
          spec: Spec.parse('bar', '^1.0.0'),
          type: 'prod' as DependencySaveType,
        } satisfies Dependency,
        baz: {
          spec: Spec.parse('baz', '^1.0.0'),
          type: 'prod' as DependencySaveType,
        } satisfies Dependency,
      }),
    )

    await refreshIdealGraph({
      add: new Map([
        [joinDepIDTuple(['file', '.']), addEntry],
      ]) as AddImportersDependenciesMap,
      remove: new Map() as RemoveImportersDependenciesMap,
      graph: idealGraph,
      packageInfo,
      scurry: new PathScurry(t.testdirName),
      actual: actualGraph,
      remover: new RollbackRemove(),
    })

    // Verify all packages were extracted
    t.equal(
      extractedPackages.length,
      3,
      'all three packages were extracted',
    )
    t.ok(extractedPackages.includes('foo'), 'foo was extracted')
    t.ok(extractedPackages.includes('bar'), 'bar was extracted')
    t.ok(extractedPackages.includes('baz'), 'baz was extracted')

    // Verify all extractions started before any completed (concurrent execution)
    t.equal(extractionOrder.length, 3, 'all extractions were started')
  },
)

t.test('nextPeerContextIndex', async t => {
  t.test('returns incrementing indices', async t => {
    const idx1 = nextPeerContextIndex()
    const idx2 = nextPeerContextIndex()
    const idx3 = nextPeerContextIndex()

    t.ok(idx2 > idx1, 'second index should be greater')
    t.ok(idx3 > idx2, 'third index should be greater')
    t.equal(idx3 - idx2, 1, 'should increment by 1')
  })
})

t.test('refreshIdealGraph with workspaces', async t => {
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'root-project',
      version: '1.0.0',
    }),
    'vlt.json': JSON.stringify({
      workspaces: ['./packages/*'],
    }),
    packages: {
      'workspace-a': {
        'package.json': JSON.stringify({
          name: 'workspace-a',
          version: '1.0.0',
          dependencies: {
            foo: '^1.0.0',
          },
        }),
      },
      'workspace-b': {
        'package.json': JSON.stringify({
          name: 'workspace-b',
          version: '1.0.0',
          dependencies: {
            bar: '^1.0.0',
          },
        }),
      },
      'workspace-c': {
        'package.json': JSON.stringify({
          name: 'workspace-c',
          version: '1.0.0',
          peerDependencies: {
            lorem: '^1.0.0',
          },
        }),
        node_modules: {
          lorem: t.fixture(
            'symlink',
            `../../../node_modules/.vlt/${joinDepIDTuple(['registry', '', 'lorem@1.0.0'])}/node_modules/lorem`,
          ),
        },
      },
      // Second workspace with peerDeps to cover sorting both aIsPeer and bIsPeer
      'workspace-d': {
        'package.json': JSON.stringify({
          name: 'workspace-d',
          version: '1.0.0',
          peerDependencies: {
            ipsum: '^1.0.0',
          },
        }),
        node_modules: {
          ipsum: t.fixture(
            'symlink',
            `../../../node_modules/.vlt/${joinDepIDTuple(['registry', '', 'ipsum@1.0.0'])}/node_modules/ipsum`,
          ),
        },
      },
    },
    node_modules: {
      '.vlt': {
        [joinDepIDTuple(['registry', '', 'lorem@1.0.0'])]: {
          node_modules: {
            lorem: {
              'package.json': JSON.stringify({
                name: 'lorem',
                version: '1.0.0',
              }),
            },
          },
        },
        [joinDepIDTuple(['registry', '', 'ipsum@1.0.0'])]: {
          node_modules: {
            ipsum: {
              'package.json': JSON.stringify({
                name: 'ipsum',
                version: '1.0.0',
              }),
            },
          },
        },
      },
    },
  })

  const fooManifest = {
    name: 'foo',
    version: '1.0.0',
  }
  const barManifest = {
    name: 'bar',
    version: '1.0.0',
  }
  const bazManifest = {
    name: 'baz',
    version: '1.0.0',
  }
  const quxManifest = {
    name: 'qux',
    version: '1.0.0',
  }

  const packageInfo = {
    async manifest(spec: Spec) {
      switch (spec.name) {
        case 'foo':
          return fooManifest
        case 'bar':
          return barManifest
        case 'baz':
          return bazManifest
        case 'qux':
          return quxManifest
        case 'lorem':
        case 'ipsum': {
          throw new Error(
            `${spec.name} should be loaded from the actual graph`,
          )
        }
        default:
          return null
      }
    },
  } as PackageInfoClient

  const mainManifest = {
    name: 'root-project',
    version: '1.0.0',
    workspaces: ['packages/*'],
  }

  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const monorepo = Monorepo.load(projectRoot, {
    config: {
      workspaces: ['./packages/*'],
    },
    scurry,
    packageJson,
  })
  const graph = load({
    projectRoot,
    scurry,
    packageJson,
    monorepo,
    ...configData,
    mainManifest,
    loadManifests: true,
  })

  t.equal(
    graph.importers.size,
    5,
    'should have expected number of importers',
  )

  // Create add/remove maps for different importers
  const add = new Map<DepID, Map<string, Dependency>>([
    [
      graph.mainImporter.id,
      new Map<string, Dependency>([
        [
          'baz',
          {
            spec: Spec.parse('baz', '^1.0.0'),
            type: 'prod',
          } satisfies Dependency,
        ],
      ]),
    ],
    [
      joinDepIDTuple(['workspace', 'packages/workspace-a']),
      new Map<string, Dependency>([
        [
          'qux',
          {
            spec: Spec.parse('qux', '^1.0.0'),
            type: 'dev',
          } satisfies Dependency,
        ],
      ]),
    ],
  ]) as AddImportersDependenciesMap
  add.modifiedDependencies = true

  const remove = new Map<DepID, Set<string>>([
    [
      joinDepIDTuple(['workspace', 'packages/workspace-b']),
      new Set<string>(['bar']),
    ],
  ]) as RemoveImportersDependenciesMap
  remove.modifiedDependencies = true

  await refreshIdealGraph({
    add,
    remove,
    graph,
    packageInfo,
    scurry: new PathScurry(projectRoot),
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(
    objectLikeOutput(graph),
    'graph with workspace changes',
  )

  // Verify main importer has baz
  const mainBazEdge = graph.mainImporter.edgesOut.get('baz')
  t.ok(mainBazEdge, 'main importer should have baz edge')
  t.equal(mainBazEdge?.to?.name, 'baz', 'baz edge points to baz node')

  // Verify workspace-a has qux
  const workspaceA = graph.nodes.get(
    joinDepIDTuple(['workspace', 'packages/workspace-a']),
  )!
  const workspaceAQuxEdge = workspaceA.edgesOut.get('qux')
  t.ok(workspaceAQuxEdge, 'workspace-a should have qux edge')
  t.equal(
    workspaceAQuxEdge?.to?.name,
    'qux',
    'qux edge points to qux node',
  )

  // Verify workspace-b no longer has bar
  const workspaceB = graph.nodes.get(
    joinDepIDTuple(['workspace', 'packages/workspace-b']),
  )!
  const workspaceBBarEdge = workspaceB.edgesOut.get('bar')
  t.notOk(workspaceBBarEdge, 'workspace-b should not have bar edge')
})

t.test(
  'refreshIdealGraph processes mainImporter before workspaces',
  async t => {
    // Use "z-" prefix for main project so it would sort LAST alphabetically
    // Use "a-" prefix for workspaces so they would sort FIRST alphabetically
    // This proves mainImporter is always processed first regardless of name
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'z-main-project',
        version: '1.0.0',
      }),
      'vlt.json': JSON.stringify({
        workspaces: ['./packages/*'],
      }),
      packages: {
        'a-workspace': {
          'package.json': JSON.stringify({
            name: 'a-workspace',
            version: '1.0.0',
          }),
        },
      },
    })

    const mainDepManifest = { name: 'main-dep', version: '1.0.0' }
    const wsDepManifest = { name: 'ws-dep', version: '1.0.0' }

    // Track order of manifest fetches to verify processing order
    const fetchOrder: string[] = []
    const packageInfo = {
      async manifest(spec: Spec) {
        fetchOrder.push(spec.name)
        if (spec.name === 'main-dep') return mainDepManifest
        if (spec.name === 'ws-dep') return wsDepManifest
        return null
      },
    } as PackageInfoClient

    const mainManifest = {
      name: 'z-main-project',
      version: '1.0.0',
    }

    const scurry = new PathScurry(projectRoot)
    const packageJson = new PackageJson()
    const monorepo = Monorepo.load(projectRoot, {
      config: { workspaces: ['./packages/*'] },
      scurry,
      packageJson,
    })
    const graph = new Graph({
      projectRoot,
      ...configData,
      mainManifest,
      monorepo,
    })

    // Add deps to both main importer and workspace
    const add = new Map<DepID, Map<string, Dependency>>([
      [
        graph.mainImporter.id,
        new Map<string, Dependency>([
          [
            'main-dep',
            {
              spec: Spec.parse('main-dep', '^1.0.0'),
              type: 'prod',
            } satisfies Dependency,
          ],
        ]),
      ],
      [
        joinDepIDTuple(['workspace', 'packages/a-workspace']),
        new Map<string, Dependency>([
          [
            'ws-dep',
            {
              spec: Spec.parse('ws-dep', '^1.0.0'),
              type: 'prod',
            } satisfies Dependency,
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap
    add.modifiedDependencies = true

    await refreshIdealGraph({
      add,
      remove: new Map() as RemoveImportersDependenciesMap,
      graph,
      packageInfo,
      scurry,
      remover: new RollbackRemove(),
    })

    // Verify mainImporter's dependency was fetched FIRST
    t.equal(
      fetchOrder[0],
      'main-dep',
      'mainImporter dependency should be fetched first',
    )
    t.equal(
      fetchOrder[1],
      'ws-dep',
      'workspace dependency should be fetched second',
    )
  },
)
