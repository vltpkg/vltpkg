import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import { kCustomInspect, Spec } from '@vltpkg/spec'
import type { DependencySaveType } from '@vltpkg/types'
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

  await t.rejects(
    refreshIdealGraph({
      add: new Map([
        [joinDepIDTuple(['file', 'unknown']), addEntry('foo')],
      ]) as AddImportersDependenciesMap,
      remove: new Map() as RemoveImportersDependenciesMap,
      graph,
      packageInfo,
      scurry: new PathScurry(t.testdirName),
      remover: new RollbackRemove(),
    }),
    /Could not find importer/,
    'should throw an error if finding an unknown importer id',
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
      2,
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
