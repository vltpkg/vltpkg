import { DepID, DepIDTuple, joinDepIDTuple } from '@vltpkg/dep-id'
import { manifest, PackageInfoClient } from '@vltpkg/package-info'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { load as loadActual } from '../../src/actual/load.js'
import { buildIdealFromStartingGraph } from '../../src/ideal/build-ideal-from-starting-graph.js'
import {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileNode,
} from '../../src/index.js'
import { load as loadVirtual } from '../../src/lockfile/load.js'
import { humanReadableOutput } from '../../src/visualization/human-readable-output.js'

const edgeKey = (from: DepIDTuple, to: string): LockfileEdgeKey =>
  `${joinDepIDTuple(from)} ${to}`

const configData = {
  registry: 'https://registry.npmjs.org',
  registries: {
    npm: 'https://registry.npmjs.org',
    custom: 'http://example.com',
  },
} satisfies SpecOptions

const mainManifest = {
  name: 'my-project',
  version: '1.0.0',
  dependencies: {
    bar: '^1.0.0',
    foo: '^1.0.0',
    linked: 'file:./linked',
    missing: '^1.0.0',
  },
}

const bazManifest = {
  name: 'baz',
  version: '1.0.0',
}
const missingManifest = {
  name: 'missing',
  version: '1.0.0',
}
const packageInfo = {
  async manifest(spec: Spec, options?: any) {
    switch (spec.name) {
      case 'baz':
        return bazManifest
      case 'missing':
        return missingManifest
      case 'linked':
      case 'link':
        return manifest(spec, options)
      default:
        return null
    }
  },
} as PackageInfoClient

t.test('build from a virtual graph', async t => {
  const lockfileData: LockfileData = {
    registries: {
      npm: 'https://registry.npmjs.org',
      custom: 'https://registry.example.com',
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      [joinDepIDTuple(['file', 'linked'])]: [0, 'linked'],
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
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
      ],
      [joinDepIDTuple(['registry', '', 'pnpmdep@1.0.0'])]: [
        0,
        'pnpmdep',
        null,
        null,
        './node_modules/.pnpm/pnpmdep@1.0.0/node_modules/pnpmdep',
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], 'linked')]:
        'prod file:./linked ' + joinDepIDTuple(['file', 'linked']),
      [edgeKey(['file', '.'], 'foo')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      [edgeKey(['file', '.'], 'bar')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'bar@1.0.0']),
      [edgeKey(['file', '.'], 'missing')]: 'prod ^1.0.0 MISSING',
      [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'baz@1.0.0']),
      [edgeKey(['file', '.'], 'pnpmdep')]:
        'prod 1 ' + joinDepIDTuple(['registry', '', 'pnpmdep@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    linked: {
      'package.json': JSON.stringify({
        name: 'linked',
        version: '1.2.3',
      }),
    },
  })

  const virtual = loadVirtual({
    ...configData,
    projectRoot,
    mainManifest,
  })

  const graph = await buildIdealFromStartingGraph({
    ...configData,
    projectRoot,
    packageInfo,
    scurry: new PathScurry(projectRoot),
    graph: virtual,
    add: new Map([
      [
        joinDepIDTuple(['file', '.']),
        new Map([
          [
            'baz',
            { type: 'prod', spec: Spec.parse('baz', '^1.0.0') },
          ],
        ]),
      ],
    ]),
    remove: new Map([
      [joinDepIDTuple(['file', '.']), new Set(['bar'])],
    ]),
  })

  t.matchSnapshot(humanReadableOutput(graph))
})

t.test('build from an actual graph', async t => {
  const projectRoot = t.testdir({
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
                },
              }),
            },
            baz: t.fixture(
              'symlink',
              '../../' +
                joinDepIDTuple(['registry', 'custom', 'baz@1.0.0']) +
                '/node_modules/baz',
            ),
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
    'vlt-workspaces.json': JSON.stringify({
      packages: ['./packages/*'],
    }),
  })

  const actual = loadActual({
    projectRoot,
    loadManifests: true,
    ...configData,
  })

  const graph = await buildIdealFromStartingGraph({
    projectRoot,
    ...configData,
    packageInfo,
    graph: actual,
    scurry: new PathScurry(projectRoot),
    add: new Map([
      [
        joinDepIDTuple(['file', '.']),
        new Map([
          [
            'baz',
            { type: 'prod', spec: Spec.parse('baz', '^1.0.0') },
          ],
        ]),
      ],
      [
        joinDepIDTuple(['workspace', 'packages/workspace-b']),
        new Map([
          [
            'baz',
            { type: 'prod', spec: Spec.parse('baz', '^1.0.0') },
          ],
        ]),
      ],
    ]),
    remove: new Map([
      [joinDepIDTuple(['file', '.']), new Set(['bar'])],
    ]),
  })

  t.matchSnapshot(humanReadableOutput(graph))
})
