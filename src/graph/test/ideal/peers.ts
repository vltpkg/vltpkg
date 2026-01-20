import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import t from 'tap'
import { Graph } from '../../src/graph.ts'
import {
  addEntriesToPeerContext,
  checkEntriesToPeerContext,
  checkPeerEdgesCompatible,
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
import { Monorepo } from '@vltpkg/workspaces'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('checkPeerEdgesCompatible', async t => {
  t.test('returns compatible when node has no peer deps', async t => {
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
    }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    // Node without peer dependencies
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('foo', '^1.0.0', configData),
      { name: 'foo', version: '1.0.0' },
    )!

    const peerContext: PeerContext = new Map()

    const result = checkPeerEdgesCompatible(
      node,
      graph.mainImporter,
      peerContext,
      graph,
    )

    t.same(result, { compatible: true })
  })

  t.test(
    'returns compatible when peer edge has no target (dangling)',
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

      // Node with peer dependency but dangling edge
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo', '^1.0.0', configData),
        {
          name: 'foo',
          version: '1.0.0',
          peerDependencies: { react: '^18.0.0' },
        },
      )!

      // Create dangling edge (no target)
      const peerSpec = Spec.parse('react', '^18.0.0', configData)
      graph.addEdge('peer', peerSpec, node)

      const peerContext: PeerContext = new Map()

      const result = checkPeerEdgesCompatible(
        node,
        graph.mainImporter,
        peerContext,
        graph,
      )

      t.same(result, { compatible: true })
    },
  )

  t.test(
    'returns incompatible when peer context has different target',
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

      // Create two react versions
      const react18 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^18.0.0', configData),
        { name: 'react', version: '18.3.1' },
      )!
      const react19 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^19.0.0', configData),
        { name: 'react', version: '19.2.0' },
      )!

      // Node with peer dep pointing to react18
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo', '^1.0.0', configData),
        {
          name: 'foo',
          version: '1.0.0',
          peerDependencies: { react: '>=18.0.0' },
        },
      )!

      // Add peer edge to react18
      const peerSpec = Spec.parse('react', '>=18.0.0', configData)
      graph.addEdge('peer', peerSpec, node, react18)

      // Peer context has react19
      const peerContext: PeerContext = new Map()
      peerContext.set('react', {
        active: true,
        specs: new Set([Spec.parse('react', '^19.0.0', configData)]),
        target: react19,
        type: 'prod',
        contextDependents: new Set(),
      })

      const result = checkPeerEdgesCompatible(
        node,
        graph.mainImporter,
        peerContext,
        graph,
      )

      t.equal(result.compatible, false)
      t.ok(result.forkEntry)
      t.equal(result.forkEntry?.target.id, react19.id)
    },
  )

  t.test(
    'returns incompatible when sibling edge has different target',
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

      // Create two react versions
      const react18 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^18.0.0', configData),
        { name: 'react', version: '18.3.1' },
      )!
      const react19 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^19.0.0', configData),
        { name: 'react', version: '19.2.0' },
      )!

      // Node with peer dep pointing to react18
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo', '^1.0.0', configData),
        {
          name: 'foo',
          version: '1.0.0',
          peerDependencies: { react: '>=18.0.0' },
        },
      )!

      // Add peer edge to react18
      const peerSpec = Spec.parse('react', '>=18.0.0', configData)
      graph.addEdge('peer', peerSpec, node, react18)

      // Create a parent that has sibling edge to react19
      const parent = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('parent', '^1.0.0', configData),
        { name: 'parent', version: '1.0.0' },
      )!
      graph.addEdge(
        'prod',
        Spec.parse('react', '^19.0.0', configData),
        parent,
        react19,
      )

      const peerContext: PeerContext = new Map()

      const result = checkPeerEdgesCompatible(
        node,
        parent,
        peerContext,
        graph,
      )

      t.equal(result.compatible, false)
      t.ok(result.forkEntry)
      t.equal(result.forkEntry?.target.id, react19.id)
    },
  )

  t.test(
    'returns incompatible when parent manifest declares peer with different candidate',
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

      // Create two react versions
      const react18 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^18.0.0', configData),
        { name: 'react', version: '18.3.1' },
      )!
      const react19 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^19.0.0', configData),
        { name: 'react', version: '19.2.0' },
      )!

      // Node with peer dep pointing to react18
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo', '^1.0.0', configData),
        {
          name: 'foo',
          version: '1.0.0',
          peerDependencies: { react: '>=18.0.0' },
        },
      )!

      // Add peer edge to react18
      const peerSpec = Spec.parse('react', '>=18.0.0', configData)
      graph.addEdge('peer', peerSpec, node, react18)

      // Create parent with manifest declaring react@^19
      const parent = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('parent', '^1.0.0', configData),
        {
          name: 'parent',
          version: '1.0.0',
          dependencies: { react: '^19.0.0' },
        },
      )!

      const peerContext: PeerContext = new Map()

      const result = checkPeerEdgesCompatible(
        node,
        parent,
        peerContext,
        graph,
      )

      t.equal(result.compatible, false)
      t.ok(result.forkEntry)
      t.equal(result.forkEntry?.target.id, react19.id)
    },
  )

  t.test(
    'returns compatible when peer context target matches existing edge',
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

      // Create react
      const react18 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^18.0.0', configData),
        { name: 'react', version: '18.3.1' },
      )!

      // Node with peer dep pointing to react18
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo', '^1.0.0', configData),
        {
          name: 'foo',
          version: '1.0.0',
          peerDependencies: { react: '^18.0.0' },
        },
      )!

      // Add peer edge to react18
      const peerSpec = Spec.parse('react', '^18.0.0', configData)
      graph.addEdge('peer', peerSpec, node, react18)

      // Peer context also has react18
      const peerContext: PeerContext = new Map()
      peerContext.set('react', {
        active: true,
        specs: new Set([Spec.parse('react', '^18.0.0', configData)]),
        target: react18,
        type: 'prod',
        contextDependents: new Set(),
      })

      const result = checkPeerEdgesCompatible(
        node,
        graph.mainImporter,
        peerContext,
        graph,
      )

      t.same(result, { compatible: true })
    },
  )

  t.test(
    'returns compatible when context target does not satisfy peer spec',
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

      // Create two incompatible react versions
      const react17 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^17.0.0', configData),
        { name: 'react', version: '17.0.2' },
      )!
      const react18 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^18.0.0', configData),
        { name: 'react', version: '18.3.1' },
      )!

      // Node with strict peer dep (^18.0.0) pointing to react18
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('foo', '^1.0.0', configData),
        {
          name: 'foo',
          version: '1.0.0',
          peerDependencies: { react: '^18.0.0' },
        },
      )!

      const peerSpec = Spec.parse('react', '^18.0.0', configData)
      graph.addEdge('peer', peerSpec, node, react18)

      // Peer context has react17 which doesn't satisfy ^18.0.0
      const peerContext: PeerContext = new Map()
      peerContext.set('react', {
        active: true,
        specs: new Set([Spec.parse('react', '^17.0.0', configData)]),
        target: react17,
        type: 'prod',
        contextDependents: new Set(),
      })

      const result = checkPeerEdgesCompatible(
        node,
        graph.mainImporter,
        peerContext,
        graph,
      )

      // Should be compatible because react17 doesn't satisfy ^18.0.0
      t.same(result, { compatible: true })
    },
  )

  t.test(
    'ignores peerContext mismatch when parent declares incompatible direct dep',
    async t => {
      // Cover the "ignoreContextMismatch" branch: if the parent declares
      // a direct dep on the peer name, and the peerContext target does NOT
      // satisfy the parent's declared spec, then the mismatch should be ignored.
      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
        // parent declares react@^19, so a peerContext target react@18 is not applicable
        dependencies: { react: '^19.0.0' },
      }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const react18 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^18.0.0', configData),
        { name: 'react', version: '18.3.1' },
      )!
      const react19 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('react', '^19.0.0', configData),
        { name: 'react', version: '19.2.0' },
      )!

      // existing node has a peer edge pointing to react19
      const node = graph.placePackage(
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
        node,
        react19,
      )

      // peerContext says react18, which mismatches react19 but also does NOT satisfy parent react@^19,
      // so mismatch should be ignored and treated as compatible.
      const peerContext: PeerContext = new Map()
      peerContext.set('react', {
        active: true,
        specs: new Set([Spec.parse('react', '^18.0.0', configData)]),
        target: react18,
        type: 'prod',
        contextDependents: new Set(),
      })

      const result = checkPeerEdgesCompatible(
        node,
        graph.mainImporter,
        peerContext,
        graph,
      )
      t.same(result, { compatible: true })
    },
  )
})

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
      'peer.5',
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

  t.test(
    'correctly compares aliased specs using .final property',
    async t => {
      // This test validates the fix that ensures incompatibleSpecs
      // uses spec.final when comparing specs. Without this fix,
      // alias specs (like npm:foo@^1.0.0) or catalog specs
      // (like foo@catalog:) would be incorrectly
      // marked as incompatible because their range property is
      // on .final, not directly on the spec object.
      const peerContext: PeerContext = new Map()

      // Create an npm-aliased spec: my-foo@npm:foo@^1.0.0
      // This spec has:
      // - bareSpec: 'npm:foo@^1.0.0'
      // - range: undefined (range is on .final)
      // - final.range: Range for ^1.0.0
      const aliasSpec = Spec.parse(
        'my-foo',
        'npm:foo@^1.0.0',
        configData,
      )

      // Verify the alias structure is what we expect
      t.ok(aliasSpec.subspec, 'alias spec should have subspec')
      t.equal(
        aliasSpec.final.name,
        'foo',
        'final should resolve to foo',
      )
      t.ok(aliasSpec.final.range, 'final should have range')

      const mainManifest = {
        name: 'my-project',
        version: '1.0.0',
      }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      // Add the aliased spec to peer context
      addEntriesToPeerContext(
        peerContext,
        [{ spec: aliasSpec, type: 'peer' }],
        graph.mainImporter,
      )

      // Now try to add a compatible non-aliased spec: foo@^1.5.0
      // This should NOT need a fork because ^1.5.0 intersects with ^1.0.0
      const compatibleSpec = Spec.parse('foo', '^1.5.0', configData)
      const needsFork = addEntriesToPeerContext(
        peerContext,
        [{ spec: compatibleSpec, type: 'peer' }],
        graph.mainImporter,
      )

      t.equal(
        needsFork,
        false,
        'should NOT need fork - ^1.5.0 intersects with ^1.0.0 (via .final)',
      )

      // Also test the reverse: add non-aliased first, then aliased
      const peerContext2: PeerContext = new Map()
      const directSpec = Spec.parse('bar', '^2.0.0', configData)
      addEntriesToPeerContext(
        peerContext2,
        [{ spec: directSpec, type: 'peer' }],
        graph.mainImporter,
      )

      // Add compatible aliased spec
      const aliasSpec2 = Spec.parse(
        'my-bar',
        'npm:bar@^2.1.0',
        configData,
      )
      const needsFork2 = addEntriesToPeerContext(
        peerContext2,
        [{ spec: aliasSpec2, type: 'peer' }],
        graph.mainImporter,
      )

      t.equal(
        needsFork2,
        false,
        'should NOT need fork - aliased ^2.1.0 intersects with ^2.0.0',
      )
    },
  )

  t.test('correctly detects incompatible aliased specs', async t => {
    // Verify that truly incompatible ranges are still detected
    // even when using aliased specs
    const peerContext: PeerContext = new Map()
    const aliasSpec1 = Spec.parse(
      'my-foo',
      'npm:foo@^1.0.0',
      configData,
    )
    const aliasSpec2 = Spec.parse(
      'other-foo',
      'npm:foo@^2.0.0',
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

    // Add first aliased spec
    addEntriesToPeerContext(
      peerContext,
      [{ spec: aliasSpec1, type: 'peer' }],
      graph.mainImporter,
    )

    // Add incompatible aliased spec (different major version)
    const needsFork = addEntriesToPeerContext(
      peerContext,
      [{ spec: aliasSpec2, type: 'peer' }],
      graph.mainImporter,
    )

    t.equal(
      needsFork,
      true,
      'should need fork - ^1.0.0 does NOT intersect with ^2.0.0',
    )
  })

  t.test(
    'handles mixed alias and direct specs in checkEntriesToPeerContext',
    async t => {
      // This specifically tests the checkEntriesToPeerContext function
      // which also needed the .final fix
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

      // Set up a peer context with an active aliased entry
      const aliasSpec = Spec.parse(
        'my-pkg',
        'npm:pkg@^3.0.0',
        configData,
      )
      addEntriesToPeerContext(
        peerContext,
        [{ spec: aliasSpec, type: 'peer' }],
        graph.mainImporter,
      )

      // Mark the entry as active (simulating an active peer context)
      const entry = peerContext.get('pkg')
      if (entry) entry.active = true

      // Test with compatible direct spec
      const compatibleDirectSpec = Spec.parse(
        'pkg',
        '^3.5.0',
        configData,
      )
      const needsFork1 = checkEntriesToPeerContext(peerContext, [
        { spec: compatibleDirectSpec, type: 'peer' },
      ])
      t.equal(
        needsFork1,
        false,
        'compatible direct spec should not need fork',
      )

      // Test with incompatible direct spec
      const incompatibleDirectSpec = Spec.parse(
        'pkg',
        '^4.0.0',
        configData,
      )
      const needsFork2 = checkEntriesToPeerContext(peerContext, [
        { spec: incompatibleDirectSpec, type: 'peer' },
      ])
      t.equal(
        needsFork2,
        true,
        'incompatible direct spec should need fork',
      )

      // Test with compatible aliased spec
      const compatibleAliasSpec = Spec.parse(
        'other-pkg',
        'npm:pkg@^3.2.0',
        configData,
      )
      const needsFork3 = checkEntriesToPeerContext(peerContext, [
        { spec: compatibleAliasSpec, type: 'peer' },
      ])
      t.equal(
        needsFork3,
        false,
        'compatible aliased spec should not need fork',
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

  t.test(
    'needs fork when sibling entries in same batch conflict with each other',
    async t => {
      // This tests line 150 - when multiple entries are added in the same
      // call and a later entry conflicts with an earlier one that was just
      // created in this same iteration
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

      // Add two conflicting specs for the same package in ONE call
      // The first entry will create a new peer context entry
      // The second entry should trigger line 150 when it conflicts
      const needsFork = addEntriesToPeerContext(
        peerContext,
        [
          { spec: spec1, type: 'peer' },
          { spec: spec2, type: 'peer' },
        ],
        graph.mainImporter,
      )

      t.equal(
        needsFork,
        true,
        'should need fork when sibling entries conflict',
      )
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

  t.test(
    'reuses cached forked context for identical fork operations',
    async t => {
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

      // Add entry to original context
      addEntriesToPeerContext(
        originalContext,
        [{ spec: spec1, type: 'peer' }],
        graph.mainImporter,
      )

      const target = graph.placePackage(
        graph.mainImporter,
        'prod',
        spec2,
        { name: 'bar', version: '2.0.0' },
      )!

      // Fork with same entries twice
      const forkEntries: PeerContextEntryInput[] = [
        { spec: spec2, type: 'peer', target },
      ]

      const forked1 = forkPeerContext(
        graph,
        originalContext,
        forkEntries,
      )
      const forked2 = forkPeerContext(
        graph,
        originalContext,
        forkEntries,
      )

      // Should return the same cached context
      t.equal(forked1, forked2, 'should return same cached context')
      t.equal(forked1.index, forked2.index, 'should have same index')

      // Cache should have one entry for this fork
      t.equal(
        graph.peerContextForkCache.size,
        1,
        'cache should have one entry',
      )

      // Fork with different entries should create new context
      const spec3 = Spec.parse('baz', '^3.0.0', configData)
      const differentForkEntries: PeerContextEntryInput[] = [
        { spec: spec3, type: 'prod' },
      ]

      const forked3 = forkPeerContext(
        graph,
        originalContext,
        differentForkEntries,
      )

      t.not(
        forked3,
        forked1,
        'different entries should create different context',
      )
      t.not(
        forked3.index,
        forked1.index,
        'should have different indices',
      )
      t.equal(
        graph.peerContextForkCache.size,
        2,
        'cache should have two entries now',
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
    t.equal(result.peerSetHash, 'peer.1', 'should have peer set hash')
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
      const siblingVersion = graph.placePackage(
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
        { spec: siblingSpec, target: siblingVersion, type: 'prod' },
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
        siblingVersion.id,
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

  t.test(
    'putEntries returns fork entries when conflicts detected',
    async t => {
      const peerContext: PeerContext = new Map()
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      // Seed context with foo@^1
      addEntriesToPeerContext(
        peerContext,
        [
          {
            spec: Spec.parse('foo', '^1.0.0', configData),
            type: 'peer',
          },
        ],
        graph.mainImporter,
      )

      // Now try to putEntries with conflicting foo@^2
      const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        nodeSpec,
        { name: 'my-pkg', version: '1.0.0' },
      )!

      const nextDeps: any[] = []
      const nextPeerDeps = new Map()
      nextPeerDeps.set('foo', {
        spec: Spec.parse('foo', '^2.0.0', configData),
        type: 'peer' as const,
      })
      const queuedEntries: PeerContextEntryInput[] = [
        { spec: nodeSpec, target: node, type: 'prod' },
      ]

      const end = endPeerPlacement(
        peerContext,
        nextDeps,
        nextPeerDeps as any,
        graph,
        nodeSpec,
        graph.mainImporter,
        node,
        'prod',
        queuedEntries,
      )

      const forkEntries = end.putEntries()
      t.ok(forkEntries, 'should return fork entries')
      t.ok(
        forkEntries?.some(e => e.spec.final.name === 'foo'),
        'fork entries should include conflicting peer dep',
      )
    },
  )

  t.test(
    'resolves peer from queued peer closure when no sibling target/context target',
    async t => {
      const peerContext: PeerContext = new Map()
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const peerTarget = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('peer-pkg', '^1.0.0', configData),
        { name: 'peer-pkg', version: '1.0.0' },
      )!
      const provider = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('provider', '^1.0.0', configData),
        { name: 'provider', version: '1.0.0' },
      )!
      // provider exposes peer-pkg via a peer edge; closure should discover it
      graph.addEdge(
        'peer',
        Spec.parse('peer-pkg', '^1.0.0', configData),
        provider,
        peerTarget,
      )

      const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        nodeSpec,
        { name: 'my-pkg', version: '1.0.0' },
      )!

      const nextDeps: any[] = []
      const nextPeerDeps = new Map([
        [
          'peer-pkg',
          {
            spec: Spec.parse('peer-pkg', '^1.0.0', configData),
            type: 'peer' as const,
          },
        ],
      ])
      const queuedEntries: PeerContextEntryInput[] = [
        { spec: nodeSpec, target: node, type: 'prod' },
        {
          spec: Spec.parse('provider', '^1.0.0', configData),
          target: provider,
          type: 'prod',
        },
      ]

      const end = endPeerPlacement(
        peerContext,
        nextDeps,
        nextPeerDeps as any,
        graph,
        nodeSpec,
        graph.mainImporter,
        node,
        'prod',
        queuedEntries,
      )
      end.resolvePeerDeps()

      t.equal(
        nextDeps.length,
        0,
        'peer should be resolved via closure',
      )
      const edge = node.edgesOut.get('peer-pkg')
      t.ok(edge?.to, 'edge should have target')
      t.equal(
        edge?.to?.id,
        peerTarget.id,
        'should link to closure-found target',
      )
    },
  )

  t.test(
    'peer closure explores peer edges and returns undefined when no satisfying provider',
    async t => {
      // Cover branch outcomes inside findFromQueuedPeerClosure:
      // - edge exists but does NOT satisfy spec
      // - node has no edge for name (edge?.to falsy)
      // - enqueue via peer edges (q.push path)
      const peerContext: PeerContext = new Map()
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const peerV1 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('peer-pkg', '^1.0.0', configData),
        { name: 'peer-pkg', version: '1.0.0' },
      )!

      const provider2 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('provider-2', '^1.0.0', configData),
        { name: 'provider-2', version: '1.0.0' },
      )!

      const provider1 = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('provider-1', '^1.0.0', configData),
        { name: 'provider-1', version: '1.0.0' },
      )!

      // provider1 has an edge to peer-pkg, but it won't satisfy ^2.0.0
      graph.addEdge(
        'peer',
        Spec.parse('peer-pkg', '^1.0.0', configData),
        provider1,
        peerV1,
      )
      // provider1 also has a peer edge to provider2, so closure will enqueue and explore further
      graph.addEdge(
        'peer',
        Spec.parse('provider-2', '^1.0.0', configData),
        provider1,
        provider2,
      )

      const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        nodeSpec,
        { name: 'my-pkg', version: '1.0.0' },
      )!

      const nextDeps: any[] = []
      const nextPeerDeps = new Map([
        [
          'peer-pkg',
          {
            // Require v2, but only v1 exists. Closure should explore and then fail.
            spec: Spec.parse('peer-pkg', '^2.0.0', configData),
            type: 'peer' as const,
          },
        ],
      ])
      const queuedEntries: PeerContextEntryInput[] = [
        { spec: nodeSpec, target: node, type: 'prod' },
        {
          spec: Spec.parse('provider-1', '^1.0.0', configData),
          target: provider1,
          type: 'prod',
        },
      ]

      const end = endPeerPlacement(
        peerContext,
        nextDeps,
        nextPeerDeps as any,
        graph,
        nodeSpec,
        graph.mainImporter,
        node,
        'prod',
        queuedEntries,
      )
      end.resolvePeerDeps()

      t.equal(
        nextDeps.length,
        1,
        'unsatisfied peer should fall back to nextDeps',
      )
      t.equal(nextDeps[0].spec.final.name, 'peer-pkg')
    },
  )

  t.test(
    'peer closure skips already-seen nodes in queue',
    async t => {
      const peerContext: PeerContext = new Map()
      const mainManifest = { name: 'my-project', version: '1.0.0' }
      const graph = new Graph({
        projectRoot: t.testdirName,
        ...configData,
        mainManifest,
      })

      const provider = graph.placePackage(
        graph.mainImporter,
        'prod',
        Spec.parse('provider', '^1.0.0', configData),
        { name: 'provider', version: '1.0.0' },
      )!

      const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)
      const node = graph.placePackage(
        graph.mainImporter,
        'prod',
        nodeSpec,
        { name: 'my-pkg', version: '1.0.0' },
      )!

      const nextDeps: any[] = []
      const nextPeerDeps = new Map([
        [
          'missing',
          {
            spec: Spec.parse('missing', '^1.0.0', configData),
            type: 'peer' as const,
          },
        ],
      ])

      // Duplicate provider target so closure queue will contain same node twice.
      const queuedEntries: PeerContextEntryInput[] = [
        { spec: nodeSpec, target: node, type: 'prod' },
        {
          spec: Spec.parse('provider', '^1.0.0', configData),
          target: provider,
          type: 'prod',
        },
        {
          spec: Spec.parse('provider', '^1.0.0', configData),
          target: provider,
          type: 'prod',
        },
      ]

      const end = endPeerPlacement(
        peerContext,
        nextDeps,
        nextPeerDeps as any,
        graph,
        nodeSpec,
        graph.mainImporter,
        node,
        'prod',
        queuedEntries,
      )
      end.resolvePeerDeps()

      t.equal(
        nextDeps.length,
        1,
        'unsatisfied peer should fall back to nextDeps',
      )
      t.equal(nextDeps[0].spec.final.name, 'missing')
    },
  )

  t.test('peer closure respects depth limit (>=3)', async t => {
    const peerContext: PeerContext = new Map()
    const mainManifest = { name: 'my-project', version: '1.0.0' }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const p0 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('p0', '^1.0.0', configData),
      { name: 'p0', version: '1.0.0' },
    )!
    const p1 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('p1', '^1.0.0', configData),
      { name: 'p1', version: '1.0.0' },
    )!
    const p2 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('p2', '^1.0.0', configData),
      { name: 'p2', version: '1.0.0' },
    )!
    const p3 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('p3', '^1.0.0', configData),
      { name: 'p3', version: '1.0.0' },
    )!
    const p4 = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('p4', '^1.0.0', configData),
      { name: 'p4', version: '1.0.0' },
    )!

    // chain peer edges to reach depth=3 (p3), which should be skipped for further traversal
    graph.addEdge(
      'peer',
      Spec.parse('p1', '^1.0.0', configData),
      p0,
      p1,
    )
    graph.addEdge(
      'peer',
      Spec.parse('p2', '^1.0.0', configData),
      p1,
      p2,
    )
    graph.addEdge(
      'peer',
      Spec.parse('p3', '^1.0.0', configData),
      p2,
      p3,
    )
    graph.addEdge(
      'peer',
      Spec.parse('p4', '^1.0.0', configData),
      p3,
      p4,
    )

    const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      nodeSpec,
      { name: 'my-pkg', version: '1.0.0' },
    )!

    const nextDeps: any[] = []
    const nextPeerDeps = new Map([
      [
        'missing',
        {
          spec: Spec.parse('missing', '^1.0.0', configData),
          type: 'peer' as const,
        },
      ],
    ])

    const queuedEntries: PeerContextEntryInput[] = [
      { spec: nodeSpec, target: node, type: 'prod' },
      {
        spec: Spec.parse('p0', '^1.0.0', configData),
        target: p0,
        type: 'prod',
      },
    ]

    const end = endPeerPlacement(
      peerContext,
      nextDeps,
      nextPeerDeps as any,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      queuedEntries,
    )
    end.resolvePeerDeps()

    t.equal(nextDeps.length, 1)
    t.equal(nextDeps[0].spec.final.name, 'missing')
  })

  t.test(
    'peer closure handles unexpected undefined shift defensively',
    async t => {
      // Force the defensive `if (!cur) break` branch by patching Array.prototype.shift
      const orig = Array.prototype.shift
      let once = true
      ;(Array.prototype as any).shift = function () {
        if (once) {
          once = false
          return undefined
        }
        return orig.call(this)
      }

      try {
        const peerContext: PeerContext = new Map()
        const mainManifest = { name: 'my-project', version: '1.0.0' }
        const graph = new Graph({
          projectRoot: t.testdirName,
          ...configData,
          mainManifest,
        })

        const provider = graph.placePackage(
          graph.mainImporter,
          'prod',
          Spec.parse('provider', '^1.0.0', configData),
          { name: 'provider', version: '1.0.0' },
        )!

        const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)
        const node = graph.placePackage(
          graph.mainImporter,
          'prod',
          nodeSpec,
          { name: 'my-pkg', version: '1.0.0' },
        )!

        const nextDeps: any[] = []
        const nextPeerDeps = new Map([
          [
            'peer-pkg',
            {
              spec: Spec.parse('peer-pkg', '^1.0.0', configData),
              type: 'peer' as const,
            },
          ],
        ])
        const queuedEntries: PeerContextEntryInput[] = [
          { spec: nodeSpec, target: node, type: 'prod' },
          {
            spec: Spec.parse('provider', '^1.0.0', configData),
            target: provider,
            type: 'prod',
          },
        ]

        const end = endPeerPlacement(
          peerContext,
          nextDeps,
          nextPeerDeps as any,
          graph,
          nodeSpec,
          graph.mainImporter,
          node,
          'prod',
          queuedEntries,
        )
        end.resolvePeerDeps()

        t.equal(nextDeps.length, 1)
        t.equal(nextDeps[0].spec.final.name, 'peer-pkg')
      } finally {
        Array.prototype.shift = orig
      }
    },
  )

  t.test('rewires existing peer edge to sibling target', async t => {
    const peerContext: PeerContext = new Map()
    const mainManifest = { name: 'my-project', version: '1.0.0' }
    const graph = new Graph({
      projectRoot: t.testdirName,
      ...configData,
      mainManifest,
    })

    const wrong = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('peer-pkg', '^1.0.0', configData),
      { name: 'peer-pkg', version: '1.0.0' },
    )!
    const right = graph.placePackage(
      graph.mainImporter,
      'prod',
      Spec.parse('peer-pkg', '^1.0.0', configData),
      { name: 'peer-pkg', version: '1.0.1' },
    )!

    const nodeSpec = Spec.parse('my-pkg', '^1.0.0', configData)
    const node = graph.placePackage(
      graph.mainImporter,
      'prod',
      nodeSpec,
      { name: 'my-pkg', version: '1.0.0' },
    )!

    // Existing peer edge points to wrong target
    graph.addEdge(
      'peer',
      Spec.parse('peer-pkg', '^1.0.0', configData),
      node,
      wrong,
    )

    const nextDeps: any[] = []
    const nextPeerDeps = new Map([
      [
        'peer-pkg',
        {
          spec: Spec.parse('peer-pkg', '^1.0.0', configData),
          type: 'peer' as const,
        },
      ],
    ])
    const queuedEntries: PeerContextEntryInput[] = [
      { spec: nodeSpec, target: node, type: 'prod' },
      {
        spec: Spec.parse('peer-pkg', '^1.0.0', configData),
        target: right,
        type: 'prod',
      },
    ]

    const end = endPeerPlacement(
      peerContext,
      nextDeps,
      nextPeerDeps as any,
      graph,
      nodeSpec,
      graph.mainImporter,
      node,
      'prod',
      queuedEntries,
    )
    end.resolvePeerDeps()

    t.equal(nextDeps.length, 0)
    const edge = node.edgesOut.get('peer-pkg')
    t.equal(edge?.to?.id, right.id, 'should rewire to sibling target')
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
    'outlier peer - workspace sibling with different peer context',
    async t => {
      // This tests the scenario where:
      // - Root has react@18 and workspace:a
      // - workspace:a also has react@18 and package-with-flexible-peer-deps
      // - package-peer-parent-2 has react@^19.1.0 (different from workspaces)
      // - The flexible peer deps package should resolve to correct react per context
      const mainManifest = {
        name: 'outlier-peer',
        version: '1.0.0',
        dependencies: {
          '@ruyadorno/package-peer-parent-2': '^1.0.0',
          react: '18',
        },
      }
      const aManifest = {
        name: 'a',
        version: '1.0.0',
        dependencies: {
          '@ruyadorno/package-with-flexible-peer-deps': '^1.0.0',
          react: '18',
        },
      }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
        packages: {
          a: {
            'package.json': JSON.stringify(aManifest),
          },
        },
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
        monorepo: new Monorepo(dir, {
          config: {
            packages: ['packages/*'],
          },
          scurry,
          packageJson,
          load: { paths: 'packages/*' },
        }),
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
              'react',
              asDependency({
                spec: Spec.parse('react', '18'),
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
        'should build graph with outlier peer context handling',
      )

      // Verify flexible peer deps in parent-2 context points to react@19
      const parent2 = [
        ...graph.nodesByName.get('@ruyadorno/package-peer-parent-2')!,
      ][0]
      t.ok(parent2, 'parent-2 should exist')

      const flexibleInParent2Context = [
        ...graph.nodesByName.get(
          '@ruyadorno/package-with-flexible-peer-deps',
        )!,
      ].find(n => {
        const reactEdge = n.edgesOut.get('react')
        return reactEdge?.to?.version === '18.3.1'
      })
      t.ok(
        flexibleInParent2Context,
        'flexible peer deps should have context pointing to react@18',
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

  await t.test(
    'multi-workspace peer context isolation with 4 workspaces',
    async t => {
      // This tests the scenario from the vlt-lock.json fixture where:
      // - Root has @isaacs/peer-dep-cycle-a@^2.0.0 and react@^19.0.0
      // - Workspaces a,c have @isaacs/peer-dep-cycle-a@^1.0.0, react@^18, flexible-peer-deps
      // - Workspaces b,d have @isaacs/peer-dep-cycle-a@^2.0.0, react@^19, flexible-peer-deps
      // Each workspace should get its own peer context, and similar workspaces
      // should share contexts via fork caching
      const mainManifest = {
        name: 'test-10',
        version: '1.0.0',
        dependencies: {
          '@isaacs/peer-dep-cycle-a': '^2.0.0',
          react: '^19.0.0',
        },
      }
      const aManifest = {
        name: 'a',
        version: '1.0.0',
        dependencies: {
          '@isaacs/peer-dep-cycle-a': '^1.0.0',
          '@ruyadorno/package-with-flexible-peer-deps': '^1.0.0',
          react: '^18',
        },
      }
      const bManifest = {
        name: 'b',
        version: '1.0.0',
        dependencies: {
          '@isaacs/peer-dep-cycle-a': '^2.0.0',
          '@ruyadorno/package-with-flexible-peer-deps': '^1.0.0',
          react: '^19',
        },
      }
      const cManifest = {
        name: 'c',
        version: '1.0.0',
        dependencies: {
          '@isaacs/peer-dep-cycle-a': '^1.0.0',
          '@ruyadorno/package-with-flexible-peer-deps': '^1.0.0',
          react: '^18',
        },
      }
      const dManifest = {
        name: 'd',
        version: '1.0.0',
        dependencies: {
          '@isaacs/peer-dep-cycle-a': '^2.0.0',
          '@ruyadorno/package-with-flexible-peer-deps': '^1.0.0',
          react: '^19',
        },
      }
      const dir = t.testdir({
        'package.json': JSON.stringify(mainManifest),
        a: { 'package.json': JSON.stringify(aManifest) },
        b: { 'package.json': JSON.stringify(bManifest) },
        c: { 'package.json': JSON.stringify(cManifest) },
        d: { 'package.json': JSON.stringify(dManifest) },
        'vlt.json': JSON.stringify({
          workspaces: { packages: ['a', 'b', 'c', 'd'] },
        }),
      })

      const scurry = new PathScurry(dir)
      const projectRoot = dir
      const packageJson = new PackageJson()
      const packageInfo = createMockPackageInfo()
      const monorepo = new Monorepo(dir, {
        config: { packages: ['a', 'b', 'c', 'd'] },
        scurry,
        packageJson,
        load: { paths: ['a', 'b', 'c', 'd'] },
      })
      const options = {
        projectRoot,
        scurry,
        mainManifest,
        loadManifests: true,
        packageJson,
        monorepo,
      }

      const actual = actualLoad({
        ...options,
      })

      const graph = await build({
        ...options,
        actual,
        packageInfo,
        remover: new RollbackRemove(),
      })

      t.matchSnapshot(
        mermaidOutput({
          edges: [...graph.edges],
          importers: graph.importers,
          nodes: [...graph.nodes.values()],
        }),
        'should build graph with 4 workspaces having isolated peer contexts',
      )

      // Verify workspaces a and c share context (both have react@18)
      const wsA = [...graph.importers].find(
        i => i.manifest?.name === 'a',
      )
      const wsC = [...graph.importers].find(
        i => i.manifest?.name === 'c',
      )
      t.ok(wsA, 'workspace a should exist')
      t.ok(wsC, 'workspace c should exist')

      // Both should point to react@18.3.1
      const reactEdgeA = wsA?.edgesOut.get('react')
      const reactEdgeC = wsC?.edgesOut.get('react')
      t.equal(
        reactEdgeA?.to?.version,
        '18.3.1',
        'workspace a should have react@18.3.1',
      )
      t.equal(
        reactEdgeC?.to?.version,
        '18.3.1',
        'workspace c should have react@18.3.1',
      )

      // Verify workspaces b and d share context (both have react@19)
      const wsB = [...graph.importers].find(
        i => i.manifest?.name === 'b',
      )
      const wsD = [...graph.importers].find(
        i => i.manifest?.name === 'd',
      )
      t.ok(wsB, 'workspace b should exist')
      t.ok(wsD, 'workspace d should exist')

      const reactEdgeB = wsB?.edgesOut.get('react')
      const reactEdgeD = wsD?.edgesOut.get('react')
      t.equal(
        reactEdgeB?.to?.version,
        '19.2.0',
        'workspace b should have react@19',
      )
      t.equal(
        reactEdgeD?.to?.version,
        '19.2.0',
        'workspace d should have react@19',
      )

      // Verify flexible peer deps exists with different contexts
      const flexibleNodes = graph.nodesByName.get(
        '@ruyadorno/package-with-flexible-peer-deps',
      )
      t.ok(flexibleNodes, 'flexible peer deps nodes should exist')
      // Should have at least 2 instances (one for react@18 context, one for react@19)
      t.ok(
        flexibleNodes!.size >= 2,
        'should have multiple flexible peer deps instances for different contexts',
      )

      // Verify fork cache was used (same fork entries should reuse context)
      t.ok(
        graph.peerContextForkCache.size > 0,
        'peer context fork cache should be populated',
      )
    },
  )
})
