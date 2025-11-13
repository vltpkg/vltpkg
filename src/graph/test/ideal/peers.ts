import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import {
  addEntriesToPeerContext,
  endPeerPlacement,
  forkPeerContext,
  nextPeerContextIndex,
  retrievePeerContextHash,
  startPeerPlacement,
} from '../../src/ideal/peers.ts'
import type {
  PeerContext,
  PeerContextEntryInput,
} from '../../src/ideal/peers.ts'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { build } from '../../src/ideal/build.ts'
import { load as actualLoad } from '../../src/actual/load.ts'
import { asDependency } from '../../src/dependencies.ts'
import { mermaidOutput } from '../../src/visualization/mermaid-output.ts'
import type {
  Dependency,
  AddImportersDependenciesMap,
} from '../../src/dependencies.ts'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type { Node } from '../../src/node.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('retrievePeerContextHash', async t => {
  t.test('returns undefined for undefined context', async t => {
    t.equal(
      retrievePeerContextHash(undefined, {
        id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      } as unknown as Node),
      undefined,
      'should return undefined',
    )
  })

  t.test('returns peer context hash string', async t => {
    const peerContext: PeerContext = new Map()
    peerContext.index = 5
    t.equal(
      retrievePeerContextHash(peerContext, {
        id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      } as unknown as Node),
      'ṗ:15b4151810b76b23cc2a6910911011c49e18de96c162bf510a92b9a0a8d04b95',
      'should return formatted reference',
    )
  })

  t.test('returns undefined if no index', async t => {
    const peerContext: PeerContext = new Map()
    t.equal(
      retrievePeerContextHash(peerContext, {
        id: joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      } as unknown as Node),
      undefined,
      'should return undefined when index not set',
    )
  })
})

t.test('addEntriesToPeerContext', async t => {
  t.test('adds new entry to empty context', async t => {
    const peerContext: PeerContext = new Map()
    const spec = Spec.parse('foo', '^1.0.0', configData)

    const needsFork = addEntriesToPeerContext(peerContext, [
      { spec, type: 'peer' },
    ])

    t.equal(needsFork, false, 'should not need fork')
    t.equal(peerContext.size, 1, 'should have one entry')
    const entry = peerContext.get('foo')
    t.ok(entry, 'should have foo entry')
    t.equal(entry?.specs.size, 1, 'should have one spec')
    t.equal(entry?.type, 'peer', 'should be peer type')
  })

  t.test('adds dependent to existing entry', async t => {
    const peerContext: PeerContext = new Map()
    const spec = Spec.parse('foo', '^1.0.0', configData)
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('bar', '^1.0.0', configData),
      { name: 'bar', version: '1.0.0' },
    )!

    // First add without dependent
    addEntriesToPeerContext(peerContext, [{ spec, type: 'peer' }])

    // Then add with dependent
    const needsFork = addEntriesToPeerContext(peerContext, [
      { spec, type: 'peer', dependent: node },
    ])

    t.equal(needsFork, false, 'should not need fork')
    const entry = peerContext.get('foo')
    t.equal(
      entry?.contextDependents.size,
      1,
      'should have one dependent',
    )
    t.ok(entry?.contextDependents.has(node), 'should include node')
  })

  t.test(
    'needs fork when target conflicts with existing specs',
    async t => {
      const peerContext: PeerContext = new Map()
      const spec1 = Spec.parse('foo', '^1.0.0', configData)
      const spec2 = Spec.parse('foo', '^2.0.0', configData)
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      // Add first spec
      addEntriesToPeerContext(peerContext, [
        { spec: spec1, type: 'peer' },
      ])

      // Add target with conflicting version
      const target = graph.placePackage(
        graph.mainImporter,
        'prod',
        spec2,
        { name: 'foo', version: '2.0.0' },
      )!

      const needsFork = addEntriesToPeerContext(peerContext, [
        { spec: spec2, target, type: 'peer' },
      ])

      t.equal(needsFork, true, 'should need fork due to conflict')
    },
  )

  t.test('needs fork when specs do not intersect', async t => {
    const peerContext: PeerContext = new Map()
    const spec1 = Spec.parse('foo', '^1.0.0', configData)
    const spec2 = Spec.parse('foo', '^2.0.0', configData)
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
      Spec.parse('bar', '^1.0.0', configData),
      { name: 'bar', version: '1.0.0' },
    )!

    // Add first spec with dependent
    addEntriesToPeerContext(peerContext, [
      { spec: spec1, type: 'peer' },
    ])

    // Add conflicting spec
    const needsFork = addEntriesToPeerContext(peerContext, [
      { spec: spec2, type: 'peer' },
    ])

    t.equal(
      needsFork,
      true,
      'should need fork when ranges do not intersect',
    )
  })

  t.test('updates target and rewires edges', async t => {
    const peerContext: PeerContext = new Map()
    const spec = Spec.parse('foo', '^1.0.0', configData)
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const target1 = graph.placePackage(
      graph.mainImporter,
      'prod',
      spec,
      { name: 'foo', version: '1.0.0' },
    )!

    const dependent = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('bar', '^1.0.0', configData),
      { name: 'bar', version: '1.0.0' },
    )!

    // Add peer edge from dependent to target1
    graph.addEdge('peer', spec, dependent, target1)

    // Add first target
    addEntriesToPeerContext(peerContext, [
      { spec, target: target1, type: 'peer', dependent },
    ])

    // Create new target
    const target2 = graph.placePackage(
      graph.mainImporter,
      'prod',
      spec,
      { name: 'foo', version: '1.0.1' },
    )!

    // Add new target - should update edges
    const needsFork = addEntriesToPeerContext(peerContext, [
      { spec, target: target2, type: 'peer' },
    ])

    t.equal(needsFork, false, 'should not need fork')
    const entry = peerContext.get('foo')
    t.equal(entry?.target?.id, target2.id, 'should update target')

    // Check edge was rewired
    const edge = dependent.edgesOut.get('foo')
    t.equal(
      edge?.to?.id,
      target2.id,
      'edge should point to new target',
    )
  })
  t.test(
    'adds entry with no target then updates with target',
    async t => {
      const peerContext: PeerContext = new Map()
      const spec = Spec.parse('foo', '^1.0.0', configData)
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      // Place a dependent node
      graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('bar', '^1.0.0', configData),
        { name: 'bar', version: '1.0.0' },
      )!

      // Add entry with no target
      let needsFork = addEntriesToPeerContext(peerContext, [
        { spec, type: 'peer' },
      ])

      t.equal(
        needsFork,
        false,
        'should not need fork when adding entry with no target',
      )
      let entry = peerContext.get('foo')
      t.ok(entry, 'should have entry for foo after first add')
      t.equal(
        entry?.target,
        undefined,
        'entry target should be undefined after first add',
      )

      // Add entry with a target to update
      const target = graph.placePackage(
        graph.mainImporter,
        'prod',
        spec,
        { name: 'foo', version: '1.0.0' },
      )!

      needsFork = addEntriesToPeerContext(peerContext, [
        { spec, type: 'peer', target },
      ])

      t.equal(
        needsFork,
        false,
        'should not need fork when adding target to existing entry',
      )
      entry = peerContext.get('foo')
      t.ok(
        entry,
        'should still have entry for foo after target update',
      )
      t.equal(
        entry?.target?.id,
        target.id,
        'entry target should be updated to the new target',
      )
    },
  )

  t.test('adds entry for git spec with name', async t => {
    const peerContext: PeerContext = new Map()
    const spec = Spec.parse(
      '@user/repo',
      'github:user/repo',
      configData,
    )

    const needsFork = addEntriesToPeerContext(peerContext, [
      { spec, type: 'peer' },
    ])

    t.equal(needsFork, false, 'should not need fork')
    t.ok(peerContext.size > 0, 'should add entry for git spec')
  })
})

t.test('forkPeerContext', async t => {
  t.test('creates forked context with new entries', async t => {
    const originalContext: PeerContext = new Map()
    originalContext.index = 1

    const spec1 = Spec.parse('foo', '^1.0.0', configData)
    const spec2 = Spec.parse('bar', '^2.0.0', configData)

    // Add entry to original
    addEntriesToPeerContext(originalContext, [
      { spec: spec1, type: 'peer' },
    ])

    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    const dependent = graph.placePackage(
      graph.mainImporter,
      'prod',
      spec2,
      { name: 'bar', version: '2.0.0' },
    )!

    const forkedContext = forkPeerContext(originalContext, [
      { spec: spec2, type: 'peer', dependent },
    ])

    t.not(
      forkedContext.index,
      originalContext.index,
      'should have new index',
    )
    t.ok(
      forkedContext.index !== undefined &&
        typeof forkedContext.index === 'number',
      'should have a numeric index',
    )
    t.equal(forkedContext.size, 2, 'should have both entries')
    t.ok(forkedContext.has('foo'), 'should have foo from original')
    t.ok(forkedContext.has('bar'), 'should have new bar entry')

    const barEntry = forkedContext.get('bar')
    t.equal(
      barEntry?.contextDependents.size,
      1,
      'should have dependent',
    )
    t.ok(
      barEntry?.contextDependents.has(dependent),
      'should include dependent',
    )
  })

  t.test(
    'creates forked context with new entries and no dependent',
    async t => {
      const originalContext: PeerContext = new Map()
      originalContext.index = 1

      const spec1 = Spec.parse('foo', '^1.0.0', configData)
      const spec2 = Spec.parse('bar', '^2.0.0', configData)

      // Add entry to original
      addEntriesToPeerContext(originalContext, [
        { spec: spec1, type: 'peer' },
      ])

      // No dependent this time
      const forkedContext = forkPeerContext(originalContext, [
        { spec: spec2, type: 'peer' },
      ])

      t.ok(
        forkedContext.index !== undefined &&
          typeof forkedContext.index === 'number',
        'should have a numeric index',
      )
      t.equal(forkedContext.size, 2, 'should have both entries')
      t.ok(forkedContext.has('foo'), 'should have foo from original')
      t.ok(forkedContext.has('bar'), 'should have new bar entry')

      const barEntry = forkedContext.get('bar')
      t.equal(
        barEntry?.contextDependents.size,
        0,
        'should have no dependents (none provided)',
      )
    },
  )
})

t.test('startPeerPlacement', async t => {
  t.test('returns empty data when no peerDependencies', async t => {
    const peerContext: PeerContext = new Map()
    const manifest: Manifest = {
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

    const result = startPeerPlacement(
      peerContext,
      manifest,
      graph.mainImporter,
      configData,
    )

    t.equal(
      result.peerSetHash,
      undefined,
      'should have no peer set ref',
    )
    t.equal(
      result.queuedEntries.length,
      0,
      'should have no queued entries',
    )
  })

  t.test('collects sibling dependencies', async t => {
    const peerContext: PeerContext = new Map()
    peerContext.index = 1

    // manifest that is going to be placed
    const manifest: Manifest = {
      name: 'foo',
      version: '1.0.0',
      peerDependencies: {
        bar: '^1.0.0',
      },
    }
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        baz: '^2.0.0',
      },
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('baz', '^2.0.0', configData),
      { name: 'baz', version: '2.0.0' },
    )!

    const result = startPeerPlacement(
      peerContext,
      manifest,
      graph.mainImporter,
      configData,
    )

    t.equal(result.queuedEntries.length, 1, 'should have peer data')
    t.equal(
      result.peerSetHash,
      'ṗ:2e91a2df6ab60f21ad045748988dd5dc19e1e565d267a0d7c006928754484e94',
      'should have peer set hash',
    )
    t.ok(result.queuedEntries.length > 0, 'should have entries')
  })
})

t.test('endPeerPlacement', async t => {
  t.test('resolves peer dependencies from context', async t => {
    const peerContext: PeerContext = new Map()
    peerContext.index = 1

    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const peerSpec = Spec.parse('peer-pkg', '^1.0.0', configData)
    const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)

    // Create peer target in context, at first it appears as a regular dependency
    const peerTarget = graph.placePackage(
      graph.mainImporter,
      'prod',
      peerSpec,
      { name: 'peer-pkg', version: '1.0.0' },
    )!

    addEntriesToPeerContext(peerContext, [
      { spec: peerSpec, target: peerTarget, type: 'prod' },
    ])

    // Create node that has peer dependency
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      nodeSpec,
      {
        name: 'my-pkg',
        version: '1.0.0',
      },
    )!

    // as part of next deps we have peer-pkg as a peer dep
    const nextDeps: any[] = []
    const nextPeerDeps = new Map([
      ['peer-pkg', { spec: peerSpec, type: 'peer' as const }],
    ])
    const queuedEntries: PeerContextEntryInput[] = [
      { spec: peerSpec, target: peerTarget, type: 'prod' },
    ]

    const end = endPeerPlacement(
      peerContext,
      nextDeps,
      nextPeerDeps,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      queuedEntries,
    )
    const resultContext = end()

    t.equal(
      nextDeps.length,
      0,
      'peer should be resolved, not in nextDeps',
    )
    t.ok(resultContext, 'should return context')

    // Check edge was created
    const edge = node.edgesOut.get('peer-pkg')
    t.ok(edge, 'should have edge to peer')
    t.equal(edge?.to?.id, peerTarget.id, 'should link to peer target')
  })

  t.test('handles unresolved peerOptional', async t => {
    const peerContext: PeerContext = new Map()
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const peerSpec = Spec.parse('peer-pkg', '^1.0.0', configData)
    const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)

    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      nodeSpec,
      {
        name: 'my-pkg',
        version: '1.0.0',
      },
    )!

    const nextDeps: any[] = []
    const nextPeerDeps = new Map([
      ['peer-pkg', { spec: peerSpec, type: 'peerOptional' as const }],
    ])
    const queuedEntries: PeerContextEntryInput[] = [
      { spec: nodeSpec, target: node, type: 'prod' },
    ]

    const end = endPeerPlacement(
      peerContext,
      nextDeps,
      nextPeerDeps,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      queuedEntries,
    )
    end()

    t.equal(
      nextDeps.length,
      0,
      'peerOptional should not be in nextDeps',
    )

    // Check dangling edge was created
    const edge = node.edgesOut.get('peer-pkg')
    t.ok(edge, 'should have edge')
    t.equal(edge?.type, 'peerOptional', 'should be peerOptional')
    t.notOk(edge?.to, 'should be dangling (no target)')
  })

  t.test('moves unresolved peer to nextDeps', async t => {
    const peerContext: PeerContext = new Map()
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const peerSpec = Spec.parse('peer-pkg', '^1.0.0', configData)
    const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)

    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      nodeSpec,
      {
        name: 'my-pkg',
        version: '1.0.0',
      },
    )!

    const nextDeps: any[] = []
    const nextPeerDeps = new Map([
      ['peer-pkg', { spec: peerSpec, type: 'peer' as const }],
    ])
    const queuedEntries: PeerContextEntryInput[] = [
      { spec: nodeSpec, target: node, type: 'prod' },
    ]

    const end = endPeerPlacement(
      peerContext,
      nextDeps,
      nextPeerDeps,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      queuedEntries,
    )
    const _resultContext = end()

    t.equal(
      nextDeps.length,
      1,
      'unresolved peer should be in nextDeps',
    )
    t.equal(nextDeps[0].spec, peerSpec, 'should have correct spec')
  })

  t.test('forks context when needed', async t => {
    const peerContext: PeerContext = new Map()
    peerContext.index = nextPeerContextIndex()
    const originalIndex = peerContext.index

    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      nodeSpec,
      {
        name: 'my-pkg',
        version: '1.0.0',
      },
    )!

    const nextDeps: any[] = []
    const nextPeerDeps = new Map()

    // add a conflicting spec that will cause a fork
    const conflictingSpec = Spec.parse('my-pkg', '^2.0.0', configData)
    const queuedEntries: PeerContextEntryInput[] = [
      { spec: conflictingSpec, target: node, type: 'prod' },
    ]

    const end = endPeerPlacement(
      peerContext,
      nextDeps,
      nextPeerDeps,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      queuedEntries,
    )
    const resultContext = end()

    t.notSame(
      resultContext.index,
      originalIndex,
      'should create new context with different index',
    )
    t.ok(
      resultContext.index !== undefined &&
        typeof resultContext.index === 'number',
      'should have a numeric index',
    )
  })
})

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

// --- INTEGRATION TESTS
// Mock package info that resolves real npm packages
const createMockPackageInfo = (): PackageInfoClient => {
  const mockManifests: Record<string, any> = {
    'react@18.3.1': {
      name: 'react',
      version: '18.3.1',
      dependencies: {
        'loose-envify': '^1.1.0',
      },
    },
    'react@19.2.0': {
      name: 'react',
      version: '19.2.0',
    },
    '@isaacs/peer-dep-cycle-a@1.0.0': {
      name: '@isaacs/peer-dep-cycle-a',
      version: '1.0.0',
      peerDependencies: {
        '@isaacs/peer-dep-cycle-b': '^1.0.0',
      },
    },
    '@isaacs/peer-dep-cycle-a@2.0.0': {
      name: '@isaacs/peer-dep-cycle-a',
      version: '2.0.0',
      peerDependencies: {
        '@isaacs/peer-dep-cycle-b': '^2.0.0',
      },
    },
    '@isaacs/peer-dep-cycle-b@1.0.0': {
      name: '@isaacs/peer-dep-cycle-b',
      version: '1.0.0',
      peerDependencies: {
        '@isaacs/peer-dep-cycle-c': '^1.0.0',
      },
    },
    '@isaacs/peer-dep-cycle-b@2.0.0': {
      name: '@isaacs/peer-dep-cycle-b',
      version: '2.0.0',
      peerDependencies: {
        '@isaacs/peer-dep-cycle-c': '^2.0.0',
      },
    },
    '@isaacs/peer-dep-cycle-c@1.0.0': {
      name: '@isaacs/peer-dep-cycle-c',
      version: '1.0.0',
      peerDependencies: {
        '@isaacs/peer-dep-cycle-a': '^1.0.0',
      },
    },
    '@isaacs/peer-dep-cycle-c@2.0.0': {
      name: '@isaacs/peer-dep-cycle-c',
      version: '2.0.0',
      peerDependencies: {
        '@isaacs/peer-dep-cycle-a': '^2.0.0',
      },
    },
    '@ruyadorno/package-with-flexible-peer-deps@1.1.0': {
      name: '@ruyadorno/package-with-flexible-peer-deps',
      version: '1.1.0',
      peerDependencies: {
        '@isaacs/peer-dep-cycle-a': '1 || 2',
        '@isaacs/peer-dep-cycle-c': '1 || 2',
        react: '18 || 19',
      },
    },
    '@ruyadorno/package-peer-parent-1@1.0.0': {
      name: '@ruyadorno/package-peer-parent-1',
      version: '1.0.0',
      dependencies: {
        '@isaacs/peer-dep-cycle-a': '^1.0.0',
        '@ruyadorno/package-with-flexible-peer-deps': '^1.1.0',
        react: '^18.0.0',
      },
    },
    '@ruyadorno/package-peer-parent-2@1.0.0': {
      name: '@ruyadorno/package-peer-parent-2',
      version: '1.0.0',
      dependencies: {
        '@isaacs/peer-dep-cycle-a': '^2.0.0',
        '@ruyadorno/package-with-flexible-peer-deps': '^1.1.0',
        react: '^19.1.0',
      },
    },
    'loose-envify@1.4.0': {
      name: 'loose-envify',
      version: '1.4.0',
      dependencies: {
        'js-tokens': '^3.0.0 || ^4.0.0',
      },
    },
    'js-tokens@4.0.0': {
      name: 'js-tokens',
      version: '4.0.0',
    },
  }

  return {
    async manifest(spec: Spec) {
      // Simple version resolver - match ranges to available versions
      const bareSpec = spec.bareSpec

      // Helper to find matching version in mockManifests
      const findVersion = (
        name: string,
        range: string,
      ): string | null => {
        // For wildcards, pick the highest version
        if (range === '*' || range === '' || range === 'latest') {
          const defaults: Record<string, string> = {
            react: '19.2.0',
            '@isaacs/peer-dep-cycle-a': '2.0.0',
            '@isaacs/peer-dep-cycle-b': '2.0.0',
            '@isaacs/peer-dep-cycle-c': '2.0.0',
            '@ruyadorno/package-with-flexible-peer-deps': '1.1.0',
            '@ruyadorno/package-peer-parent-1': '1.0.0',
            '@ruyadorno/package-peer-parent-2': '1.0.0',
            'loose-envify': '1.4.0',
            'js-tokens': '4.0.0',
          }
          return defaults[name] || null
        }

        // Handle OR ranges (e.g., "^3.0.0 || ^4.0.0" or "1 || 2" or "18 || 19")
        if (range.includes('||')) {
          const parts = range.split('||').map(r => r.trim())
          // Try each part, prefer the highest available
          for (const part of parts.reverse()) {
            const version = findVersion(name, part)
            if (version) return version
          }
          return null
        }

        // Strip range operators
        const cleanRange = range.replace(/^[\^~]/, '').trim()

        // For specific versions, match exact or compatible
        const majorMatch = /^(\d+)/.exec(cleanRange)
        if (majorMatch) {
          const major = majorMatch[1]
          // Try to find matching major version
          const candidates = Object.keys(mockManifests)
            .filter(k => k.startsWith(`${name}@${major}`))
            .sort()
            .reverse()
          if (candidates.length > 0) {
            const candidate = candidates[0]
            if (candidate) {
              const parts = candidate.split('@')
              const version = parts[parts.length - 1]
              return version ?? null
            }
          }
        }

        // Try exact match
        if (mockManifests[`${name}@${cleanRange}`]) {
          return cleanRange
        }

        return null
      }

      const version = findVersion(spec.name, bareSpec)
      if (!version) return null

      const key = `${spec.name}@${version}`
      return mockManifests[key] || null
    },
    async extract() {},
  } as unknown as PackageInfoClient
}

t.test('install packages with peer dependencies', async t => {
  const mainManifest = {
    name: 'test-peer-install',
    version: '1.0.0',
    dependencies: {
      '@ruyadorno/package-peer-parent-1': '^1.0.0',
      '@ruyadorno/package-peer-parent-2': '^1.0.0',
    },
  }
  const dir = t.testdir({
    'package.json': JSON.stringify(mainManifest),
  })

  const scurry = new PathScurry(dir)
  const projectRoot = dir
  const packageJson = new PackageJson()
  const packageInfo = createMockPackageInfo()
  const options = {
    projectRoot,
    scurry,
    mainManifest,
    loadManifests: true,
    packageJson,
  }

  const actual = actualLoad({
    projectRoot,
    scurry,
    mainManifest,
    loadManifests: true,
    packageJson,
  })

  const rootDepID = joinDepIDTuple(['file', '.'])
  const addMap = new Map([
    [
      rootDepID,
      new Map<string, Dependency>([
        [
          '@ruyadorno/package-peer-parent-1',
          asDependency({
            spec: Spec.parse(
              '@ruyadorno/package-peer-parent-1',
              '^1.0.0',
            ),
            type: 'prod',
          }),
        ],
        [
          '@ruyadorno/package-peer-parent-2',
          asDependency({
            spec: Spec.parse(
              '@ruyadorno/package-peer-parent-2',
              '^1.0.0',
            ),
            type: 'prod',
          }),
        ],
      ]),
    ],
  ]) as AddImportersDependenciesMap

  const graph = await build({
    ...options,
    actual,
    packageInfo,
    remover: new RollbackRemove(),
    add: addMap,
  })

  t.matchSnapshot(
    mermaidOutput({
      edges: [...graph.edges],
      importers: graph.importers,
      nodes: [...graph.nodes.values()],
    }),
    'should build a peer dependency aware graph',
  )
})
