import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import {
  addEntriesToPeerContext,
  addSelfToPeerContext,
  endPeerPlacement,
  forkPeerContext,
  nextPeerContextIndex,
  retrievePeerContextRef,
  startPeerPlacement,
} from '../../src/ideal/peers.ts'
import type { PeerContext } from '../../src/ideal/peers.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('retrievePeerContextRef', async t => {
  t.test('returns undefined for undefined context', async t => {
    t.equal(
      retrievePeerContextRef(undefined),
      undefined,
      'should return undefined',
    )
  })

  t.test('returns peer context reference string', async t => {
    const peerContext: PeerContext = new Map()
    peerContext.index = 5
    t.equal(
      retrievePeerContextRef(peerContext),
      'peer:5',
      'should return formatted reference',
    )
  })

  t.test('returns undefined if no index', async t => {
    const peerContext: PeerContext = new Map()
    t.equal(
      retrievePeerContextRef(peerContext),
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
    const needsFork = addEntriesToPeerContext(
      peerContext,
      [{ spec, type: 'peer' }],
      node,
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
    const dependent = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('bar', '^1.0.0', configData),
      { name: 'bar', version: '1.0.0' },
    )!

    // Add first spec with dependent
    addEntriesToPeerContext(
      peerContext,
      [{ spec: spec1, type: 'peer' }],
      dependent,
    )

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
    addEntriesToPeerContext(
      peerContext,
      [{ spec, target: target1, type: 'peer' }],
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
      const dependent = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('bar', '^1.0.0', configData),
        { name: 'bar', version: '1.0.0' },
      )!

      // Add entry with no target
      let needsFork = addEntriesToPeerContext(
        peerContext,
        [{ spec, type: 'peer' }],
        dependent,
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
        dependent,
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

    const needsFork = addEntriesToPeerContext(peerContext, [
      { spec, type: 'peer' },
    ])

    t.equal(needsFork, false, 'should not need fork')
    t.ok(peerContext.size > 0, 'should add entry for git spec')
  })
})

t.test('addSelfToPeerContext', async t => {
  t.test('adds node as target to peer context', async t => {
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
      spec,
      {
        name: 'foo',
        version: '1.0.0',
      },
    )!

    const needsFork = addSelfToPeerContext(
      peerContext,
      spec,
      node,
      'prod',
    )

    t.equal(needsFork, false, 'should not need fork')
    const entry = peerContext.get('foo')
    t.equal(entry?.target?.id, node.id, 'should set node as target')
    t.equal(entry?.type, 'prod', 'should have correct type')
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
      { entries: [{ spec: spec2, type: 'peer' }], dependent },
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
        { entries: [{ spec: spec2, type: 'peer' }] },
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

    t.equal(result.peerData.length, 0, 'should have no peer data')
    t.equal(
      result.peerSetRef,
      undefined,
      'should have no peer set ref',
    )
    t.equal(
      result.needsToForkPeerContext,
      false,
      'should not need fork',
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
      Spec.parse('baz', '^1.0.0', configData),
      { name: 'baz', version: '1.0.0' },
    )!

    const result = startPeerPlacement(
      peerContext,
      manifest,
      graph.mainImporter,
      configData,
    )

    t.equal(result.peerData.length, 1, 'should have peer data')
    t.equal(result.peerSetRef, 'peer:1', 'should have peer set ref')
    t.ok(
      result.peerData[0]!.entries.length > 0,
      'should have entries',
    )
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

    const resultContext = endPeerPlacement(
      peerContext,
      [],
      nextDeps,
      nextPeerDeps,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      false,
    )

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

    endPeerPlacement(
      peerContext,
      [],
      nextDeps,
      nextPeerDeps,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      false,
    )

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

    endPeerPlacement(
      peerContext,
      [],
      nextDeps,
      nextPeerDeps,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      false,
    )

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

    const resultContext = endPeerPlacement(
      peerContext,
      [],
      nextDeps,
      nextPeerDeps,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      true, // needsToForkPeerContext
    )

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
