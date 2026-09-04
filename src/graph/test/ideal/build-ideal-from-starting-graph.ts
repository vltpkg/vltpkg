import type { DepID, DepIDTuple } from '@vltpkg/dep-id'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import {
  parse as parseVersion,
  satisfies as satisfiesVersion,
} from '@vltpkg/semver'
import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
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
import { Graph } from '../../src/graph.ts'
import { load as loadVirtual } from '../../src/lockfile/load.ts'
import { lockfileData } from '../../src/lockfile/save.ts'
import { updatePackageJson } from '../../src/reify/update-importers-package-json.ts'
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
  async extract(): Promise<{ integrity: string; resolved: string }> {
    return {
      integrity:
        'sha512-00000000000000000000000000000000000000000000000000000000000000000000000000000000000000==',
      resolved: 'https://example.com/remote-pkg-1.0.0.tgz',
    }
  },
} as unknown as PackageInfoClient

t.test('build from a virtual graph', async t => {
  const lockfileData: LockfileData = {
    lockfileVersion: 1,
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
          dependencies: {
            baz: '^1.0.0',
          },
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
      [edgeKey(['file', '.'], 'bar')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'bar@1.0.0']),
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

  // add a new root --> baz dep
  // removes the root --> bar dep
  const graph = await buildIdealFromStartingGraph({
    ...configData,
    packageInfo,
    packageJson: new PackageJson(),
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
    lockfileVersion: 1,
    options: {
      registries: {
        npm: 'https://registry.npmjs.org/',
        custom: 'https://registry.example.com',
      },
    },
    nodes: {
      [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
    } as Record<DepID, LockfileNode>,
    edges: {},
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
    packageInfo,
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    graph: virtual,
    add: new Map() as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(objectLikeOutput(graph))
})

t.test(
  'merges manifest-discovered deps into an existing add map',
  async t => {
    const lockfileData: LockfileData = {
      lockfileVersion: 1,
      options: {
        registries: {
          npm: 'https://registry.npmjs.org/',
        },
      },
      nodes: {
        [joinDepIDTuple(['file', '.'])]: [0, 'my-project'],
      } as Record<DepID, LockfileNode>,
      edges: {},
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
      packageInfo,
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      graph: virtual,
      add: new Map([
        [
          joinDepIDTuple(['file', '.']),
          new Map([
            [
              'missing',
              {
                type: 'prod',
                spec: Spec.parse('missing', '^1.0.0'),
              },
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap,
      remove: new Map() as RemoveImportersDependenciesMap,
      remover: new RollbackRemove(),
    })

    t.ok(
      graph.mainImporter.edgesOut.get('baz')?.to,
      'manifest-discovered baz is merged into the user add map',
    )
    t.ok(
      graph.mainImporter.edgesOut.get('missing')?.to,
      'user-added missing is kept',
    )
  },
)

t.test('remove from manifest file only', async t => {
  const lockfileData: LockfileData = {
    lockfileVersion: 1,
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
          dependencies: {
            baz: '^1.0.0',
          },
        },
      ],
    } as Record<DepID, LockfileNode>,
    edges: {
      [edgeKey(['file', '.'], 'foo')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'foo@1.0.0']),
      [edgeKey(['file', '.'], 'bar')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'bar@1.0.0']),
      [edgeKey(['registry', '', 'bar@1.0.0'], 'baz')]:
        'prod ^1.0.0 ' +
        joinDepIDTuple(['registry', '', 'baz@1.0.0']),
    } as LockfileEdges,
  }
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      foo: '^1.0.0',
      // "bar" was manually removed from the importer manifest file!
    },
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
    packageInfo,
    packageJson: new PackageJson(),
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
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    monorepo: Monorepo.maybeLoad(projectRoot),
    loadManifests: true,
    ...configData,
  })

  const graph = await buildIdealFromStartingGraph({
    ...configData,
    packageInfo,
    packageJson: new PackageJson(),
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
    lockfileVersion: 1,
    options: {},
    nodes: {},
    edges: {},
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
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    monorepo: Monorepo.maybeLoad(projectRoot),
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
    packageInfo,
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    actual,
    graph: virtual,
    add: new Map() as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  t.matchSnapshot(objectLikeOutput(graph))
})

t.test('early-extracts peer node and moves store dir', async t => {
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: { ui: '^1.0.0' },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  const scurry = new PathScurry(projectRoot)
  const packageJson = new PackageJson()
  const actual = new Graph({
    projectRoot,
    mainManifest,
    ...configData,
  })
  const starting = new Graph({
    projectRoot,
    mainManifest,
    ...configData,
  })

  const packageInfo = {
    async manifest(spec: Spec) {
      if (spec.name === 'ui') {
        return {
          name: 'ui',
          version: '1.0.0',
          peerDependencies: { react: '^18' },
        }
      }
      if (spec.name === 'react') {
        return { name: 'react', version: '18.0.0' }
      }
      return null
    },
    async extract(_spec: Spec, target: string) {
      mkdirSync(target, { recursive: true })
      writeFileSync(
        join(target, 'package.json'),
        JSON.stringify({ name: 'extracted' }),
      )
      return {
        integrity: 'sha512-abc==',
        resolved: 'https://example.com/ui.tgz',
      }
    },
  } as unknown as PackageInfoClient

  const graph = await buildIdealFromStartingGraph({
    ...configData,
    packageInfo,
    packageJson,
    scurry,
    actual,
    graph: starting,
    add: new Map() as AddImportersDependenciesMap,
    remove: new Map() as RemoveImportersDependenciesMap,
    remover: new RollbackRemove(),
  })

  const ui = [...graph.nodes.values()].find(n => n.name === 'ui')
  t.ok(ui?.peerSetHash)
  t.match(ui?.peerSetHash, /^peer\.[0-9a-f]{16}$/)
  t.equal(ui?.extracted, true)
  t.ok(
    ui && existsSync(ui.resolvedLocation(scurry)),
    'package dir is at the canonical id',
  )

  const store = join(projectRoot, 'node_modules/.vlt')
  const dirs = readdirSync(store).filter(
    d => d !== 'vlt.json' && !d.startsWith('.'),
  )
  t.ok(
    dirs.every(d => graph.nodes.has(d as DepID)),
    'no leftover provisional store dirs',
  )
})

t.test(
  'rebuild without node_modules keeps locked versions',
  async t => {
    // fresh clone + `vlt install newpkg`: the lockfile-only rebuild must
    // serialize exactly like the one backed by a hidden lockfile
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        cfoo: 'custom:foo@^1.0.0',
        foo: '^1.0.0',
        ui: '^1.0.0',
      },
    }
    const projectRoot = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      'vlt.json': '{}',
    })
    t.chdir(projectRoot)
    unload('project')

    const manifests: Record<string, Record<string, Manifest>> = {
      foo: {
        '1.0.0': { name: 'foo', version: '1.0.0' },
        '1.5.0': { name: 'foo', version: '1.5.0' },
      },
      ui: {
        '1.0.0': {
          name: 'ui',
          version: '1.0.0',
          peerDependencies: { react: '^18' },
        },
        '1.5.0': {
          name: 'ui',
          version: '1.5.0',
          peerDependencies: { react: '^18' },
        },
      },
      react: {
        '18.0.0': { name: 'react', version: '18.0.0' },
        '18.3.0': { name: 'react', version: '18.3.0' },
      },
      newpkg: { '1.0.0': { name: 'newpkg', version: '1.0.0' } },
    }
    // exact specs answer their version; ranges answer the oldest while
    // seeding the lockfile and the newest afterwards, so any range fetch
    // that leaks through the locked path shows up as a diff
    const mock = (pick: 'oldest' | 'newest') => {
      const calls: string[] = []
      const packageInfo = {
        async manifest(spec: Spec) {
          calls.push(String(spec))
          const versions = manifests[spec.final.name]
          /* c8 ignore next */
          if (!versions) return null
          const exact = parseVersion(spec.final.semver ?? '')
          const version =
            exact ? String(exact)
            : pick === 'oldest' ? Object.keys(versions)[0]
            : Object.keys(versions).at(-1)
          return versions[String(version)]
        },
      } as unknown as PackageInfoClient
      return { calls, packageInfo }
    }

    const common = {
      ...configData,
      projectRoot,
      mainManifest,
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      remove: new Map() as RemoveImportersDependenciesMap,
    }
    const rootId = joinDepIDTuple(['file', '.'])
    const addNewpkg = () =>
      new Map([
        [
          rootId,
          new Map([
            [
              'newpkg',
              {
                type: 'prod',
                spec: Spec.parse('newpkg', '^1.0.0', configData),
              },
            ],
          ]),
        ],
      ]) as AddImportersDependenciesMap

    const seed = await buildIdealFromStartingGraph({
      ...common,
      packageInfo: mock('oldest').packageInfo,
      graph: new Graph({ projectRoot, mainManifest, ...configData }),
      add: new Map() as AddImportersDependenciesMap,
      remover: new RollbackRemove(),
    })
    const mainData = lockfileData({ ...configData, graph: seed })
    const hiddenData = lockfileData({
      ...configData,
      graph: seed,
      saveManifests: true,
    })
    t.match(
      Object.keys(mainData.nodes).sort(),
      [
        joinDepIDTuple(['registry', 'custom', 'foo@1.0.0']),
        joinDepIDTuple(['registry', 'npm', 'foo@1.0.0']),
        joinDepIDTuple(['registry', 'npm', 'react@18.0.0']),
        /^~npm~ui@1\.0\.0~peer\.[0-9a-f]{16}$/,
      ],
      'seeded lockfile holds the oldest satisfying versions',
    )

    const rebuild = async (withActual: boolean) => {
      const actual =
        withActual ?
          loadVirtual({
            ...common,
            lockfileData: structuredClone(hiddenData),
          })
        : undefined
      const graph = loadVirtual({
        ...common,
        lockfileData: structuredClone(mainData),
        actual,
      })
      const { calls, packageInfo } = mock('newest')
      const ideal = await buildIdealFromStartingGraph({
        ...common,
        packageInfo,
        graph,
        add: addNewpkg(),
        remover: new RollbackRemove(),
      })
      return {
        calls,
        data: lockfileData({ ...configData, graph: ideal }),
      }
    }

    const backed = await rebuild(true)
    const lockOnly = await rebuild(false)

    t.strictSame(
      backed.calls,
      ['newpkg@^1.0.0'],
      'actual-backed reuses',
    )
    t.strictSame(
      lockOnly.calls.sort(),
      [
        'cfoo@custom:foo@1.0.0',
        'foo@1.0.0',
        'newpkg@^1.0.0',
        'react@18.0.0',
        'ui@1.0.0',
      ],
      'lockfile-only pins every pre-existing node',
    )
    t.strictSame(
      lockOnly.data,
      backed.data,
      'lockfile-only rebuild serializes identically',
    )
    t.strictSame(
      Object.keys(lockOnly.data.nodes).sort(),
      [
        ...Object.keys(mainData.nodes),
        joinDepIDTuple(['registry', '', 'newpkg@1.0.0']),
      ].sort(),
      'only the added package is new',
    )
  },
)

t.test('rebuilds do not flip a peer edge across forks', async t => {
  // regression: a forked context used to inherit the parent context's
  // dependents, so placing `p@^1.5` inside the fork re-pointed `r`'s peer
  // edge, which lives in the parent context. Each rebuild then alternated
  // between the two resolutions.
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: {
      q: '^1.0.0',
      r: '^1.0.0',
      s: '^1.0.0',
      w: '^1.0.0',
    },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  const manifests: Record<string, Record<string, Manifest>> = {
    p: {
      '1.5.0': { name: 'p', version: '1.5.0' },
      '2.0.1': { name: 'p', version: '2.0.1' },
    },
    q: {
      '1.0.0': { name: 'q', version: '1.0.0' },
      '2.0.0': { name: 'q', version: '2.0.0' },
    },
    // the dependent whose peer edge lives in the root context
    r: {
      '1.0.0': {
        name: 'r',
        version: '1.0.0',
        peerDependencies: { p: '^1 || ^2' },
      },
    },
    // s -> f forks the root context (q@^2 vs the root's q@^1) without
    // naming p, so the fork inherits the root's p entry
    s: {
      '1.0.0': {
        name: 's',
        version: '1.0.0',
        dependencies: { f: '^1.0.0' },
      },
    },
    f: {
      '1.0.0': {
        name: 'f',
        version: '1.0.0',
        dependencies: { h: '^1.0.0' },
        peerDependencies: { q: '^2' },
      },
    },
    // h places p@1.5.0 inside the fork, after the fork was created
    h: {
      '1.0.0': {
        name: 'h',
        version: '1.0.0',
        dependencies: { p: '^1.5' },
      },
    },
    // w -> v -> pp adds p@^2.0.1 to the root context, after the fork
    w: {
      '1.0.0': {
        name: 'w',
        version: '1.0.0',
        dependencies: { v: '^1.0.0' },
      },
    },
    v: {
      '1.0.0': {
        name: 'v',
        version: '1.0.0',
        dependencies: { pp: '^1.0.0' },
      },
    },
    pp: {
      '1.0.0': {
        name: 'pp',
        version: '1.0.0',
        dependencies: { p: '^2.0.1' },
      },
    },
    x: { '1.0.0': { name: 'x', version: '1.0.0' } },
    y: { '1.0.0': { name: 'y', version: '1.0.0' } },
  }
  const packageInfo = {
    async manifest(spec: Spec) {
      const versions = manifests[spec.final.name]
      /* c8 ignore next */
      if (!versions) return null
      const bareSpec = spec.final.bareSpec || '*'
      return versions[
        String(
          Object.keys(versions)
            .filter(v => satisfiesVersion(v, bareSpec))
            .at(-1),
        )
      ]
    },
  } as unknown as PackageInfoClient

  const common = {
    ...configData,
    projectRoot,
    mainManifest,
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    remove: new Map() as RemoveImportersDependenciesMap,
  }
  const rootId = joinDepIDTuple(['file', '.'])
  const add = (name: string) =>
    new Map([
      [
        rootId,
        new Map([
          [
            name,
            {
              type: 'prod',
              spec: Spec.parse(name, '^1.0.0', configData),
            },
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap

  const peerTarget = (graph: Graph) => {
    const to = [...graph.nodes.values()]
      .find(n => n.name === 'r')
      ?.edgesOut.get('p')?.to
    return `${to?.name}@${to?.version}`
  }

  const seed = await buildIdealFromStartingGraph({
    ...common,
    packageInfo,
    graph: new Graph({ projectRoot, mainManifest, ...configData }),
    add: new Map() as AddImportersDependenciesMap,
    remover: new RollbackRemove(),
  })
  t.equal(
    peerTarget(seed),
    'p@2.0.1',
    'from scratch: r resolves the newest p',
  )

  let data = lockfileData({ ...configData, graph: seed })
  const lockfiles: Record<string, unknown>[] = []
  for (const pkg of ['x', 'y']) {
    const ideal = await buildIdealFromStartingGraph({
      ...common,
      packageInfo,
      graph: loadVirtual({
        ...common,
        lockfileData: structuredClone(data),
      }),
      add: add(pkg),
      remover: new RollbackRemove(),
    })
    t.equal(
      peerTarget(ideal),
      'p@2.0.1',
      `after adding ${pkg}: r keeps p@2.0.1`,
    )
    data = lockfileData({ ...configData, graph: ideal })
    lockfiles.push(data.nodes)
  }

  t.strictSame(
    Object.keys(lockfiles[1]!).filter(
      k => !Object.keys(lockfiles[0]!).includes(k),
    ),
    [joinDepIDTuple(['registry', '', 'y@1.0.0'])],
    'the second rebuild only adds the new package',
  )
})

t.test('peer dep lands on the copy matching its parent', async t => {
  // regression: `l` declares react in devDependencies, which a registry dep
  // never installs. checkPeerEdgesCompatible used to read that declaration as
  // "the parent resolves its own react", skip the context check and reuse
  // `w1`'s copy of `u`, whose react (19.2.8) differs from `l`'s (19.2.5).
  const mainManifest = { name: 'my-project', version: '1.0.0' }
  const w1 = {
    name: 'w1',
    version: '1.0.0',
    dependencies: { react: '19.2.8', s: '^1.0.0' },
  }
  const w2 = {
    name: 'w2',
    version: '1.0.0',
    dependencies: { react: '19.2.5', l: '^1.0.0' },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    packages: {
      w1: { 'package.json': JSON.stringify(w1) },
      w2: { 'package.json': JSON.stringify(w2) },
    },
    'vlt.json': JSON.stringify({
      workspaces: { packages: ['./packages/*'] },
    }),
  })
  t.chdir(projectRoot)
  unload('project')

  const manifests: Record<string, Record<string, Manifest>> = {
    react: {
      '19.2.5': { name: 'react', version: '19.2.5' },
      '19.2.8': { name: 'react', version: '19.2.8' },
    },
    u: {
      '1.0.0': {
        name: 'u',
        version: '1.0.0',
        peerDependencies: { react: '^19' },
      },
    },
    l: {
      '1.0.0': {
        name: 'l',
        version: '1.0.0',
        dependencies: { u: '^1.0.0' },
        devDependencies: { react: '19.1.0' },
        peerDependencies: { react: '^19' },
      },
    },
    s: {
      '1.0.0': {
        name: 's',
        version: '1.0.0',
        dependencies: { u: '^1.0.0' },
      },
    },
    x: { '1.0.0': { name: 'x', version: '1.0.0' } },
  }
  const packageInfo = {
    async manifest(spec: Spec) {
      const versions = manifests[spec.final.name]
      /* c8 ignore next */
      if (!versions) return null
      const bareSpec = spec.final.bareSpec || '*'
      return versions[
        String(
          Object.keys(versions)
            .filter(v => satisfiesVersion(v, bareSpec))
            .at(-1),
        )
      ]
    },
  } as unknown as PackageInfoClient

  const common = {
    ...configData,
    projectRoot,
    mainManifest,
    packageJson: new PackageJson(),
    scurry: new PathScurry(projectRoot),
    monorepo: Monorepo.maybeLoad(projectRoot),
    remove: new Map() as RemoveImportersDependenciesMap,
  }

  const check = (graph: Graph, label: string) => {
    const l = [...graph.nodes.values()].find(n => n.name === 'l')
    const u = l?.edgesOut.get('u')?.to
    t.equal(
      u?.edgesOut.get('react')?.to?.id,
      l?.edgesOut.get('react')?.to?.id,
      `${label}: l and its u share one react`,
    )
    t.equal(u?.edgesOut.get('react')?.to?.version, '19.2.5', label)
  }

  const seed = await buildIdealFromStartingGraph({
    ...common,
    packageInfo,
    graph: new Graph({
      projectRoot,
      mainManifest,
      ...configData,
      monorepo: common.monorepo,
    }),
    add: new Map() as AddImportersDependenciesMap,
    remover: new RollbackRemove(),
  })
  check(seed, 'from scratch')

  const ideal = await buildIdealFromStartingGraph({
    ...common,
    packageInfo,
    graph: loadVirtual({
      ...common,
      lockfileData: lockfileData({ ...configData, graph: seed }),
    }),
    add: new Map([
      [
        joinDepIDTuple(['workspace', 'packages/w2']),
        new Map([
          [
            'x',
            {
              type: 'prod',
              spec: Spec.parse('x', '^1.0.0', configData),
            },
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap,
    remover: new RollbackRemove(),
  })
  check(ideal, 'after an unrelated add')
})

t.test('an explicit dist-tag add resolves and settles', async t => {
  // regression: `vlt i foo@latest` reused the locked foo@1.0.0 because a
  // dist-tag satisfies any version, and then stored `latest` on the edge
  const mainManifest = {
    name: 'my-project',
    version: '1.0.0',
    dependencies: { bar: '^1.0.0', foo: '^1.0.0' },
  }
  const projectRoot = t.testdir({
    'package.json': JSON.stringify(mainManifest),
    'vlt.json': '{}',
  })
  t.chdir(projectRoot)
  unload('project')

  const versions: Record<string, Manifest> = {
    '1.0.0': { name: 'foo', version: '1.0.0' },
    '2.0.0': { name: 'foo', version: '2.0.0' },
  }
  const packageInfo = {
    async manifest(spec: Spec) {
      if (spec.final.name === 'bar') {
        return {
          name: 'bar',
          version: '1.0.0',
          dependencies: { foo: '^1.0.0' },
        }
      }
      if (spec.final.distTag) return versions['2.0.0']
      return versions[
        String(
          Object.keys(versions)
            .filter(v =>
              satisfiesVersion(v, spec.final.bareSpec || '*'),
            )
            .at(-1),
        )
      ]
    },
  } as unknown as PackageInfoClient

  const packageJson = new PackageJson()
  const common = {
    ...configData,
    projectRoot,
    mainManifest,
    packageJson,
    scurry: new PathScurry(projectRoot),
    remove: new Map() as RemoveImportersDependenciesMap,
    packageInfo,
  }
  const rootId = joinDepIDTuple(['file', '.'])
  const add = () =>
    Object.assign(
      new Map([
        [
          rootId,
          new Map([
            [
              'foo',
              {
                type: 'prod',
                spec: Spec.parse('foo', 'latest', configData),
              },
            ],
          ]),
        ],
      ]),
      { modifiedDependencies: true },
    ) as AddImportersDependenciesMap

  const seed = await buildIdealFromStartingGraph({
    ...common,
    graph: new Graph({ projectRoot, mainManifest, ...configData }),
    add: new Map() as AddImportersDependenciesMap,
    remover: new RollbackRemove(),
  })
  t.equal(
    seed.mainImporter.edgesOut.get('foo')?.to?.version,
    '1.0.0',
    'seeded with the range resolution',
  )

  const upgraded = await buildIdealFromStartingGraph({
    ...common,
    graph: loadVirtual({
      ...common,
      lockfileData: structuredClone(
        lockfileData({ ...configData, graph: seed }),
      ),
    }),
    add: add(),
    remover: new RollbackRemove(),
  })
  t.equal(
    upgraded.mainImporter.edgesOut.get('foo')?.to?.version,
    '2.0.0',
    'the tag was resolved',
  )
  t.equal(
    [...upgraded.nodes.values()]
      .find(n => n.name === 'bar')
      ?.edgesOut.get('foo')?.to?.version,
    '1.0.0',
    'the transitive range keeps its copy',
  )

  updatePackageJson({ add: add(), graph: upgraded, packageJson })
  t.equal(mainManifest.dependencies.foo, '^2.0.0')
  const data = lockfileData({ ...configData, graph: upgraded })
  t.match(data.edges[edgeKey(['file', '.'], 'foo')], 'prod ^2.0.0')

  // re-running the same add on the settled result is a fixpoint
  const again = await buildIdealFromStartingGraph({
    ...common,
    graph: loadVirtual({
      ...common,
      lockfileData: structuredClone(data),
    }),
    add: add(),
    remover: new RollbackRemove(),
  })
  t.equal(again.lockfileStale, false, 'a user entry is never healed')
  updatePackageJson({ add: add(), graph: again, packageJson })
  t.strictSame(
    lockfileData({ ...configData, graph: again }),
    data,
    'byte-identical lockfile',
  )
})

t.test(
  'a stale importer edge spec is healed from package.json',
  async t => {
    // a lockfile written by a released vlt can carry `prod latest` next to
    // a package.json range; the text is healed in place, without a rebuild
    const mainManifest = {
      name: 'my-project',
      version: '1.0.0',
      dependencies: { foo: '^1.0.0' },
    }
    const projectRoot = t.testdir({
      'package.json': JSON.stringify(mainManifest),
      'vlt.json': '{}',
    })
    t.chdir(projectRoot)
    unload('project')

    const fooId = joinDepIDTuple(['registry', '', 'foo@1.0.0'])
    const lockfileData: LockfileData = {
      lockfileVersion: 1,
      options: configData,
      nodes: {
        [fooId]: [
          0,
          'foo',
          null,
          null,
          null,
          { name: 'foo', version: '1.0.0' },
        ],
      } as unknown as Record<DepID, LockfileNode>,
      edges: {
        [edgeKey(['file', '.'], 'foo')]: `prod latest ${fooId}`,
      } as LockfileEdges,
    }

    const packageInfo = {
      async manifest(spec: Spec) {
        throw new Error(`unexpected manifest fetch: ${spec}`)
      },
    } as unknown as PackageInfoClient

    const common = {
      ...configData,
      projectRoot,
      mainManifest,
      packageJson: new PackageJson(),
      scurry: new PathScurry(projectRoot),
      remove: new Map() as RemoveImportersDependenciesMap,
      packageInfo,
    }
    const run = async (bareSpec: string) => {
      const data = structuredClone(lockfileData)
      data.edges[edgeKey(['file', '.'], 'foo')] =
        `prod ${bareSpec} ${fooId}`
      return buildIdealFromStartingGraph({
        ...common,
        graph: loadVirtual({ ...common, lockfileData: data }),
        add: new Map() as AddImportersDependenciesMap,
        remover: new RollbackRemove(),
      })
    }

    const healed = await run('latest')
    t.equal(
      healed.mainImporter.edgesOut.get('foo')?.spec.bareSpec,
      '^1.0.0',
      'the edge carries the package.json value',
    )
    t.equal(healed.lockfileStale, true, 'flagged for saving')
    t.equal(healed.nodes.size, 2, 'no node was added or removed')

    const untouched = await run('^1.0.0')
    t.equal(
      untouched.lockfileStale,
      false,
      'equal specs are not stale',
    )
  },
)
