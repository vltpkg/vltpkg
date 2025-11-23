import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import t from 'tap'
import { load as loadActual } from '../../src/actual/load.ts'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../../src/dependencies.ts'
import { buildIdealFromStartingGraph } from '../../src/ideal/build-ideal-from-starting-graph.ts'
import type {
  LockfileData,
  LockfileEdgeKey,
  LockfileEdges,
  LockfileNode,
} from '../../src/index.ts'
import { load as loadVirtual } from '../../src/lockfile/load.ts'
import { objectLikeOutput } from '../../src/visualization/object-like-output.ts'
import { RollbackRemove } from '@vltpkg/rollback-remove'

const edgeKey = (from: DepIDTuple, to: string): LockfileEdgeKey =>
  `${joinDepIDTuple(from)} ${to}`

const configData = {
  registry: 'https://registry.npmjs.org/',
  registries: {
    npm: 'https://registry.npmjs.org/',
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
    pnpmdep: '^1.0.0',
  },
}

const bazManifest = {
  name: 'baz',
  version: '1.0.0',
}
const ipsumManifest = {
  name: 'ipsum',
  version: '1.0.0',
}
const missingManifest = {
  name: 'missing',
  version: '1.0.0',
}
const esbuildManifest = {
  name: 'esbuild',
  version: '0.25.11',
  optionalDependencies: {
    '@esbuild/darwin-arm64': '0.25.11',
    '@esbuild/linux-x64': '0.25.11',
    '@esbuild/win32-x64': '0.25.11',
  },
}
const esbuildDarwinArm64Manifest = {
  name: '@esbuild/darwin-arm64',
  version: '0.25.11',
  os: ['darwin'],
  cpu: ['arm64'],
  dist: {
    integrity:
      'sha512-VekY0PBCukppoQrycFxUqkCojnTQhdec0vevUL/EDOCnXd9LKWqD/bHwMPzigIJXPhC59Vd1WFIL57SKs2mg4w==',
  },
}
const esbuildLinuxX64Manifest = {
  name: '@esbuild/linux-x64',
  version: '0.25.11',
  os: ['linux'],
  cpu: ['x64'],
  dist: {
    integrity:
      'sha512-Qr8AzcplUhGvdyUF08A1kHU3Vr2O88xxP0Tm8GcdVOUm25XYcMPp2YqSVHbLuXzYQMf9Bh/iKx7YPqECs6ffLA==',
  },
}
const esbuildWin32X64Manifest = {
  name: '@esbuild/win32-x64',
  version: '0.25.11',
  os: ['win32'],
  cpu: ['x64'],
  dist: {
    integrity:
      'sha512-D7Hpz6A2L4hzsRpPaCYkQnGOotdUpDzSGRIv9I+1ITdHROSFUWW95ZPZWQmGka1Fg7W3zFJowyn9WGwMJ0+KPA==',
  },
}

const packageInfo = {
  async manifest(spec: Spec, options?: any) {
    if (spec.type === 'git') {
      return ipsumManifest
    }
    switch (spec.name) {
      case 'baz':
        return bazManifest
      case 'missing':
        return missingManifest
      case 'esbuild':
        return esbuildManifest
      case '@esbuild/darwin-arm64':
        // Only return manifest for darwin-arm64 (simulates macos as the current platform)
        return esbuildDarwinArm64Manifest
      case '@esbuild/linux-x64':
        return esbuildLinuxX64Manifest
      case '@esbuild/win32-x64':
        return esbuildWin32X64Manifest
      case 'linked':
      case 'link':
        return new PackageInfoClient(options).manifest(spec, options)
      default:
        return null
    }
  },
  async extract(): Promise<void> {},
} as unknown as PackageInfoClient

t.test('build from a virtual graph', async t => {
  const lockfileData: LockfileData = {
    lockfileVersion: 0,
    options: {
      registries: {
        npm: 'https://registry.npmjs.org/',
        custom: 'https://registry.example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['registry', '', 'foo@1.0.0'])]: [
        0,
        'foo',
        'sha512-6/mh1E2u2YgEsCHdY0Yx5oW+61gZU+1vXaoiHHrpKeuRNNgFvS+/jrwHiQhB5apAf5oB7UB7E19ol2R2LKH8hQ==',
        null,
        null,
        {
          name: 'foo',
          version: '1.0.0',
        },
      ],
      [joinDepIDTuple(['registry', '', 'bar@1.0.0'])]: [
        0,
        'bar',
        'sha512-6/deadbeef==',
        'https://registry.example.com/bar/-/bar-1.0.0.tgz',
        null,
        {
          name: 'bar',
          version: '1.0.0',
        },
      ],
      [joinDepIDTuple(['registry', '', 'baz@1.0.0'])]: [
        0,
        'baz',
        null,
        null,
        null,
        {
          name: 'baz',
          version: '1.0.0',
        },
      ],
      [joinDepIDTuple(['registry', '', 'pnpmdep@1.0.0'])]: [
        0,
        'pnpmdep',
        null,
        null,
        './node_modules/.pnpm/pnpmdep@1.0.0/node_modules/pnpmdep',
        {
          name: 'pnpmdep',
          version: '1.0.0',
        },
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], 'linked')]:
        'prod file:./linked ' + joinDepIDTuple(['file', 'linked']),
      [edgeKey(['file', '.'], 'foo')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      [edgeKey(['file', '.'], 'missing')]: 'prod ^1.0.0 MISSING',
      [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'baz@1.0.0']),
      [edgeKey(['file', '.'], 'pnpmdep')]:
        'prod 1 ' + joinDepIDTuple(['registry', '', 'pnpmdep@1.0.0']),
    } as LockfileEdges,
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt-lock.json': JSON.stringify(lockfileData),
    linked: {
      'package.json': JSON.stringify({
        name: 'linked',
        version: '1.2.3',
      }),
    },
  })
  t.chdir(projectRoot)
  unload('project')

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
          [
            String(Spec.parseArgs('github:lorem/ipsum')),
            {
              type: 'prod',
              spec: Spec.parseArgs('github:lorem/ipsum'),
            },
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap,
    remove: new Map([
      [joinDepIDTuple(['file', '.']), new Set(['bar'])],
    ]) as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(objectLikeOutput(graph))
})

t.test('add from manifest file only', async t => {
  const lockfileData: LockfileData = {
    lockfileVersion: 0,
    options: {
      registries: {
        npm: 'https://registry.npmjs.org/',
        custom: 'https://registry.example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
    } as Record<DepID, LockfileNode>,
    edges: {} as LockfileEdges,
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      baz: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'package.json': JSON.stringify(mainManifest),
  })
  t.chdir(projectRoot)
  unload('project')

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
    add: new Map() as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(objectLikeOutput(graph))
})

t.test('remove from manifest file only', async t => {
  const lockfileData: LockfileData = {
    lockfileVersion: 0,
    options: {
      registries: {
        npm: 'https://registry.npmjs.org/',
        custom: 'https://registry.example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
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
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], 'foo')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'baz@1.0.0']),
    } as LockfileEdges,
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {},
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'package.json': JSON.stringify(mainManifest),
    linked: {
      'package.json': JSON.stringify({
        name: 'linked',
        version: '1.2.3',
      }),
    },
  })
  t.chdir(projectRoot)
  unload('project')

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
    add: new Map() as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(objectLikeOutput(graph))
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
    'vlt.json': JSON.stringify({
      workspaces: {
        packages: ['./packages/*'],
      },
    }),
  })
  t.chdir(projectRoot)
  unload('project')

  const actual = loadActual({
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    monorepo: Monorepo.maybeLoad(projectRoot),
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
      // adding an already present version of baz from the custom registry
      [
        joinDepIDTuple(['file', '.']),
        new Map([
          [
            'baz',
            {
              type: 'prod',
              spec: Spec.parse(
                'baz',
                'custom:baz@^1.0.0',
                configData,
              ),
            },
          ],
        ]),
      ],
      // this version of baz being added to workspace-b is going to
      // use the default registry, unlike the other versions that
      // were using the custom registry origin/protocol named `custom`
      [
        joinDepIDTuple(['workspace', 'packages/workspace-b']),
        new Map([
          [
            'baz',
            {
              type: 'prod',
              spec: Spec.parse('baz', '^1.0.0', configData),
            },
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap,
    remove: new Map([
      [joinDepIDTuple(['file', '.']), new Set(['bar'])],
    ]) as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(objectLikeOutput(graph))
})

t.test('optional subdeps binary distribution strategy', async t => {
  const lockfileData: LockfileData = {
    lockfileVersion: 0,
    options: {},
    nodes: {} as Record<DepID, LockfileNode>,
    edges: {} as LockfileEdges,
  }
  const mainManifest = {
    name: 'test-optional-strat',
    version: '1.0.0',
    dependencies: {
      esbuild: '*',
    },
  }
  const projectRoot = t.testdir({
    'vlt-lock.json': JSON.stringify(lockfileData),
    'package.json': JSON.stringify(mainManifest),
  })
  t.chdir(projectRoot)
  unload('project')

  const actual = loadActual({
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    monorepo: Monorepo.maybeLoad(projectRoot),
    projectRoot,
    loadManifests: true,
    ...configData,
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
    actual,
    graph: virtual,
    add: new Map() as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(objectLikeOutput(graph))
})
