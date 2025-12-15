import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import {
  addEntriesToPeerContext,
  endPeerPlacement,
  forkPeerContext,
  getOrderedPeerContextEntries,
  postPlacementPeerCheck,
  retrievePeerContextHash,
  startPeerPlacement,
} from '../../src/ideal/peers.ts'
import { nextPeerContextIndex } from '../../src/ideal/refresh-ideal-graph.ts'
import type {
  PeerContext,
  PeerContextEntryInput,
} from '../../src/ideal/types.ts'
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

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('retrievePeerContextHash', async t => {
  t.test('returns undefined for undefined context', async t => {
    t.equal(
      retrievePeerContextHash(undefined),
      undefined,
      'should return undefined',
    )
  })

  t.test('returns peer context hash string', async t => {
    const peerContext: PeerContext = new Map()
    peerContext.index = 5
    t.equal(
      retrievePeerContextHash(peerContext),
      'ṗ:5',
      'should return formatted reference',
    )
  })

  t.test('returns undefined if no index', async t => {
    const peerContext: PeerContext = new Map()
    t.equal(
      retrievePeerContextHash(peerContext),
      undefined,
      'should return undefined when index not set',
    )
  })
})

t.test('incompatibleSpecs', async t => {
  t.test(
    'returns false for non-registry specs with same bareSpec',
    async t => {
      const peerContext: PeerContext = new Map()
      const spec1 = Spec.parse(
        '@user/repo',
        'github:user/repo#v1.0.0',
        configData,
      )
      const spec2 = Spec.parse(
        '@user/repo',
        'github:user/repo#v1.0.1',
        configData,
      )
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      // Add first git spec
      addEntriesToPeerContext(
        peerContext,
        [{ spec: spec1, type: 'peer' }],
        graph.mainImporter,
      )

      // Add second git spec with same base but different ref
      // This should trigger the bareSpec comparison branch
      const needsFork = addEntriesToPeerContext(
        peerContext,
        [{ spec: spec2, type: 'peer' }],
        graph.mainImporter,
      )

      t.equal(
        needsFork,
        true,
        'should need fork when git specs have different refs',
      )
    },
  )
})

t.test('getOrderedPeerContextEntries', async t => {
  t.test('sorts non-peer deps before peer deps', async t => {
    const entries: PeerContextEntryInput[] = [
      { spec: Spec.parse('z-peer', '1', configData), type: 'peer' },
      { spec: Spec.parse('a-prod', '1', configData), type: 'prod' },
      {
        spec: Spec.parse('m-peer', '1', configData),
        type: 'peerOptional',
      },
      { spec: Spec.parse('b-dev', '1', configData), type: 'dev' },
    ]
    const sorted = getOrderedPeerContextEntries(entries)
    t.same(
      sorted.map(e => e.spec.name),
      ['a-prod', 'b-dev', 'm-peer', 'z-peer'],
    )
  })

  t.test('sorts alphabetically within same type', async t => {
    const entries: PeerContextEntryInput[] = [
      { spec: Spec.parse('zebra', '1', configData), type: 'prod' },
      { spec: Spec.parse('apple', '1', configData), type: 'prod' },
      { spec: Spec.parse('mango', '1', configData), type: 'prod' },
    ]
    const sorted = getOrderedPeerContextEntries(entries)
    t.same(
      sorted.map(e => e.spec.name),
      ['apple', 'mango', 'zebra'],
    )
  })

  t.test('uses target.name when available', async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    const node1 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('alpha', '^1.0.0', configData),
      { name: 'alpha', version: '1.0.0' },
    )!
    const node2 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('beta', '^1.0.0', configData),
      { name: 'beta', version: '1.0.0' },
    )!

    const entries: PeerContextEntryInput[] = [
      {
        spec: Spec.parse('zzz', '1', configData),
        type: 'prod',
        target: node2,
      },
      {
        spec: Spec.parse('aaa', '1', configData),
        type: 'prod',
        target: node1,
      },
    ]
    const sorted = getOrderedPeerContextEntries(entries)
    // Should sort by target.name (alpha, beta), not spec.name
    t.same(
      sorted.map(e => e.target?.name),
      ['alpha', 'beta'],
    )
  })

  t.test('handles empty array', async t => {
    const entries: PeerContextEntryInput[] = []
    const sorted = getOrderedPeerContextEntries(entries)
    t.same(sorted, [])
  })

  t.test('does not mutate original array', async t => {
    const entries: PeerContextEntryInput[] = [
      { spec: Spec.parse('zebra', '1', configData), type: 'prod' },
      { spec: Spec.parse('apple', '1', configData), type: 'prod' },
    ]
    const original = [...entries]
    getOrderedPeerContextEntries(entries)
    t.same(
      entries.map(e => e.spec.name),
      original.map(e => e.spec.name),
      'original array should not be mutated',
    )
  })
})

t.test('addEntriesToPeerContext', async t => {
  t.test('adds new entry to empty context', async t => {
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

    const needsFork = addEntriesToPeerContext(
      peerContext,
      [{ spec, type: 'peer' }],
      graph.mainImporter,
    )

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
    addEntriesToPeerContext(
      peerContext,
      [{ spec, type: 'peer' }],
      graph.mainImporter,
    )

    // Then add with dependent
    const needsFork = addEntriesToPeerContext(
      peerContext,
      [{ spec, type: 'peer', dependent: node }],
      graph.mainImporter,
    )

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
      addEntriesToPeerContext(
        peerContext,
        [{ spec: spec1, type: 'peer' }],
        graph.mainImporter,
      )

      // Add target with conflicting version
      const target = graph.placePackage(
        graph.mainImporter,
        'prod',
        spec2,
        { name: 'foo', version: '2.0.0' },
      )!

      const needsFork = addEntriesToPeerContext(
        peerContext,
        [{ spec: spec2, target, type: 'peer' }],
        graph.mainImporter,
      )

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
    addEntriesToPeerContext(
      peerContext,
      [{ spec: spec1, type: 'peer' }],
      graph.mainImporter,
    )

    // Add conflicting spec
    const needsFork = addEntriesToPeerContext(
      peerContext,
      [{ spec: spec2, type: 'peer' }],
      graph.mainImporter,
    )

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
    addEntriesToPeerContext(
      peerContext,
      [{ spec, target: target1, type: 'peer', dependent }],
      dependent,
    )

    // Create new target
    const target2 = graph.placePackage(
      graph.mainImporter,
      'prod',
      spec,
      { name: 'foo', version: '1.0.1' },
    )!

    // Add new target - should update edges
    const needsFork = addEntriesToPeerContext(
      peerContext,
      [{ spec, target: target2, type: 'peer' }],
      dependent,
    )

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
      const bar = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('bar', '^1.0.0', configData),
        { name: 'bar', version: '1.0.0' },
      )!

      // Add entry with no target
      let needsFork = addEntriesToPeerContext(
        peerContext,
        [{ spec, type: 'peer' }],
        bar,
      )

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

      needsFork = addEntriesToPeerContext(
        peerContext,
        [{ spec, type: 'peer', target }],
        bar,
      )

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
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const needsFork = addEntriesToPeerContext(
      peerContext,
      [{ spec, type: 'peer' }],
      graph.mainImporter,
    )

    t.equal(needsFork, false, 'should not need fork')
    t.ok(peerContext.size > 0, 'should add entry for git spec')
  })
})

t.test('forkPeerContext', async t => {
  t.test('creates forked context with new entries', async t => {
    const spec1 = Spec.parse('foo', '^1.0.0', configData)
    const spec2 = Spec.parse('bar', '^2.0.0', configData)

    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })
    const originalContext = graph.peerContexts[0]!

    // Add entry to original
    addEntriesToPeerContext(
      originalContext,
      [{ spec: spec1, type: 'peer' }],
      graph.mainImporter,
    )

    const dependent = graph.placePackage(
      graph.mainImporter,
      'prod',
      spec2,
      { name: 'bar', version: '2.0.0' },
    )!

    const forkedContext = forkPeerContext(graph, originalContext, [
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

      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      // Add entry to original
      addEntriesToPeerContext(
        originalContext,
        [{ spec: spec1, type: 'peer' }],
        graph.mainImporter,
      )

      // No dependent this time
      const forkedContext = forkPeerContext(graph, originalContext, [
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
    t.equal(result.peerSetHash, 'ṗ:1', 'should have peer set hash')
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

    addEntriesToPeerContext(
      peerContext,
      [{ spec: peerSpec, target: peerTarget, type: 'prod' }],
      graph.mainImporter,
    )

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
    end.putEntries()
    end.resolvePeerDeps()

    t.equal(
      nextDeps.length,
      0,
      'peer should be resolved, not in nextDeps',
    )

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
    end.putEntries()
    end.resolvePeerDeps()

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
    end.putEntries()
    end.resolvePeerDeps()

    t.equal(
      nextDeps.length,
      1,
      'unresolved peer should be in nextDeps',
    )
    t.equal(nextDeps[0].spec, peerSpec, 'should have correct spec')
  })

  t.test(
    'prioritizes sibling dependency target for peer resolution',
    async t => {
      // This tests the fix for the workspace peer dep resolution bug:
      // When a package has a peer dep (e.g., zod >= 3.0.0) and its parent
      // has a direct dep on the same package (e.g., zod@^3.25.76),
      // the peer should resolve to the sibling's version, not a version
      // from a different workspace or from the shared peer context elsewhere in the graph.
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

      // Simulate having a different version already in the graph
      // (like zod@4.1.x from another workspace)
      const otherWorkspaceVersion = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('peer-pkg', '^2.0.0', configData),
        { name: 'peer-pkg', version: '2.0.0' },
      )!

      // The sibling dependency has the correct version (like zod@3.25.76)
      const correctVersion = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('peer-pkg', '^1.0.0', configData),
        { name: 'peer-pkg', version: '1.0.0' },
      )!

      // The peer spec is loose (like zod >= 3.0.0) - satisfies both versions
      const loosePeerSpec = Spec.parse(
        'peer-pkg',
        '>=1.0.0',
        configData,
      )
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
        ['peer-pkg', { spec: loosePeerSpec, type: 'peer' as const }],
      ])

      // queuedEntries includes the sibling dep with the correct target
      // This simulates what startPeerPlacement collects from fromNode.edgesOut
      const siblingSpec = Spec.parse('peer-pkg', '^1.0.0', configData)
      const queuedEntries: PeerContextEntryInput[] = [
        { spec: nodeSpec, target: node, type: 'prod' },
        { spec: siblingSpec, target: correctVersion, type: 'prod' },
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
      end.putEntries()
      end.resolvePeerDeps()

      // The peer should be resolved directly, not pushed to nextDeps
      t.equal(
        nextDeps.length,
        0,
        'peer should be resolved from sibling, not in nextDeps',
      )

      // Check that the edge was created to the correct version
      const edge = node.edgesOut.get('peer-pkg')
      t.ok(edge, 'should have edge to peer-pkg')
      t.equal(
        edge?.to?.id,
        correctVersion.id,
        'should link to sibling target (correct version), not wrong version',
      )
      t.not(
        edge?.to?.id,
        otherWorkspaceVersion.id,
        'should NOT link to the wrong version',
      )
    },
  )

  t.test(
    'uses sibling spec when falling back to nextDeps',
    async t => {
      // When there's no resolved sibling target but the sibling has a more
      // specific spec, use that spec for resolution
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

      // Loose peer spec
      const loosePeerSpec = Spec.parse(
        'peer-pkg',
        '>=1.0.0',
        configData,
      )
      // More specific sibling spec
      const specificSiblingSpec = Spec.parse(
        'peer-pkg',
        '^1.5.0',
        configData,
      )
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
        ['peer-pkg', { spec: loosePeerSpec, type: 'peer' as const }],
      ])

      // Sibling entry without a resolved target, but with a specific spec
      const queuedEntries: PeerContextEntryInput[] = [
        { spec: nodeSpec, target: node, type: 'prod' },
        { spec: specificSiblingSpec, type: 'prod' }, // no target yet
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
      end.putEntries()
      end.resolvePeerDeps()

      // Should fall back to nextDeps but with the sibling's more specific spec
      t.equal(nextDeps.length, 1, 'peer should be in nextDeps')
      t.equal(
        nextDeps[0].spec.bareSpec,
        specificSiblingSpec.bareSpec,
        'should use sibling spec (^1.5.0) instead of loose peer spec (>=1.0.0)',
      )
      t.not(
        nextDeps[0].spec.bareSpec,
        loosePeerSpec.bareSpec,
        'should NOT use the loose peer spec',
      )
    },
  )

  t.test(
    'sibling takes priority over peer context entry from another workspace',
    async t => {
      // This tests the main bug scenario: when peer context already has an
      // entry with a target from another workspace (e.g., zod@4.x from docs),
      // but the current workspace has a direct dep on a different version
      // (e.g., zod@3.x in registry), the sibling should take priority.
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      // Simulate zod@4.x from another workspace (like docs)
      const otherWorkspaceVersion = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('zod', '^4.0.0', configData),
        { name: 'zod', version: '4.1.11' },
      )!

      // Simulate zod@3.x from current workspace (like registry)
      const currentWorkspaceVersion = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('zod', '^3.25.0', configData),
        { name: 'zod', version: '3.25.76' },
      )!

      // Set up peer context with the WRONG version (as if from docs workspace)
      const peerContext: PeerContext = new Map()
      peerContext.set('zod', {
        active: true,
        specs: new Set([Spec.parse('zod', '>=4.0.0', configData)]),
        target: otherWorkspaceVersion, // This is what would happen from docs workspace
        type: 'prod',
        contextDependents: new Set(),
      })

      // Loose peer spec (like @hono/zod-openapi's "zod >= 3.0.0")
      const loosePeerSpec = Spec.parse('zod', '>=3.0.0', configData)
      const nodeSpec = Spec.parse(
        '@hono/zod-openapi',
        '^0.19.0',
        configData,
      )

      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        nodeSpec,
        {
          name: '@hono/zod-openapi',
          version: '0.19.10',
        },
      )!

      const nextDeps: any[] = []
      const nextPeerDeps = new Map([
        ['zod', { spec: loosePeerSpec, type: 'peer' as const }],
      ])

      // queuedEntries has the sibling with the CORRECT version
      // This is what registry workspace's direct dep on zod@^3.25.76 produces
      const siblingSpec = Spec.parse('zod', '^3.25.0', configData)
      const queuedEntries: PeerContextEntryInput[] = [
        { spec: nodeSpec, target: node, type: 'prod' },
        {
          spec: siblingSpec,
          target: currentWorkspaceVersion,
          type: 'prod',
        },
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
      end.putEntries()
      end.resolvePeerDeps()

      // The peer should be resolved directly using the sibling's target
      t.equal(
        nextDeps.length,
        0,
        'peer should be resolved from sibling, not in nextDeps',
      )

      // Check that the edge was created to the CORRECT version (zod@3.x),
      // NOT the version from the peer context (zod@4.x)
      const edge = node.edgesOut.get('zod')
      t.ok(edge, 'should have edge to zod')
      t.equal(
        edge?.to?.id,
        currentWorkspaceVersion.id,
        'should link to sibling target (zod@3.25.76), not peer context target',
      )
      t.not(
        edge?.to?.id,
        otherWorkspaceVersion.id,
        'should NOT link to peer context target (zod@4.1.11)',
      )
    },
  )
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

t.test('postPlacementPeerCheck', async t => {
  t.test(
    'reuses forked peer context between compatible siblings',
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

      // Create three sibling nodes that will be processed together
      const node1 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('pkg-a', '^1.0.0', configData),
        { name: 'pkg-a', version: '1.0.0' },
      )!

      const node2 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('pkg-b', '^1.0.0', configData),
        { name: 'pkg-b', version: '1.0.0' },
      )!

      const node3 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('pkg-c', '^1.0.0', configData),
        { name: 'pkg-c', version: '1.0.0' },
      )!

      // All three packages have the same peer dependency
      const peerSpec = Spec.parse('react', '^18.0.0', configData)

      // Create initial peer contexts with an incompatible peer already in them
      // This will force forking
      const incompatibleSpec = Spec.parse(
        'react',
        '^17.0.0',
        configData,
      )

      const peerContext1: PeerContext = new Map()
      addEntriesToPeerContext(
        peerContext1,
        [{ spec: incompatibleSpec, type: 'peer' }],
        graph.mainImporter,
      )

      const peerContext2: PeerContext = new Map()
      addEntriesToPeerContext(
        peerContext2,
        [{ spec: incompatibleSpec, type: 'peer' }],
        graph.mainImporter,
      )

      const peerContext3: PeerContext = new Map()
      addEntriesToPeerContext(
        peerContext3,
        [{ spec: incompatibleSpec, type: 'peer' }],
        graph.mainImporter,
      )

      // Track how many times resolvePeerDeps is called
      let resolveCallCount = 0

      // Build the sorted level results with sibling entries that need forking
      // but have compatible peer requirements (same peerSpec)
      const entry1 = {
        node: node1,
        deps: [],
        peerContext: peerContext1,
        updateContext: {
          putEntries: () => [
            {
              dependent: node1,
              spec: peerSpec,
              type: 'peer' as const,
            },
          ],
          resolvePeerDeps: () => {
            resolveCallCount++
          },
        },
      }
      const entry2 = {
        node: node2,
        deps: [],
        peerContext: peerContext2,
        updateContext: {
          putEntries: () => [
            {
              dependent: node2,
              spec: peerSpec, // Same peer spec = compatible
              type: 'peer' as const,
            },
          ],
          resolvePeerDeps: () => {
            resolveCallCount++
          },
        },
      }
      const entry3 = {
        node: node3,
        deps: [],
        peerContext: peerContext3,
        updateContext: {
          putEntries: () => [
            {
              dependent: node3,
              spec: peerSpec, // Same peer spec = compatible
              type: 'peer' as const,
            },
          ],
          resolvePeerDeps: () => {
            resolveCallCount++
          },
        },
      }

      const sortedLevelResults = [[entry1, entry2, entry3]]

      // Call postPlacementPeerCheck
      postPlacementPeerCheck(graph, sortedLevelResults)

      // Verify that:
      // 1. First entry gets a new forked context
      t.ok(
        entry1.peerContext.index !== undefined,
        'first node should have forked peer context',
      )

      // 2. Second and third entries reuse the first one's forked context
      t.equal(
        entry2.peerContext,
        entry1.peerContext,
        'second node should reuse first node peer context',
      )
      t.equal(
        entry3.peerContext,
        entry1.peerContext,
        'third node should reuse first node peer context',
      )

      // 3. All three share the same context index
      t.equal(
        entry1.peerContext.index,
        entry2.peerContext.index,
        'all nodes share same context index',
      )
      t.equal(
        entry1.peerContext.index,
        entry3.peerContext.index,
        'all nodes share same context index',
      )

      // 4. The shared context has the react peer entry
      t.equal(
        entry1.peerContext.size,
        1,
        'context should have react entry',
      )
      const reactEntry = entry1.peerContext.get('react')
      t.ok(reactEntry, 'should have react peer entry')
      t.ok(
        reactEntry && reactEntry.specs.size > 0,
        'react entry should have specs',
      )

      // 5. resolvePeerDeps was called for all three nodes
      t.equal(
        resolveCallCount,
        3,
        'resolvePeerDeps should be called for all nodes',
      )
    },
  )

  t.test(
    'forks separate contexts when siblings are incompatible',
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

      // Create two sibling nodes
      const node1 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('pkg-a', '^1.0.0', configData),
        { name: 'pkg-a', version: '1.0.0' },
      )!

      const node2 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('pkg-b', '^1.0.0', configData),
        { name: 'pkg-b', version: '1.0.0' },
      )!

      // These have DIFFERENT peer dependencies (incompatible)
      const peerSpec1 = Spec.parse('react', '^18.0.0', configData)
      const peerSpec2 = Spec.parse('react', '^19.0.0', configData)

      const peerContext1: PeerContext = new Map()
      const peerContext2: PeerContext = new Map()

      const entry1 = {
        node: node1,
        deps: [],
        peerContext: peerContext1,
        updateContext: {
          putEntries: () => [
            {
              dependent: node1,
              spec: peerSpec1,
              type: 'peer' as const,
            },
          ],
          resolvePeerDeps: () => {},
        },
      }
      const entry2 = {
        node: node2,
        deps: [],
        peerContext: peerContext2,
        updateContext: {
          putEntries: () => [
            {
              dependent: node2,
              spec: peerSpec2, // Different spec = incompatible
              type: 'peer' as const,
            },
          ],
          resolvePeerDeps: () => {},
        },
      }

      const sortedLevelResults = [[entry1, entry2]]

      postPlacementPeerCheck(graph, sortedLevelResults)

      // Both nodes should have forked contexts, but they should be different
      t.ok(
        entry1.peerContext.index !== undefined,
        'first node should have forked context',
      )
      t.ok(
        entry2.peerContext.index !== undefined,
        'second node should have forked context',
      )
      t.not(
        entry1.peerContext,
        entry2.peerContext,
        'contexts should be different for incompatible siblings',
      )
      t.not(
        entry1.peerContext.index,
        entry2.peerContext.index,
        'context indices should be different',
      )
    },
  )
})

t.test('integration tests', async t => {
  // Mock package info that resolves real npm packages
  const createMockPackageInfo = (): PackageInfoClient => {
    const mockManifests: Record<string, any> = {
      'react@17.0.2': {
        name: 'react',
        version: '17.0.2',
        dependencies: {
          'loose-envify': '^1.1.0',
        },
      },
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
      '@ruyadorno/package-peer-parent-3@1.0.0': {
        name: '@ruyadorno/package-peer-parent-3',
        version: '1.0.0',
        dependencies: {
          '@isaacs/peer-dep-cycle-a': '1',
          '@ruyadorno/package-with-flexible-peer-deps': '^1.1.0',
          react: '18',
        },
      },
      '@ruyadorno/package-peer-parent-4@1.0.0': {
        name: '@ruyadorno/package-peer-parent-4',
        version: '1.0.0',
        dependencies: {
          '@isaacs/peer-dep-cycle-a': '1',
          '@ruyadorno/package-with-flexible-peer-deps': '^1.1.0',
          react: '18 || 19',
        },
      },
      'c@1.0.0': {
        name: 'c',
        version: '1.0.0',
        dependencies: {
          react: '^17.0.2',
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
      async extract(): Promise<{
        integrity: string
        resolved: string
      }> {
        return {
          integrity:
            'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==',
          resolved: 'https://example.com/remote-pkg-1.0.0.tgz',
        }
      },
    } as unknown as PackageInfoClient
  }

  await t.test('install packages with peer dependencies', async t => {
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

  await t.test(
    'install multiple conflict peer dependencies versions at the same level',
    async t => {
      const mainManifest = {
        name: 'test-peer-install-conflicts',
        version: '1.0.0',
        dependencies: {
          '@ruyadorno/package-peer-parent-1': '^1.0.0',
          '@ruyadorno/package-peer-parent-2': '^1.0.0',
          c: '^1.0.0',
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
            [
              'c',
              asDependency({
                spec: Spec.parse('c', '^1.0.0'),
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
        'should build graph with multiple conflicting peer dependency contexts',
      )
    },
  )

  await t.test(
    'longer setup with mixed interdependencies',
    async t => {
      const mainManifest = {
        name: 'test-peer-install',
        version: '1.0.0',
        dependencies: {
          '@ruyadorno/package-peer-parent-1': '^1.0.0',
          '@ruyadorno/package-peer-parent-2': '^1.0.0',
          '@ruyadorno/package-peer-parent-3': '^1.0.0',
          '@ruyadorno/package-peer-parent-4': '^1.0.0',
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
        'should build a valid graph with complex peer interdependencies',
      )
    },
  )
})
