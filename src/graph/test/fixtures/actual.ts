import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageJson } from '@vltpkg/package-json'
import type { SpecOptions } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import type { Test } from 'tap'
import { load } from '../../src/actual/load.ts'
import type { Graph } from '../../src/graph.ts'

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    custom: 'http://example.com',
    npm: 'https://registry.npmjs.org/',
  },
} satisfies SpecOptions

export const actualGraph = (t: Test): string =>
  t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        '@scoped/a': '^1.0.0',
        '@scoped/b': '^1.0.0',
        foo: '^1.0.0',
        bar: '^1.0.0',
        link: 'file:./linked',
        missing: '^1.0.0',
      },
      bundleDependencies: ['bundled'],
      optionalDependencies: {
        bar: '^1.0.0',
      },
      devDependencies: {
        aliased: 'custom:foo@^1.0.0',
      },
    }),
    linked: {
      'package.json': JSON.stringify({
        name: 'linked',
        version: '1.0.0',
      }),
    },
    node_modules: {
      '.vlt': {
        [joinDepIDTuple(['registry', '', '@scoped/a@1.0.0'])]: {
          node_modules: {
            '@scoped': {
              a: {
                'package.json': JSON.stringify({
                  name: '@scoped/a',
                  version: '1.0.0',
                  dependencies: {
                    bundled: '2.3.4',
                  },
                  bundleDependencies: ['bundled'],
                }),
              },
            },
          },
        },
        [joinDepIDTuple(['registry', '', '@scoped/b@1.0.0'])]: {
          node_modules: {
            '@scoped': {
              b: {
                'package.json': JSON.stringify({
                  name: '@scoped/b',
                  version: '1.0.0',
                  dependencies: {
                    '@scoped/c': '^1.0.0',
                  },
                  bundleDependencies: [
                    'not',
                    'string array',
                    { so: 'this is ignored' },
                  ],
                }),
              },
              c: t.fixture(
                'symlink',
                '../../../../.vlt/' +
                  joinDepIDTuple([
                    'registry',
                    '',
                    '@scoped/c@1.0.0',
                  ]) +
                  '/node_modules/@scoped/c',
              ),
            },
          },
        },
        [joinDepIDTuple(['registry', '', '@scoped/c@1.0.0'])]: {
          node_modules: {
            '@scoped': {
              c: {
                'package.json': JSON.stringify({
                  name: '@scoped/c',
                  version: '1.0.0',
                }),
              },
            },
          },
        },
        [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: {
          node_modules: {
            bar: {
              'package.json': JSON.stringify({
                name: 'bar',
                version: '1.0.0',
                dependencies: {
                  baz: 'custom:baz@^1.0.0',
                  blooo: '1',
                },
              }),
            },
            baz: t.fixture(
              'symlink',
              '../../' +
                joinDepIDTuple(['registry', 'custom', 'baz@1.0.0']) +
                '/node_modules/baz',
            ),
            blooo: t.fixture(
              'symlink',
              '../../' +
                joinDepIDTuple(['registry', '', 'blooo@1.0.0']) +
                '/node_modules/blooo',
            ),
          },
        },
        [joinDepIDTuple(['registry', '', 'blooo@1.0.0'])]: {
          node_modules: {
            blooo: {
              'package.json': JSON.stringify({
                name: 'blooo',
                version: '1.0.0',
              }),
            },
          },
        },
        [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: {
          node_modules: {
            foo: {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '1.0.0',
              }),
            },
          },
        },
        [joinDepIDTuple(['registry', '', 'ipsum@1.0.0'])]: {
          node_modules: {
            ipsum: {
              'package.json': JSON.stringify({
                name: 'ipsum',
                version: '1.0.0',
              }),
            },
          },
        },
        [joinDepIDTuple(['registry', '', 'extraneous@1.0.0'])]: {
          node_modules: {
            extraneous: {
              'package.json': JSON.stringify({
                name: 'extraneous',
                version: '1.0.0',
              }),
            },
          },
        },
        [joinDepIDTuple(['registry', 'custom', 'baz@1.0.0'])]: {
          node_modules: {
            baz: {
              'package.json': JSON.stringify({
                name: 'baz',
                version: '1.0.0',
              }),
            },
          },
        },
        [joinDepIDTuple(['registry', 'custom', 'foo@1.0.0'])]: {
          node_modules: {
            foo: {
              'package.json': JSON.stringify({
                name: 'foo',
                version: '1.0.0',
              }),
            },
          },
        },
      },
      '@scoped': {
        a: t.fixture(
          'symlink',
          '../.vlt/' +
            joinDepIDTuple(['registry', '', '@scoped/a@1.0.0']) +
            '/node_modules/@scoped/a',
        ),
        b: t.fixture(
          'symlink',
          '../.vlt/' +
            joinDepIDTuple(['registry', '', '@scoped/b@1.0.0']) +
            '/node_modules/@scoped/b',
        ),
      },
      aliased: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', 'custom', 'foo@1.0.0']) +
          '/node_modules/foo',
      ),
      bar: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', '', 'bar@1.0.0']) +
          '/node_modules/bar',
      ),
      // This should be ignored when traversing the file system
      broken_symlink: t.fixture('symlink', './link-to-nowhere'),
      extraneous: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', '', 'extraneous@1.0.0']) +
          '/node_modules/extraneous',
      ),
      foo: t.fixture(
        'symlink',
        '.vlt/' +
          joinDepIDTuple(['registry', '', 'foo@1.0.0']) +
          '/node_modules/foo',
      ),
      link: t.fixture('symlink', '../linked'),
    },
    packages: {
      'workspace-a': {
        'package.json': JSON.stringify({
          name: 'workspace-a',
          version: '1.0.0',
          devDependencies: {
            foo: '^1.0.0',
            ipsum: '^1.0.0',
            'workspace-b': 'workspace:*',
          },
        }),
        node_modules: {
          foo: t.fixture(
            'symlink',
            '../../../node_modules/.vlt/' +
              joinDepIDTuple(['registry', '', 'foo@1.0.0']) +
              '/node_modules/foo',
          ),
          ipsum: t.fixture(
            'symlink',
            '../../../node_modules/.vlt/' +
              joinDepIDTuple(['registry', '', 'ipsum@1.0.0']) +
              '/node_modules/ipsum',
          ),
          'workspace-b': t.fixture('symlink', '../../workspace-b'),
        },
      },
      'workspace-b': {
        'package.json': JSON.stringify({
          name: 'workspace-b',
          version: '1.0.0',
        }),
      },
    },
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
  })

export const loadActualGraph = (t: Test): Graph => {
  const projectRoot = actualGraph(t)
  t.chdir(projectRoot)
  unload('project')
  return load({
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    monorepo: Monorepo.maybeLoad(projectRoot),
    loadManifests: true,
    skipHiddenLockfile: false,
    ...configData,
  })
}
