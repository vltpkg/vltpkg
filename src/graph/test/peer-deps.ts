import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import t from 'tap'
import { Graph } from '../src/index.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('Peer Dependency Resolution', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      'peer-dep': '^1.0.0',
    },
  }
  const projectRoot = t.testdir({ 'vlt.json': '{}' })
  t.chdir(projectRoot)
  unload('project')
  const graph = new Graph({
    ...configData,
    mainManifest,
    projectRoot,
  })

  // First, place the peer dependency in the main project
  const mainPeerDep = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('peer-dep@^1.0.0'),
    {
      name: 'peer-dep',
      version: '1.0.0',
    },
  )

  t.ok(mainPeerDep, 'should place peer-dep in main project')

  // Now place a package that has peer-dep as a peer dependency
  const pkgWithPeerDep = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('pkg-with-peer@^1.0.0'),
    {
      name: 'pkg-with-peer',
      version: '1.0.0',
      peerDependencies: {
        'peer-dep': '^1.0.0',
      },
    },
  )

  t.ok(pkgWithPeerDep, 'should create a node for pkg-with-peer')

  // Test that the node ID doesn't include peer dependency information
  t.equal(
    pkgWithPeerDep?.id,
    joinDepIDTuple(['registry', '', 'pkg-with-peer@1.0.0']),
    'should not include peer dependency information in node ID',
  )

  // Test findResolution with peer dependency context
  const foundResolution = graph.findResolution(
    Spec.parse('pkg-with-peer@^1.0.0'),
    graph.mainImporter,
  )

  t.equal(
    foundResolution,
    pkgWithPeerDep,
    'should find the correct node when peer dependencies are satisfied',
  )

  // Test that packages with incompatible peer dependencies still work (non-blocking)
  // Create a new graph with incompatible peer-dep version
  const incompatibleGraph = new Graph({
    ...configData,
    mainManifest: {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        'peer-dep': '^2.0.0',
      },
    },
    projectRoot,
  })

  // Place peer-dep v2
  const peerDepV2 = incompatibleGraph.placePackage(
    incompatibleGraph.mainImporter,
    'prod',
    Spec.parse('peer-dep@^2.0.0'),
    {
      name: 'peer-dep',
      version: '2.0.0',
    },
  )

  t.ok(peerDepV2, 'should place peer-dep v2')

  // Try to place a package that requires peer-dep v1 in context where only v2 exists
  const pkgWithIncompatiblePeer = incompatibleGraph.placePackage(
    incompatibleGraph.mainImporter,
    'prod',
    Spec.parse('pkg-with-peer@^1.0.0'),
    {
      name: 'pkg-with-peer',
      version: '1.0.0',
      peerDependencies: {
        'peer-dep': '^1.0.0',
      },
    },
  )

  // This should still create the node (non-blocking validation)
  t.ok(
    pkgWithIncompatiblePeer,
    'should create node even when peer dependencies are incompatible (non-blocking)',
  )

  // Test optional peer dependencies
  const pkgWithOptionalPeer = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('pkg-with-optional-peer@^1.0.0'),
    {
      name: 'pkg-with-optional-peer',
      version: '1.0.0',
      peerDependencies: {
        'optional-peer': '^1.0.0',
      },
      peerDependenciesMeta: {
        'optional-peer': {
          optional: true,
        },
      },
    },
  )

  t.ok(
    pkgWithOptionalPeer,
    'should create node even when optional peer dependency is missing',
  )
})
