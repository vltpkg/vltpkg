import t from 'tap'
import { loadNodes } from '../../src/lockfile/load-nodes.ts'
import { Graph } from '../../src/graph.ts'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { LockfileData } from '../../src/index.ts'

t.cleanSnapshot = s =>
  s.replace(
    /^(\s+)"projectRoot": ".*"/gm,
    '$1"projectRoot": "{ROOT}"',
  )

t.test('load nodes', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })
  const nodes = {
    [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
    [joinDepIDTuple(['file', 'linked'])]: [0, 'linked'],
    [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
      0,
      'foo',
      'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
    ],
    // Test edge case for registrySpec with trailing @
    [joinDepIDTuple(['registry', '', 'edge-case@'])]: [
      0,
      'edge-case',
      null,
    ],
    [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
      0,
      'bar',
      'sha512-6/deadbeef==',
      'https://registry.example.com/bar/-/bar-1.0.0.tgz',
    ],
    [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
      0,
      'baz',
      null,
      null,
      './node_modules/.pnpm/baz@1.0.0/node_modules/baz',
    ],
  } as LockfileData['nodes']
  loadNodes(graph, nodes, {})
  t.matchSnapshot(
    [...graph.nodes.values()].map(n => n.toJSON()),
    'should load nodes into graph',
  )

  const moreNodes = {
    [joinDepIDTuple(['registry', '', 'lorem'])]: [
      0,
      null,
      'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
    ],
  } as LockfileData['nodes']
  loadNodes(graph, moreNodes, {})
  const namelessNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'lorem']),
  )!
  t.matchSnapshot(
    namelessNode.toJSON(),
    'should load node missing name and version',
  )
})

t.test('load nodes with manifest', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })
  const nodes = {
    [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
      3,
      'bar',
      null,
      null,
      null,
      {
        name: 'bar',
        version: '1.0.0',
      },
    ],
    [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
      2,
      'foo',
      'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      null,
      'node_modules/.pnpm/foo@1.0.0/node_modules/foo',
      {
        name: 'foo',
        version: '1.0.0',
        dist: {
          integrity:
            'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        },
      },
    ],
    [joinDepIDTuple(['registry', 'custom', 'baz@1.0.0'])]: [
      1,
      'baz',
      null,
      'http://example.com/baz.tgz',
      null,
      {
        name: 'baz',
        version: '1.0.0',
        dist: {
          tarball: 'http://example.com/baz.tgz',
        },
      },
    ],
  } as LockfileData['nodes']
  loadNodes(graph, nodes, {})
  t.matchSnapshot(
    [...graph.nodes.values()].map(n => n.toJSON()),
    'should load nodes into graph with manifest data',
  )
})

t.test('load nodes with confused manifest', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })
  const nodes = {
    [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
      0,
      'foo',
      'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
      null,
      'node_modules/.pnpm/foo@1.0.0/node_modules/foo',
      {
        name: 'foo',
        version: '1.0.0',
      },
      {
        name: 'test',
        version: '1.0.0',
      },
    ],
  } as LockfileData['nodes']
  loadNodes(graph, nodes, {})
  const loadedFoo = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'foo@1.0.0']),
  )
  t.ok(loadedFoo, 'should load the confused node')
  t.equal(loadedFoo?.confused, true, 'should have confused flag set')
  t.equal(
    loadedFoo?.manifest?.name,
    'foo',
    'should have fixed manifest name',
  )
  t.equal(
    loadedFoo?.rawManifest?.name,
    'test',
    'should have original manifest name',
  )
  t.matchSnapshot(
    loadedFoo?.toJSON(),
    'should load node with confused manifest',
  )
})

t.test(
  'load nodes with modifier and peerSetHash from extra DepID parameter',
  async t => {
    const graph = new Graph({
      mainManifest: {
        name: 'my-project',
        version: '1.0.0',
      },
      projectRoot: t.testdirName,
    })

    // Create DepIDs with extra parameters for different dependency types
    const nodes = {
      // Registry dependency with modifier only
      [joinDepIDTuple([
        'registry',
        '',
        'modified-pkg@1.0.0',
        ':root > #modified-pkg',
      ])]: [
        0,
        'modified-pkg',
        'sha512-example==',
        'https://registry.npmjs.org/modified-pkg/-/modified-pkg-1.0.0.tgz',
        null,
        {
          name: 'modified-pkg',
          version: '1.0.0',
        },
      ],
      // Git dependency with peerSetHash only
      [joinDepIDTuple([
        'git',
        'https://github.com/user/repo.git',
        'main',
        'ṗ:abc123',
      ])]: [
        0,
        'git-pkg',
        null,
        null,
        null,
        {
          name: 'git-pkg',
          version: '1.0.0',
        },
      ],
      // File dependency with both modifier and peerSetHash
      [joinDepIDTuple([
        'file',
        './local-pkg',
        ':root > #file-pkgṗ:def456',
      ])]: [
        0,
        'file-pkg',
        null,
        null,
        './packages/local-pkg',
        {
          name: 'file-pkg',
          version: '1.0.0',
        },
      ],
      // Registry dependency without extra parameter (no modifier or peerSetHash)
      [joinDepIDTuple(['registry', '', 'regular-pkg@1.0.0'])]: [
        0,
        'regular-pkg',
        'sha512-example==',
        null,
        null,
        {
          name: 'regular-pkg',
          version: '1.0.0',
        },
      ],
    } as LockfileData['nodes']

    loadNodes(graph, nodes, {})

    // Verify registry node with modifier only
    const modifiedPkgNode = graph.nodes.get(
      joinDepIDTuple([
        'registry',
        '',
        'modified-pkg@1.0.0',
        ':root > #modified-pkg',
      ]),
    )
    t.ok(
      modifiedPkgNode,
      'should load modified registry package node',
    )
    t.equal(
      modifiedPkgNode?.modifier,
      ':root > #modified-pkg',
      'registry node should have correct modifier',
    )
    t.equal(
      modifiedPkgNode?.peerSetHash,
      undefined,
      'registry node should not have peerSetHash',
    )

    // Verify git node with peerSetHash only
    const gitPkgNode = graph.nodes.get(
      joinDepIDTuple([
        'git',
        'https://github.com/user/repo.git',
        'main',
        'ṗ:abc123',
      ]),
    )
    t.ok(gitPkgNode, 'should load git package node with peerSetHash')
    t.equal(
      gitPkgNode?.modifier,
      undefined,
      'git node should not have modifier',
    )
    t.equal(
      gitPkgNode?.peerSetHash,
      'ṗ:abc123',
      'git node should have correct peerSetHash',
    )

    // Verify file node with both modifier and peerSetHash
    const filePkgNode = graph.nodes.get(
      joinDepIDTuple([
        'file',
        './local-pkg',
        ':root > #file-pkgṗ:def456',
      ]),
    )
    t.ok(filePkgNode, 'should load file package node with both')
    t.equal(
      filePkgNode?.modifier,
      ':root > #file-pkg',
      'file node should have correct modifier',
    )
    t.equal(
      filePkgNode?.peerSetHash,
      'ṗ:def456',
      'file node should have correct peerSetHash',
    )

    // Verify regular node without modifier or peerSetHash
    const regularPkgNode = graph.nodes.get(
      joinDepIDTuple(['registry', '', 'regular-pkg@1.0.0']),
    )
    t.ok(regularPkgNode, 'should load regular package node')
    t.equal(
      regularPkgNode?.modifier,
      undefined,
      'regular node should have no modifier',
    )
    t.equal(
      regularPkgNode?.peerSetHash,
      undefined,
      'regular node should have no peerSetHash',
    )

    // Snapshot test to verify the complete structure
    t.matchSnapshot(
      [...graph.nodes.values()]
        .filter(node => node.name !== 'my-project') // Exclude main importer
        .map(n => ({
          id: n.id,
          name: n.name,
          modifier: n.modifier,
          peerSetHash: n.peerSetHash,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      'should load nodes with correct modifiers and peerSetHash from extra DepID parameters',
    )
  },
)

t.test('load nodes with hydration from actual graph', async t => {
  // Create the target graph that will receive loaded nodes
  const targetGraph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })

  // Create the actual graph with reference nodes containing full data
  const actualGraph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })

  // Add reference nodes to the actual graph with complete data
  const fooManifest = {
    name: 'foo',
    version: '2.0.0',
    dependencies: {
      bar: '^1.0.0',
    },
  }
  const fooId = joinDepIDTuple(['registry', '', 'foo@2.0.0'])
  const fooNode = actualGraph.addNode(fooId, fooManifest)
  fooNode.integrity = 'sha512-actualFooIntegrity=='
  fooNode.resolved = 'https://registry.npmjs.org/foo/-/foo-2.0.0.tgz'

  const barManifest = {
    name: 'bar',
    version: '1.5.0',
    main: 'index.js',
  }
  const barId = joinDepIDTuple(['registry', '', 'bar@1.5.0'])
  const barNode = actualGraph.addNode(barId, barManifest)
  barNode.integrity = 'sha512-actualBarIntegrity=='
  barNode.resolved = 'https://registry.npmjs.org/bar/-/bar-1.5.0.tgz'

  const bazManifest = {
    name: 'baz',
    version: '3.0.0',
    scripts: {
      test: 'echo "test"',
    },
  }
  const bazId = joinDepIDTuple(['registry', '', 'baz@3.0.0'])
  const bazNode = actualGraph.addNode(bazId, bazManifest)
  bazNode.integrity = 'sha512-actualBazIntegrity=='
  bazNode.resolved = 'https://registry.npmjs.org/baz/-/baz-3.0.0.tgz'

  // Create lockfile nodes with missing data that should be hydrated
  const nodes = {
    // Node missing manifest - should get it from actual graph
    [fooId]: [
      0, // flags
      'foo', // name
      null, // integrity - missing, should be hydrated
      null, // resolved - missing, should be hydrated
      null, // location
      null, // manifest - missing, should be hydrated
    ],
    // Node missing integrity and resolved - should get them from actual graph
    [barId]: [
      1, // optional flag
      'bar', // name
      null, // integrity - missing, should be hydrated
      null, // resolved - missing, should be hydrated
      null, // location
      {
        name: 'bar',
        version: '1.5.0',
        description: 'lockfile version with partial data',
      }, // manifest - present but different from actual
    ],
    // Node with partial data - should only hydrate missing fields
    [bazId]: [
      2, // dev flag
      'baz', // name
      'sha512-lockfileBazIntegrity==', // integrity - present, should NOT be overridden
      null, // resolved - missing, should be hydrated
      null, // location
      null, // manifest - missing, should be hydrated
    ],
    // Node not in actual graph - should load with just lockfile data
    [joinDepIDTuple(['registry', '', 'missing@1.0.0'])]: [
      0,
      'missing',
      'sha512-missingIntegrity==',
      'https://registry.npmjs.org/missing/-/missing-1.0.0.tgz',
      null,
      {
        name: 'missing',
        version: '1.0.0',
      },
    ],
  } as LockfileData['nodes']

  // Load nodes with hydration from actual graph
  loadNodes(targetGraph, nodes, {}, actualGraph)

  t.matchSnapshot(
    [...targetGraph.nodes.values()]
      .filter(node => node.name !== 'my-project') // Exclude main importer
      .map(n => ({
        id: n.id,
        name: n.name,
        version: n.version,
        integrity: n.integrity,
        resolved: n.resolved,
        dev: n.dev,
        optional: n.optional,
        hasManifest: !!n.manifest,
        manifestKeys:
          n.manifest ? Object.keys(n.manifest).sort() : [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    'should hydrate nodes with data from actual graph',
  )
})

t.test('load nodes with no actual graph provided', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })

  // Create lockfile nodes with missing data but no actual graph to hydrate from
  const nodes = {
    [joinDepIDTuple(['registry', '', 'standalone@1.0.0'])]: [
      0,
      'standalone',
      null, // integrity - missing, no hydration source
      null, // resolved - missing, no hydration source
      null,
      null, // manifest - missing, no hydration source
    ],
  } as LockfileData['nodes']

  // Load nodes without actual graph (should handle gracefully)
  loadNodes(graph, nodes, {}) // No actual parameter

  t.matchSnapshot(
    [...graph.nodes.values()]
      .filter(node => node.name !== 'my-project') // Exclude main importer
      .map(n => ({
        id: n.id,
        name: n.name,
        version: n.version,
        integrity: n.integrity,
        resolved: n.resolved,
        dev: n.dev,
        optional: n.optional,
        hasManifest: !!n.manifest,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    'should load nodes without hydration from actual graph',
  )
})

t.test(
  'load nodes with optimization path for large graphs',
  async t => {
    const graph = new Graph({
      mainManifest: {
        name: 'my-project',
        version: '1.0.0',
      },
      projectRoot: t.testdirName,
    })

    // Create a large node set to trigger optimizations (>50 nodes)
    const nodes: LockfileData['nodes'] = {}

    // Add root
    nodes[joinDepIDTuple(['file', '.'])] = [0, 'my-project']

    // Add many registry nodes to trigger optimization code paths
    for (let i = 0; i < 60; i++) {
      const packageName = `opt-pkg-${i}`
      const depId = joinDepIDTuple([
        'registry',
        '',
        `${packageName}@1.0.${i}`,
      ])

      nodes[depId] = [
        0,
        packageName,
        `sha512-${i.toString().padStart(40, '0')}`,
        null,
        null,
        {
          name: packageName,
          version: `1.0.${i}`,
          dependencies: {},
        },
      ]
    }

    loadNodes(graph, nodes, {})
    t.equal(
      graph.nodes.size,
      61,
      'should load all nodes using optimization path',
    )

    // Verify some specific nodes exist
    t.ok(
      graph.nodes.has(joinDepIDTuple(['file', '.'])),
      'root node exists',
    )
    t.ok(
      graph.nodes.has(
        joinDepIDTuple(['registry', '', 'opt-pkg-0@1.0.0']),
      ),
      'first optimized node exists',
    )
    t.ok(
      graph.nodes.has(
        joinDepIDTuple(['registry', '', 'opt-pkg-59@1.0.59']),
      ),
      'last optimized node exists',
    )
  },
)

t.test('load nodes with buildState', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })

  const nodes = {
    [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
    // Node with buildState = needed (1)
    [joinDepIDTuple(['registry', '', 'needs-build@1.0.0'])]: [
      0,
      'needs-build',
      'sha512-needsbuild==',
      null,
      null,
      {
        name: 'needs-build',
        version: '1.0.0',
        scripts: {
          install: 'node install.js',
        },
      },
      null,
      null,
      null,
      1, // buildState: needed
    ],
    // Node with buildState = built (2)
    [joinDepIDTuple(['registry', '', 'already-built@1.0.0'])]: [
      0,
      'already-built',
      'sha512-alreadybuilt==',
      null,
      null,
      {
        name: 'already-built',
        version: '1.0.0',
      },
      null,
      null,
      null,
      2, // buildState: built
    ],
    // Node with buildState = failed (3)
    [joinDepIDTuple(['registry', '', 'failed-build@1.0.0'])]: [
      0,
      'failed-build',
      'sha512-failedbuild==',
      null,
      null,
      {
        name: 'failed-build',
        version: '1.0.0',
      },
      null,
      null,
      null,
      3, // buildState: failed
    ],
    // Node with no buildState (undefined)
    [joinDepIDTuple(['registry', '', 'no-build@1.0.0'])]: [
      0,
      'no-build',
      'sha512-nobuild==',
    ],
  } as LockfileData['nodes']

  loadNodes(graph, nodes, {})

  // Verify buildState values are loaded correctly
  const needsBuildNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'needs-build@1.0.0']),
  )
  t.ok(needsBuildNode, 'needs-build node should exist')
  t.equal(
    needsBuildNode?.buildState,
    'needed',
    'buildState should be "needed"',
  )

  const alreadyBuiltNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'already-built@1.0.0']),
  )
  t.ok(alreadyBuiltNode, 'already-built node should exist')
  t.equal(
    alreadyBuiltNode?.buildState,
    'built',
    'buildState should be "built"',
  )

  const failedBuildNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'failed-build@1.0.0']),
  )
  t.ok(failedBuildNode, 'failed-build node should exist')
  t.equal(
    failedBuildNode?.buildState,
    'failed',
    'buildState should be "failed"',
  )

  const noBuildNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'no-build@1.0.0']),
  )
  t.ok(noBuildNode, 'no-build node should exist')
  t.equal(
    noBuildNode?.buildState,
    'none',
    'buildState should be "none" when not specified',
  )

  t.matchSnapshot(
    [...graph.nodes.values()]
      .filter(node => node.name !== 'my-project')
      .map(n => ({
        id: n.id,
        name: n.name,
        buildState: n.buildState,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    'should load nodes with correct buildState values',
  )
})

t.test('load nodes with platform and bin', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })

  const nodes = {
    [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
    // Node with both platform constraints and bins
    [joinDepIDTuple(['registry', '', 'pkg-with-bin@1.0.0'])]: [
      0,
      'pkg-with-bin',
      'sha512-binpkg==',
      null,
      null,
      {
        name: 'pkg-with-bin',
        version: '1.0.0',
      },
      null,
      {
        engines: { node: '>=18.0.0' },
        os: ['linux', 'darwin'],
        cpu: ['x64', 'arm64'],
      },
      {
        'pkg-with-bin': './bin/cli.js',
        'alt-name': './bin/alt.js',
      },
    ],
    // Node with different platform constraints and single bin
    [joinDepIDTuple(['registry', '', 'platform-pkg@2.0.0'])]: [
      0,
      'platform-pkg',
      'sha512-platformpkg==',
      null,
      null,
      {
        name: 'platform-pkg',
        version: '2.0.0',
      },
      null,
      {
        engines: { node: '>=20.0.0', npm: '>=10.0.0' },
        os: 'win32',
        cpu: 'x64',
      },
      {
        'platform-pkg': './index.js',
      },
    ],
  } as LockfileData['nodes']

  loadNodes(graph, nodes, {})

  // Verify first node with multiple bins and array platform values
  const binPkgNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'pkg-with-bin@1.0.0']),
  )
  t.ok(binPkgNode, 'pkg-with-bin node should exist')
  t.same(
    binPkgNode?.bins,
    { 'pkg-with-bin': './bin/cli.js', 'alt-name': './bin/alt.js' },
    'should have correct bins',
  )
  t.same(
    binPkgNode?.platform?.engines,
    { node: '>=18.0.0' },
    'should have correct engines',
  )
  t.same(
    binPkgNode?.platform?.os,
    ['linux', 'darwin'],
    'should have correct os array',
  )
  t.same(
    binPkgNode?.platform?.cpu,
    ['x64', 'arm64'],
    'should have correct cpu array',
  )

  // Verify second node with single bin and string platform values
  const platformPkgNode = graph.nodes.get(
    joinDepIDTuple(['registry', '', 'platform-pkg@2.0.0']),
  )
  t.ok(platformPkgNode, 'platform-pkg node should exist')
  t.same(
    platformPkgNode?.bins,
    { 'platform-pkg': './index.js' },
    'should have correct single bin',
  )
  t.same(
    platformPkgNode?.platform?.engines,
    { node: '>=20.0.0', npm: '>=10.0.0' },
    'should have correct engines with multiple entries',
  )
  t.equal(
    platformPkgNode?.platform?.os,
    'win32',
    'should have correct os string',
  )
  t.equal(
    platformPkgNode?.platform?.cpu,
    'x64',
    'should have correct cpu string',
  )

  t.matchSnapshot(
    [...graph.nodes.values()]
      .filter(node => node.name !== 'my-project')
      .map(n => ({
        id: n.id,
        name: n.name,
        bins: n.bins,
        platform: n.platform,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    'should load nodes with platform and bin data',
  )
})

t.test('throwOnMissingManifest option', async t => {
  const graph = new Graph({
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
    },
    projectRoot: t.testdirName,
  })

  // Node with no manifest
  const nodes = {
    [joinDepIDTuple(['registry', '', 'no-manifest@1.0.0'])]: [
      0,
      'no-manifest',
      'sha512-nomanifest==',
      null,
      null,
      null, // manifest is null
    ],
  } as LockfileData['nodes']

  // Should throw when throwOnMissingManifest is true
  try {
    loadNodes(graph, nodes, {}, undefined, true)
    t.fail('should have thrown')
  } catch (err: any) {
    t.match(
      err.message,
      /Missing manifest for node.*no-manifest@1\.0\.0 and no reference node found/,
      'should throw with correct error message',
    )
    t.same(
      err,
      /Missing manifest for node/,
      'should have missing manifest error msg',
    )
  }

  // Should not throw when throwOnMissingManifest is false/undefined
  t.doesNotThrow(
    () => loadNodes(graph, nodes, {}),
    'should not throw when throwOnMissingManifest is not set',
  )
})
