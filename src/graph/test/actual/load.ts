import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { load, getPathBasedId } from '../../src/actual/load.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import { actualGraph } from '../fixtures/actual.ts'
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

  const fullGraph = load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
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
    'should load an actual graph with cycle containing missing deps info',
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
