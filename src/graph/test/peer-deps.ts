import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import t from 'tap'
import { Graph } from '../src/graph.ts'

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
    peerDependencies: {
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

  // Create a package that depends on peer-dep
  const pkgWithPeerDep = graph.addNode(
    undefined,
    {
      name: 'pkg-with-peer',
      version: '1.0.0',
      peerDependencies: {
        'peer-dep': '^1.0.0',
      },
    },
    Spec.parse('pkg-with-peer@^1.0.0'),
  )

  // Create two versions of peer-dep
  const peerDepV1 = graph.addNode(
    undefined,
    {
      name: 'peer-dep',
      version: '1.0.0',
    },
    Spec.parse('peer-dep@^1.0.0'),
  )

  // Create peer-dep v2 for testing incompatible versions
  graph.addNode(
    undefined,
    {
      name: 'peer-dep',
      version: '2.0.0',
    },
    Spec.parse('peer-dep@^2.0.0'),
  )

  // Test that findResolution returns the correct peer dependency version
  t.equal(
    graph.findResolution(
      Spec.parse('peer-dep@^1.0.0'),
      pkgWithPeerDep,
    ),
    peerDepV1,
    'should find the correct peer dependency version',
  )

  // Test that findResolution returns undefined for incompatible peer dependency version
  t.equal(
    graph.findResolution(
      Spec.parse('peer-dep@^2.0.0'),
      pkgWithPeerDep,
    ),
    undefined,
    'should not find incompatible peer dependency version',
  )

  // Test that placePackage creates nodes with correct peer dependency information
  const newPkgWithPeerDep = graph.placePackage(
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

  t.ok(newPkgWithPeerDep, 'should create a node for pkg-with-peer')
  if (!newPkgWithPeerDep) {
    throw new Error('Failed to create node for pkg-with-peer')
  }

  t.equal(
    newPkgWithPeerDep.id,
    joinDepIDTuple([
      'registry',
      '',
      'pkg-with-peer@1.0.0',
      'peer-dep@^1.0.0',
    ]),
    'should include peer dependency information in node ID',
  )

  // Test that nodes with different peer dependency resolutions are treated as distinct
  const pkgWithDifferentPeerDep = graph.placePackage(
    graph.mainImporter,
    'prod',
    Spec.parse('pkg-with-peer@^1.0.0'),
    {
      name: 'pkg-with-peer',
      version: '1.0.0',
      peerDependencies: {
        'peer-dep': '^2.0.0',
      },
    },
  )

  t.ok(
    pkgWithDifferentPeerDep,
    'should create a node for pkg-with-peer with different peer dep',
  )
  if (!pkgWithDifferentPeerDep) {
    throw new Error(
      'Failed to create node for pkg-with-peer with different peer dep',
    )
  }

  t.not(
    newPkgWithPeerDep.id === pkgWithDifferentPeerDep.id,
    'should create distinct nodes for different peer dependency resolutions',
  )

  // Test that findResolution returns the correct node based on peer dependency information
  t.equal(
    graph.findResolution(
      Spec.parse('pkg-with-peer@^1.0.0'),
      graph.mainImporter,
    ),
    newPkgWithPeerDep,
    'should find the correct node based on peer dependency information',
  )
})
