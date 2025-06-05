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
