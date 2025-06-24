import t from 'tap'
import { PackageJson } from '@vltpkg/package-json'
import type { DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import { Graph } from '../../src/graph.ts'
import { asDependency } from '../../src/dependencies.ts'
import type {
  Dependency,
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../../src/dependencies.ts'
import { updatePackageJson } from '../../src/reify/update-importers-package-json.ts'

const specOptions = {
  registry: 'https://registry.npmjs.org',
  registries: {
    custom: 'http://example.com',
  },
}

t.test('updatePackageJson', async t => {
  const rootMani = {
    name: 'root',
    version: '1.0.0',
    peerDependencies: {
      pdep: '1.2.3',
      becomeprod: '1.2.3',
    },
    peerDependenciesMeta: {
      becomeprod: { optional: true },
    },
  }

  const graph = new Graph({
    mainManifest: rootMani,
    projectRoot: t.testdirName,
  })
  const packageJson = new PackageJson()
  const root = graph.mainImporter
  const rootID = root.id
  const fooMani = { name: 'foo', version: '1.0.0' }
  const fooSpec = Spec.parse('foo@1.0.0')
  const foo = graph.addNode(
    undefined,
    fooMani,
    fooSpec,
    fooMani.name,
    fooMani.version,
  )

  const newPeerOptionalSpec = Spec.parse('newpeeroptional@1.0.0')
  const newPeerOptionalMani = {
    name: 'newpeeroptional',
    version: '1.0.0',
  }
  const newPeerOptional = graph.addNode(
    undefined,
    newPeerOptionalMani,
    newPeerOptionalSpec,
    newPeerOptionalMani.name,
    newPeerOptionalMani.version,
  )

  const becomeProdSpec = Spec.parse('becomeprod@1.0.0')
  const becomeProdMani = {
    name: 'newpeeroptional',
    version: '1.0.0',
  }
  const becomeProd = graph.addNode(
    undefined,
    becomeProdMani,
    becomeProdSpec,
    becomeProdMani.name,
    becomeProdMani.version,
  )

  graph.addEdge('prod', fooSpec, root, foo)
  graph.addEdge(
    'peerOptional',
    newPeerOptionalSpec,
    root,
    newPeerOptional,
  )
  graph.addEdge('prod', becomeProdSpec, root, becomeProd)

  const add = new Map<DepID, Map<string, Dependency>>([
    [
      rootID,
      new Map<string, Dependency>([
        [
          'foo',
          asDependency({
            spec: fooSpec,
            type: 'prod',
          }),
        ],
        [
          'newpeeroptional',
          asDependency({
            spec: newPeerOptionalSpec,
            type: 'peerOptional',
          }),
        ],
        [
          'becomeprod',
          asDependency({
            spec: becomeProdSpec,
            type: 'prod',
          }),
        ],
      ]),
    ],
  ]) as AddImportersDependenciesMap

  // spies on packageJson.save method to assert behavior
  const retrieveManifestResult = t.capture(packageJson, 'save').args

  updatePackageJson({ add, packageJson, graph })()

  const res = retrieveManifestResult()
  const [mani] = res
  t.strictSame(res.length, 1, 'should have been called once')
  t.matchSnapshot(
    mani,
    'should have appended dependencies object as expected',
  )

  await t.test('missing importer node', async t => {
    const borkedGraph = new Graph({
      mainManifest: rootMani,
      projectRoot: t.testdirName,
    })
    borkedGraph.nodes.clear() // borks it
    t.throws(
      () =>
        updatePackageJson({
          packageJson,
          graph: borkedGraph,
          add,
        })(),
      /Failed to retrieve importer node/,
      'should throw a importer node retrieval error',
    )
  })

  await t.test('missing importer manifest', async t => {
    const borkedGraph = new Graph({
      mainManifest: rootMani,
      projectRoot: t.testdirName,
    })
    delete borkedGraph.mainImporter.manifest
    t.throws(
      () =>
        updatePackageJson({
          packageJson,
          graph: borkedGraph,
          add,
        })(),
      /Could not find manifest data for node/,
      'should throw a missing manifest node error',
    )
  })

  await t.test('bad dependency type', async t => {
    t.throws(
      () =>
        updatePackageJson({
          packageJson,
          graph,
          add: new Map([
            [
              rootID,
              new Map([
                [
                  'foo',
                  {
                    spec: fooSpec,
                    type: 'borked',
                  } as unknown as Dependency,
                ],
              ]),
            ],
          ]) as AddImportersDependenciesMap,
        })(),
      /Failed to retrieve dependency type/,
      'should throw a bad dependency type error',
    )
  })

  await t.test('missing target node', async t => {
    const emptyGraph = new Graph({
      mainManifest: rootMani,
      projectRoot: t.testdirName,
    })
    t.throws(
      () =>
        updatePackageJson({
          packageJson,
          graph: emptyGraph,
          add,
        })(),
      /Dependency node could not be found/,
      'should throw a missing dependency node error',
    )
  })

  await t.test('non-registry dependency type', async t => {
    const gitMani = { name: 'git', version: '1.0.0' }
    const gitSpec = Spec.parse('git@github:a/b')
    const git = graph.addNode(
      undefined,
      gitMani,
      gitSpec,
      gitMani.name,
      gitMani.version,
    )
    graph.addEdge('prod', gitSpec, root, git)

    updatePackageJson({
      packageJson,
      graph,
      add: new Map([
        [
          rootID,
          new Map([
            [
              'git',
              asDependency({
                spec: gitSpec,
                type: 'prod',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
    })()

    const res = retrieveManifestResult()
    const [mani] = res
    t.strictSame(res.length, 1, 'should have been called once')
    t.matchSnapshot(
      mani,
      'should have appended dependencies object as expected',
    )
  })

  await t.test('registry range dep', async t => {
    const rangeMani = { name: 'range', version: '1.0.0' }
    const rangeSpec = Spec.parse('range@~1.1.0')
    const range = graph.addNode(
      undefined,
      rangeMani,
      rangeSpec,
      rangeMani.name,
      rangeMani.version,
    )
    graph.addEdge('prod', rangeSpec, root, range)

    updatePackageJson({
      packageJson,
      graph,
      add: new Map([
        [
          rootID,
          new Map([
            [
              'range',
              asDependency({
                spec: rangeSpec,
                type: 'dev',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
    })()

    const res = retrieveManifestResult()
    const [mani] = res
    t.strictSame(res.length, 1, 'should have been called once')
    t.matchSnapshot(
      mani,
      'should use provided range in package json save',
    )
  })

  await t.test('no semver dep', async t => {
    const defMani = { name: 'def', version: '1.0.0' }
    const defSpec = Spec.parse('def')
    const def = graph.addNode(
      undefined,
      defMani,
      defSpec,
      defMani.name,
      defMani.version,
    )
    graph.addEdge('prod', defSpec, root, def)

    updatePackageJson({
      packageJson,
      graph,
      add: new Map([
        [
          rootID,
          new Map([
            [
              'def',
              asDependency({
                spec: defSpec,
                type: 'dev',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
    })()

    const res = retrieveManifestResult()
    const [mani] = res
    t.strictSame(res.length, 1, 'should have been called once')
    t.matchSnapshot(
      mani,
      'should use provided def in package json save',
    )
  })

  await t.test('remove dependencies', async t => {
    updatePackageJson({
      packageJson,
      graph,
      remove: new Map([
        [rootID, new Set(['foo', 'newpeeroptional'])],
      ]) as RemoveImportersDependenciesMap,
    })()

    const res = retrieveManifestResult()
    const [mani] = res
    t.strictSame(res.length, 1, 'should have been called once')
    t.matchSnapshot(mani, 'should have remove dependency')
  })

  await t.test('no add / remove properties', async t => {
    updatePackageJson({
      packageJson,
      graph,
    })()

    const res = retrieveManifestResult()
    t.strictSame(res.length, 0, 'should have not been called')
  })

  await t.test('no dependencies listed on add map', async t => {
    updatePackageJson({
      add: new Map([
        [rootID, new Map()],
      ]) as AddImportersDependenciesMap,
      packageJson,
      graph,
    })()

    const res = retrieveManifestResult()
    t.strictSame(res.length, 0, 'should have not been called')
  })

  await t.test('registry gt range dep', async t => {
    const gtMani = { name: 'gtor', version: '1.0.0' }
    const gtSpec = Spec.parse('gtor@>=1.1.0 || 2')
    const gt = graph.addNode(
      undefined,
      gtMani,
      gtSpec,
      gtMani.name,
      gtMani.version,
    )
    graph.addEdge('prod', gtSpec, root, gt)

    updatePackageJson({
      packageJson,
      graph,
      add: new Map([
        [
          rootID,
          new Map([
            [
              'gtor',
              asDependency({
                spec: gtSpec,
                type: 'dev',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
    })()

    const res = retrieveManifestResult()
    const [mani] = res
    t.strictSame(res.length, 1, 'should have been called once')
    t.matchSnapshot(
      mani,
      'should use provided range in package json save',
    )
  })

  await t.test('aliased install', async t => {
    const aliasedMani = { name: 'a', version: '1.0.0' }
    const aliasedSpec = Spec.parse('b', 'npm:a@1.0.0')
    const aliased = graph.addNode(
      undefined,
      aliasedMani,
      aliasedSpec,
      aliasedMani.name,
      aliasedMani.version,
    )
    graph.addEdge('prod', aliasedSpec, root, aliased)

    updatePackageJson({
      packageJson,
      graph,
      add: new Map([
        [
          rootID,
          new Map([
            [
              'b',
              asDependency({
                spec: aliasedSpec,
                type: 'prod',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
    })()

    const res = retrieveManifestResult()
    const [mani] = res
    t.strictSame(res.length, 1, 'should have been called once')
    t.matchSnapshot(
      mani,
      'should use provided aliased in package json save',
    )
  })

  await t.test('aliased install from dist-tag', async t => {
    const aliasedMani = { name: 'a', version: '1.0.0' }
    const aliasedSpec = Spec.parse('b', 'npm:a@latest')
    const aliased = graph.addNode(
      undefined,
      aliasedMani,
      aliasedSpec,
      aliasedMani.name,
      aliasedMani.version,
    )
    graph.addEdge('prod', aliasedSpec, root, aliased)

    updatePackageJson({
      packageJson,
      graph,
      add: new Map([
        [
          rootID,
          new Map([
            [
              'b',
              asDependency({
                spec: aliasedSpec,
                type: 'prod',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
    })()

    const res = retrieveManifestResult()
    const [mani] = res
    t.strictSame(res.length, 1, 'should have been called once')
    t.matchSnapshot(
      mani,
      'should use resolved version in package json save',
    )
  })

  await t.test('custom aliased install', async t => {
    const aliasedMani = { name: 'a', version: '1.0.0' }
    const aliasedSpec = Spec.parse(
      'b',
      'custom:a@latest',
      specOptions,
    )
    const aliased = graph.addNode(
      undefined,
      aliasedMani,
      aliasedSpec,
      aliasedMani.name,
      aliasedMani.version,
    )
    graph.addEdge('prod', aliasedSpec, root, aliased)

    updatePackageJson({
      packageJson,
      graph,
      add: new Map([
        [
          rootID,
          new Map([
            [
              'b',
              asDependency({
                spec: aliasedSpec,
                type: 'prod',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
    })()

    const res = retrieveManifestResult()
    const [mani] = res
    t.strictSame(res.length, 1, 'should have been called once')
    t.matchSnapshot(
      mani,
      'should use custom aliased registry in package json save',
    )
  })

  await t.test(
    'multiple dependencies with mixed changes',
    async t => {
      // Create a manifest that already has some dependencies
      const rootManifestWithDeps = {
        name: 'root-with-deps',
        version: '1.0.0',
        dependencies: {
          'last-dep': '^2.0.0', // This will remain unchanged
        },
      }

      const testGraph = new Graph({
        mainManifest: rootManifestWithDeps,
        projectRoot: t.testdirName,
      })
      const testRoot = testGraph.mainImporter

      // Create nodes for testing
      const newDepMani = { name: 'new-dep', version: '1.5.0' }
      const newSpec = Spec.parse('new-dep@^1.0.0')
      const newDep = testGraph.addNode(
        undefined,
        newDepMani,
        newSpec,
        newDepMani.name,
        newDepMani.version,
      )

      // the already existing dep needs to come after in order to
      // make sure we don't override the `manifestChanged` state
      const existingDepMani = { name: 'last-dep', version: '2.0.0' }
      const existingSpec = Spec.parse('last-dep@^2.0.0')
      const existingDep = testGraph.addNode(
        undefined,
        existingDepMani,
        existingSpec,
        existingDepMani.name,
        existingDepMani.version,
      )

      // Add edges
      testGraph.addEdge('prod', newSpec, testRoot, newDep)
      testGraph.addEdge('prod', existingSpec, testRoot, existingDep)

      // Test adding multiple dependencies:
      // - 'new-dep' is new (change required)
      // - 'last-dep' already has '^2.0.0' and we add '^2.0.0' (no change)
      const multiAdd = new Map<DepID, Map<string, Dependency>>([
        [
          testRoot.id,
          new Map<string, Dependency>([
            [
              'new-dep',
              asDependency({
                spec: newSpec,
                type: 'prod',
              }),
            ],
            [
              'last-dep',
              asDependency({
                spec: existingSpec,
                type: 'prod',
              }),
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap

      updatePackageJson({
        add: multiAdd,
        packageJson,
        graph: testGraph,
      })()

      const res = retrieveManifestResult()

      // The key test: Should still call save even though one dependency didn't change
      // because the other dependency (new-dep) did cause a change.
      // This validates that manifestChanged accumulates across multiple dependencies.
      t.strictSame(
        res.length,
        1,
        'should have been called once even with mixed changes',
      )

      const [mani] = res
      t.matchSnapshot(
        mani,
        'should save manifest with mixed dependency changes',
      )
    },
  )
})
