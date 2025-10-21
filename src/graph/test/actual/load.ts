import { rmSync } from 'fs'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import {
  load,
  getPathBasedId,
  asStoreConfigObject,
} from '../../src/actual/load.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import { actualGraph } from '../fixtures/actual.ts'
import { GraphModifier } from '../../src/modifiers.ts'
import type { Path } from 'path-scurry'
import type { SpecOptions } from '@vltpkg/spec'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    custom: 'http://example.com',
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

t.test('load actual', async t => {
  const projectRoot = actualGraph(t)
  t.chdir(projectRoot)
  unload('project')

  const scurry = new PathScurry(projectRoot)
  const fullGraph = load({
    projectRoot,
    scurry,
    packageJson: new PackageJson(),
    monorepo: Monorepo.maybeLoad(projectRoot),
    loadManifests: true,
    skipHiddenLockfile: false,
    ...configData,
  })

  t.strictSame(
    fullGraph.extraneousDependencies.size,
    1,
    'should only have found a single extraneous dependency',
  )

  t.matchSnapshot(
    objectLikeOutput(fullGraph),
    'should load an actual graph containing missing deps info',
  )

  // remove any hidden lockfile to test loading without manifests
  rmSync(scurry.resolve('node_modules/.vlt-lock.json'), {
    recursive: true,
  })

  t.matchSnapshot(
    objectLikeOutput(
      load({
        scurry,
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: false,
        ...configData,
      }),
    ),
    'should load an actual graph without any manifest info',
  )
})

t.test('cycle', async t => {
  // my-project
  // +- a
  //    +- b
  //       +- a
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        a: '^1.0.0',
      },
    }),
    'vlt.json': '{}',
    node_modules: {
      '.vlt': {
        [joinDepIDTuple(['registry', '', 'a@1.0.0'])]: {
          node_modules: {
            a: {
              'package.json': JSON.stringify({
                name: 'a',
                version: '1.0.0',
                dependencies: {
                  b: '^1.0.0',
                },
              }),
            },
            b: t.fixture(
              'symlink',
              '../../' +
                joinDepIDTuple(['registry', '', 'b@1.0.0']) +
                '/node_modules/b',
            ),
          },
        },
        [joinDepIDTuple(['registry', '', 'b@1.0.0'])]: {
          node_modules: {
            b: {
              'package.json': JSON.stringify({
                name: 'b',
                version: '1.0.0',
                dependencies: {
                  a: '^1.0.0',
                },
              }),
            },
            a: t.fixture(
              'symlink',
              '../../' +
                joinDepIDTuple(['registry', '', 'a@1.0.0']) +
                '/node_modules/a',
            ),
          },
        },
      },
      a: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', '', 'a@1.0.0']) +
          '/node_modules/a',
      ),
    },
  })
  t.chdir(projectRoot)
  unload('project')
  const scurry = new PathScurry(projectRoot)
  t.matchSnapshot(
    objectLikeOutput(
      load({
        scurry,
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        ...configData,
      }),
    ),
    'should load an actual graph with cycle containing missing deps info',
  )

  // remove any hidden lockfile to test loading without manifests
  rmSync(scurry.resolve('node_modules/.vlt-lock.json'), {
    recursive: true,
  })

  t.matchSnapshot(
    objectLikeOutput(
      load({
        scurry,
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: false,
        ...configData,
      }),
    ),
    'should load an actual graph with cycle without any manifest info',
  )
})

t.test('uninstalled dependencies', async t => {
  const projectRoot = t.testdir({
    'vlt.json': '{}',
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        a: '^1.0.0',
      },
    }),
  })
  t.chdir(projectRoot)
  unload('project')
  t.matchSnapshot(
    objectLikeOutput(
      load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        ...configData,
      }),
    ),
    'should load an actual graph with missing deps with manifest info',
  )
  t.matchSnapshot(
    objectLikeOutput(
      load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: false,
        ...configData,
      }),
    ),
    'should load an actual graph with missing deps with no manifest info',
  )
})

t.test('getPathBasedId', async t => {
  t.matchSnapshot(
    [
      [
        Spec.parse('foo', '^1.0.0'),
        new PathScurry(
          `node_modules/.vlt/${joinDepIDTuple(['registry', '', 'foo@1.0.0'])}`,
        ).cwd,
      ],
      [
        Spec.parse('foo', '^1.0.0'),
        new PathScurry(
          `node_modules/.vlt/${joinDepIDTuple(['registry', '', 'foo@1.0.0', 'deadbeef'])}`,
        ).cwd,
      ],
      [
        Spec.parse('b', 'github:a/b'),
        new PathScurry(
          `node_modules/.vlt/${joinDepIDTuple(['git', 'github:a/b', ''])}`,
        ).cwd,
      ],
      [
        Spec.parse('b', 'github:a/b'),
        new PathScurry(
          `node_modules/.vlt/${joinDepIDTuple(['git', 'github:a/b', '', 'deadbeef'])}`,
        ).cwd,
      ],
      // file deps are not located in the node_modules/.vlt store folder
      [
        Spec.parse('foo', 'file:./foo'),
        {
          relativePosix() {
            return 'foo'
          },
        },
      ],
      [
        Spec.parse('foo', 'file:./foo'),
        {
          relativePosix() {
            return 'foo'
          },
        },
      ],
      // workspaces are not located in the node_modules/.vlt store folder
      [
        Spec.parse('a', 'workspace:*'),
        {
          relativePosix() {
            return 'packages/a'
          },
        },
      ],
      [
        Spec.parse('a', 'workspace:*'),
        {
          relativePosix() {
            return 'packages/a'
          },
        },
      ],
      [
        Spec.parse('x', 'https://example.com/x.tgz'),
        new PathScurry(
          `node_modules/.vlt/${joinDepIDTuple(['remote', 'https://example.com/x.tgz'])}`,
        ).cwd,
      ],
      [
        Spec.parse('x', 'https://example.com/x.tgz'),
        new PathScurry(
          `node_modules/.vlt/${joinDepIDTuple(['remote', 'https://example.com/x.tgz', 'deadbeef'])}`,
        ).cwd,
      ],
    ].map(([spec, path]) =>
      getPathBasedId(spec as Spec, path as Path),
    ),
    'should get path based id for various dep ids',
  )
})

t.test('extra parameter in DepID', async t => {
  // Define DepIDs upfront so we can reference them consistently
  const depIdA = joinDepIDTuple(['registry', '', 'a@1.0.0'])
  const depIdB = joinDepIDTuple([
    'registry',
    '',
    'b@1.0.0',
    ':root > #b',
  ])
  const depIdC = joinDepIDTuple([
    'registry',
    '',
    'c@1.0.0',
    ':root > #c > #d',
  ])

  // Create a project with dependencies that have extra params in their DepIDs
  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'extra-param-project',
      version: '1.0.0',
      dependencies: {
        a: '^1.0.0',
        b: '^1.0.0',
        c: '^1.0.0',
        d: 'file:packages/d',
      },
    }),
    'vlt.json': '{}',
    packages: {
      d: {
        'package.json': JSON.stringify({
          name: 'd',
          version: '1.0.0',
        }),
      },
    },
    node_modules: {
      '.vlt': {
        // Regular dependency without extra parameter
        [depIdA]: {
          node_modules: {
            a: {
              'package.json': JSON.stringify({
                name: 'a',
                version: '1.0.0',
              }),
            },
          },
        },
        // With extra parameter - selector path
        [depIdB]: {
          node_modules: {
            b: {
              'package.json': JSON.stringify({
                name: 'b',
                version: '1.0.0',
              }),
            },
          },
        },
        // With extra parameter - nested selector path
        [depIdC]: {
          node_modules: {
            c: {
              'package.json': JSON.stringify({
                name: 'c',
                version: '1.0.0',
              }),
            },
          },
        },
      },
      a: t.fixture('symlink', '.vlt/' + depIdA + '/node_modules/a'),
      b: t.fixture('symlink', '.vlt/' + depIdB + '/node_modules/b'),
      c: t.fixture('symlink', '.vlt/' + depIdC + '/node_modules/c'),
      // For file type, create a real symlink to the packages dir
      d: t.fixture('symlink', '../packages/d'),
    },
  })

  t.chdir(projectRoot)
  unload('project')

  const graph = load({
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    monorepo: Monorepo.maybeLoad(projectRoot),
    projectRoot,
    loadManifests: true,
    ...configData,
  })

  // Get nodes directly by their DepIDs
  const nodeA = graph.nodes.get(depIdA)
  const nodeB = graph.nodes.get(depIdB)
  const nodeC = graph.nodes.get(depIdC)
  const nodeD = graph.nodes.get(
    joinDepIDTuple(['file', 'packages/d']),
  )

  // Verify nodes exist with the correct names and IDs
  t.ok(nodeA, 'regular node a exists')
  t.equal(nodeA?.name, 'a', 'node a has correct name')

  t.ok(nodeB, 'node b with selector extra parameter exists')
  t.equal(nodeB?.name, 'b', 'node b has correct name')

  t.ok(nodeC, 'node c with nested selector extra parameter exists')
  t.equal(nodeC?.name, 'c', 'node c has correct name')

  t.ok(nodeD, 'file-type node d exists')
  t.equal(nodeD?.name, 'd', 'node d has correct name')

  // Generate the serialized graph and check for the correct structure
  const serializedGraph = objectLikeOutput(graph)
  t.matchSnapshot(
    serializedGraph,
    'should preserve extra parameters in DepIDs when loading the graph',
  )
})

t.test('skipLoadingNodesOnModifiersChange behavior', async t => {
  // Modifiers have changed - should not load dependencies
  await t.test(
    'modifiers changed - should skip loading dependencies',
    async t => {
      const aDepID = joinDepIDTuple(['registry', '', 'a@1.0.0'])
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'modifiers-test-project',
          version: '1.0.0',
          dependencies: {
            a: '^1.0.0',
          },
        }),
        // Project-level vlt.json with some modifiers
        'vlt.json': JSON.stringify({
          modifiers: { ':root > #a': '^2.0.0' },
        }),
        node_modules: {
          '.vlt': {
            // Store config with no modifiers (empty object) - this should be different
            'vlt.json': JSON.stringify({
              modifiers: {},
            }),
            [aDepID]: {
              node_modules: {
                a: {
                  'package.json': JSON.stringify({
                    name: 'a',
                    version: '1.0.0',
                  }),
                },
              },
            },
          },
          a: t.fixture('symlink', '.vlt/${aDepID}/node_modules/a'),
        },
      })

      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier({
        ...configData,
      })
      const graph = load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        skipLoadingNodesOnModifiersChange: true, // This is the key option
        modifiers,
        ...configData,
      })

      // Since modifiers changed, dependencies should not be loaded
      // since it's using skipLoadingNodesOnModifiersChange=true
      const nodeA = graph.nodes.get(aDepID)
      t.notOk(
        nodeA,
        'dependency "a" should not be loaded because modifiers changed',
      )
      t.equal(
        graph.nodes.size,
        1,
        'graph should contain just the root node',
      )
    },
  )

  // Modifiers haven't changed - should load dependencies
  await t.test(
    'modifiers unchanged - should load dependencies',
    async t => {
      const bDepID = joinDepIDTuple(['registry', '', 'b@1.0.0'])
      const modifiersConfig = JSON.stringify({
        modifiers: { ':root > #b': '^1.0.0' },
      })
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'modifiers-test-project-2',
          version: '1.0.0',
          dependencies: {
            b: '^1.0.0',
          },
        }),
        // Project-level vlt.json with same modifiers as store
        'vlt.json': modifiersConfig,
        node_modules: {
          '.vlt': {
            // Store config with same modifiers as project
            'vlt.json': modifiersConfig,
            [bDepID]: {
              node_modules: {
                b: {
                  'package.json': JSON.stringify({
                    name: 'b',
                    version: '1.0.0',
                  }),
                },
              },
            },
          },
          b: t.fixture('symlink', `.vlt/${bDepID}/node_modules/b`),
        },
      })

      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier({
        ...configData,
      })
      const graph = load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        skipLoadingNodesOnModifiersChange: true, // This is the key option
        modifiers,
        ...configData,
      })

      // Since modifiers are the same, dependencies should be loaded
      // even though skipLoadingNodesOnModifiersChange=true
      const nodeB = graph.nodes.get(bDepID)
      t.ok(
        nodeB,
        'dependency "b" should be loaded because modifiers are unchanged ' +
          'even though skipLoadingNodesOnModifiersChange is true',
      )
      t.equal(
        nodeB?.name,
        'b',
        'loaded node should have correct name',
      )
      t.equal(
        graph.nodes.size,
        2,
        'graph should contain loaded nodes',
      )
    },
  )

  // Test scenario 3: skipLoadingNodesOnModifiersChange disabled - should always load
  await t.test(
    'skipLoadingNodesOnModifiersChange disabled - should always load',
    async t => {
      const modifiersConfig = { ':root > #c': '^1.0.0' }

      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'modifiers-test-project-3',
          version: '1.0.0',
          dependencies: {
            c: '^1.0.0',
          },
        }),
        // Project-level vlt.json with same modifiers as store
        'vlt.json': JSON.stringify({
          modifiers: modifiersConfig,
        }),
        node_modules: {
          '.vlt': {
            // Store config with same modifiers as project
            'vlt.json': JSON.stringify({
              modifiers: modifiersConfig,
            }),
            [joinDepIDTuple(['registry', '', 'c@1.0.0'])]: {
              node_modules: {
                c: {
                  'package.json': JSON.stringify({
                    name: 'c',
                    version: '1.0.0',
                  }),
                },
              },
            },
          },
          c: t.fixture(
            'symlink',
            '.vlt/' +
              joinDepIDTuple(['registry', '', 'c@1.0.0']) +
              '/node_modules/c',
          ),
        },
      })

      t.chdir(projectRoot)
      unload('project')

      // Create modifiers - it will load from the project-level vlt.json
      const modifiers = new GraphModifier({
        ...configData,
      })

      const graph = load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        skipLoadingNodesOnModifiersChange: false, // Disabled - should always load
        modifiers,
        ...configData,
      })

      // Even with same modifiers, dependencies should be loaded because skipLoadingNodesOnModifiersChange: false
      const nodeC = graph.nodes.get(
        joinDepIDTuple(['registry', '', 'c@1.0.0']),
      )
      t.ok(
        nodeC,
        'dependency "c" should be loaded because skipLoadingNodesOnModifiersChange is disabled',
      )
      t.equal(
        nodeC?.name,
        'c',
        'loaded node should have correct name',
      )
      t.equal(
        graph.nodes.size > 1,
        true,
        'graph should contain more than just the root node',
      )
    },
  )

  await t.test(
    'store config file missing - should skip loading dependencies',
    async t => {
      const dDepID = joinDepIDTuple(['registry', '', 'd@1.0.0'])
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'modifiers-test-project-4',
          version: '1.0.0',
          dependencies: {
            d: '^1.0.0',
          },
        }),
        // Project-level vlt.json with modifiers
        'vlt.json': JSON.stringify({
          modifiers: { ':root > #d': '^1.0.0' },
        }),
        node_modules: {
          '.vlt': {
            // NOTE: No vlt.json file in the store - this is the key difference
            // The store config will default to { modifiers: undefined }
            [dDepID]: {
              node_modules: {
                d: {
                  'package.json': JSON.stringify({
                    name: 'd',
                    version: '1.0.0',
                  }),
                },
              },
            },
          },
          d: t.fixture('symlink', `.vlt/${dDepID}/node_modules/d`),
        },
      })

      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier({
        ...configData,
      })
      const graph = load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        skipLoadingNodesOnModifiersChange: true, // This is the key option
        modifiers,
        ...configData,
      })

      // Since store config file is missing (defaults to no modifiers) but project has modifiers,
      // they are different, so dependencies should not be loaded
      const nodeD = graph.nodes.get(dDepID)
      t.notOk(
        nodeD,
        'dependency "d" should not be loaded because store config file is missing ' +
          '(causing modifiers comparison to fail)',
      )
      t.equal(
        graph.nodes.size,
        1,
        'graph should contain just the root node',
      )
    },
  )
})

t.test('modifiers integration', async t => {
  await t.test(
    'should apply modifiers when loading actual graph',
    async t => {
      const aDepID = joinDepIDTuple(['registry', '', 'a@1.0.0'])
      const bDepID = joinDepIDTuple(['registry', '', 'b@2.0.0']) // Modified version
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'modifiers-actual-test',
          version: '1.0.0',
          dependencies: {
            a: '^1.0.0',
            b: '^1.0.0', // Will be modified to 2.0.0
          },
        }),
        'vlt.json': JSON.stringify({
          modifiers: {
            ':root > #b': '^2.0.0', // Override b to use 2.0.0
          },
        }),
        node_modules: {
          '.vlt': {
            [aDepID]: {
              node_modules: {
                a: {
                  'package.json': JSON.stringify({
                    name: 'a',
                    version: '1.0.0',
                  }),
                },
              },
            },
            [bDepID]: {
              node_modules: {
                b: {
                  'package.json': JSON.stringify({
                    name: 'b',
                    version: '2.0.0',
                  }),
                },
              },
            },
          },
          a: t.fixture('symlink', `.vlt/${aDepID}/node_modules/a`),
          b: t.fixture('symlink', `.vlt/${bDepID}/node_modules/b`),
        },
      })

      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier({
        ...configData,
      })

      const graph = load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        modifiers,
        ...configData,
      })

      // Check that 'a' was loaded normally
      const nodeA = graph.nodes.get(aDepID)
      t.ok(nodeA, 'dependency "a" should be loaded normally')
      t.equal(nodeA?.name, 'a', 'node a has correct name')
      t.equal(nodeA?.version, '1.0.0', 'node a has correct version')

      // Check that 'b' was loaded with modified spec (2.0.0 instead of 1.0.0)
      const nodeB = graph.nodes.get(bDepID)
      t.ok(
        nodeB,
        'dependency "b" should be loaded with modified spec',
      )
      t.equal(nodeB?.name, 'b', 'node b has correct name')
      t.equal(
        nodeB?.version,
        '2.0.0',
        'node b has modified version 2.0.0',
      )
      t.equal(
        nodeB?.modifier,
        ':root > #b',
        'node b has correct modifier path',
      )

      // Check that the edge from root to 'b' has the modified spec
      const rootNode = graph.mainImporter
      const edgeToB = rootNode.edgesOut.get('b')
      t.ok(edgeToB, 'edge to b should exist')
      t.equal(
        edgeToB?.spec.bareSpec,
        '^2.0.0',
        'edge spec should be modified',
      )
      t.equal(
        edgeToB?.spec.overridden,
        true,
        'edge spec should be marked as overridden',
      )
    },
  )

  await t.test(
    'should apply modifiers for missing dependencies',
    async t => {
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'modifiers-missing-test',
          version: '1.0.0',
          dependencies: {
            missing: '^1.0.0', // This will be missing but modified
          },
        }),
        'vlt.json': JSON.stringify({
          modifiers: {
            ':root > #missing': '^2.0.0', // Override missing to use 2.0.0
          },
        }),
        // No node_modules for missing dependency
      })

      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier({
        ...configData,
      })

      const graph = load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        modifiers,
        ...configData,
      })

      // Check that the missing dependency edge has the modified spec
      const rootNode = graph.mainImporter
      const edgeToMissing = rootNode.edgesOut.get('missing')
      t.ok(edgeToMissing, 'edge to missing should exist')
      t.equal(
        edgeToMissing?.spec.bareSpec,
        '^2.0.0',
        'missing dep spec should be modified',
      )
      t.notOk(
        edgeToMissing?.to,
        'missing dep should have no target node',
      )
      t.ok(
        edgeToMissing?.spec.overridden,
        'missing dep spec should still be marked as overridden',
      )
    },
  )

  await t.test(
    'should apply modifiers when loadManifests=false',
    async t => {
      const aDepID = joinDepIDTuple(['registry', '', 'a@1.0.0'])
      const bDepID = joinDepIDTuple(['registry', '', 'b@2.0.0'])
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'modifiers-no-manifest-test',
          version: '1.0.0',
          dependencies: {
            a: '^1.0.0',
            b: '^1.0.0',
          },
        }),
        'vlt.json': JSON.stringify({
          modifiers: {
            ':root > #b': '^2.0.0',
          },
        }),
        node_modules: {
          '.vlt': {
            [aDepID]: {
              node_modules: {
                a: {
                  'package.json': JSON.stringify({
                    name: 'a',
                    version: '1.0.0',
                  }),
                },
              },
            },
            [bDepID]: {
              node_modules: {
                b: {
                  'package.json': JSON.stringify({
                    name: 'b',
                    version: '2.0.0',
                  }),
                },
              },
            },
          },
          a: t.fixture('symlink', `.vlt/${aDepID}/node_modules/a`),
          b: t.fixture('symlink', `.vlt/${bDepID}/node_modules/b`),
        },
      })

      t.chdir(projectRoot)
      unload('project')

      const modifiers = new GraphModifier({
        ...configData,
      })

      const graph = load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: false, // This is the key difference
        modifiers,
        ...configData,
      })

      // Even without loading manifests, modifiers should still apply
      const nodeA = graph.nodes.get(aDepID)
      t.ok(nodeA, 'dependency "a" should be loaded')

      const nodeB = graph.nodes.get(bDepID)
      t.ok(
        nodeB,
        'dependency "b" should be loaded with modified spec',
      )
      t.equal(
        nodeB?.modifier,
        ':root > #b',
        'node b has correct modifier path',
      )

      // Check that edges have been created
      const rootNode = graph.mainImporter
      const edgeToA = rootNode.edgesOut.get('a')
      const edgeToB = rootNode.edgesOut.get('b')
      t.ok(edgeToA, 'edge to a should exist')
      t.ok(edgeToB, 'edge to b should exist')
      t.ok(
        edgeToB?.spec.overridden,
        'edge to b should be marked as overridden',
      )
    },
  )

  await t.test('should handle nested modifier queries', async t => {
    const aDepID = joinDepIDTuple(['registry', '', 'a@1.0.0'])
    const bDepID = joinDepIDTuple(['registry', '', 'b@1.0.0'])
    const cDepID = joinDepIDTuple(['registry', '', 'c@2.0.0']) // Modified
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'modifiers-nested-test',
        version: '1.0.0',
        dependencies: {
          a: '^1.0.0',
        },
      }),
      'vlt.json': JSON.stringify({
        modifiers: {
          ':root > #a > #c': '^2.0.0', // Nested modifier
        },
      }),
      node_modules: {
        '.vlt': {
          [aDepID]: {
            node_modules: {
              a: {
                'package.json': JSON.stringify({
                  name: 'a',
                  version: '1.0.0',
                  dependencies: {
                    b: '^1.0.0',
                    c: '^1.0.0', // Will be modified
                  },
                }),
              },
              b: t.fixture(
                'symlink',
                `../../${bDepID}/node_modules/b`,
              ),
              c: t.fixture(
                'symlink',
                `../../${cDepID}/node_modules/c`,
              ),
            },
          },
          [bDepID]: {
            node_modules: {
              b: {
                'package.json': JSON.stringify({
                  name: 'b',
                  version: '1.0.0',
                }),
              },
            },
          },
          [cDepID]: {
            node_modules: {
              c: {
                'package.json': JSON.stringify({
                  name: 'c',
                  version: '2.0.0',
                }),
              },
            },
          },
        },
        a: t.fixture('symlink', `.vlt/${aDepID}/node_modules/a`),
      },
    })

    t.chdir(projectRoot)
    unload('project')

    const modifiers = new GraphModifier({
      ...configData,
    })

    const graph = load({
      scurry: new PathScurry(projectRoot),
      packageJson: new PackageJson(),
      monorepo: Monorepo.maybeLoad(projectRoot),
      projectRoot,
      loadManifests: true,
      modifiers,
      ...configData,
    })

    const nodeA = graph.nodes.get(aDepID)
    const nodeB = graph.nodes.get(bDepID)
    const nodeC = graph.nodes.get(cDepID)

    t.ok(nodeA, 'dependency "a" should be loaded')
    t.ok(nodeB, 'dependency "b" should be loaded normally')
    t.ok(nodeC, 'dependency "c" should be loaded with modified spec')

    t.equal(
      nodeA?.modifier,
      ':root > #a > #c',
      'should have correct modifier path for affected nodes',
    )
    t.equal(
      nodeC?.modifier,
      ':root > #a > #c',
      'should have correct modifier path for affected nodes',
    )

    // Check that c has the modified version
    t.equal(
      nodeC?.version,
      '2.0.0',
      'node c should have modified version',
    )

    // Check that the edge from a to c has modified spec
    const edgeToA = graph.mainImporter.edgesOut.get('a')
    const edgeToC = nodeA?.edgesOut.get('c')
    t.ok(edgeToA, 'edge from root to a should exist')
    t.notOk(
      edgeToA?.spec.overridden,
      'an edge that is not the target of a modifier should not be overridden',
    )
    t.ok(edgeToC, 'edge from a to c should exist')
    t.equal(
      edgeToC?.spec.bareSpec,
      '^2.0.0',
      'edge spec should be modified',
    )
    t.ok(
      edgeToC?.spec.overridden,
      'the target of a modifier should be overridden',
    )
  })
})

t.test('hidden lockfile', async t => {
  await t.test('should use hidden lockfile by default', async t => {
    const aDepID = joinDepIDTuple(['registry', '', 'a@1.0.0'])
    const projectRoot = t.testdir({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          a: '^1.0.0',
        },
      }),
      'vlt.json': '{}',
      node_modules: {
        '.vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: configData,
          nodes: {
            [aDepID]: [
              0,
              'a',
              null,
              null,
              null,
              {
                name: 'a',
                version: '1.0.0',
              },
            ],
          },
          edges: {
            'file:. a': `prod ^1.0.0 ${aDepID}`,
          },
        }),
        '.vlt': {
          [aDepID]: {
            node_modules: {
              a: {
                'package.json': JSON.stringify({
                  name: 'a',
                  version: '1.0.0',
                }),
              },
            },
          },
        },
        a: t.fixture('symlink', `.vlt/${aDepID}/node_modules/a`),
      },
    })

    t.chdir(projectRoot)
    unload('project')

    const graph = load({
      scurry: new PathScurry(projectRoot),
      packageJson: new PackageJson(),
      monorepo: Monorepo.maybeLoad(projectRoot),
      projectRoot,
      loadManifests: true,
      ...configData,
    })

    // Should load the node from hidden lockfile
    const nodeA = graph.nodes.get(aDepID)
    t.ok(nodeA, 'should load node from hidden lockfile')
    t.equal(nodeA?.name, 'a', 'node should have correct name')
    t.equal(
      nodeA?.version,
      '1.0.0',
      'node should have correct version',
    )
  })

  await t.test(
    'should handle missing hidden lockfile gracefully',
    async t => {
      const projectRoot = t.testdir({
        'package.json': JSON.stringify({
          name: 'test-project-3',
          version: '1.0.0',
          dependencies: {
            a: '^1.0.0',
          },
        }),
        'vlt.json': '{}',
        // No node_modules directory
      })

      t.chdir(projectRoot)
      unload('project')

      const graph = load({
        scurry: new PathScurry(projectRoot),
        packageJson: new PackageJson(),
        monorepo: Monorepo.maybeLoad(projectRoot),
        projectRoot,
        loadManifests: true,
        ...configData,
      })

      // Should create a graph with missing dependencies
      t.ok(graph, 'should create graph even without node_modules')
      t.equal(graph.nodes.size, 1, 'should contain only root node')
    },
  )
})

t.test('asStoreConfigObject', async t => {
  t.strictSame(
    asStoreConfigObject({ modifiers: { '#a': '1' } }),
    { modifiers: { '#a': '1' } },
    'should convert simple selector to store config object',
  )
  t.throws(
    () => asStoreConfigObject({ modifiers: '#a' }),
    /Expected a store config object, got/,
    'should throw on invalid selector',
  )
  t.throws(
    () => asStoreConfigObject({ foo: 'foo' }),
    /Expected a store config object, got/,
    'should throw on invalid selector',
  )
})
