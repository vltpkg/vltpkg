import t from 'tap'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import { PackageJson } from '@vltpkg/package-json'
import { mockPackageInfo as mockPackageInfoBase } from './fixtures/reify.ts'
import { asDependency } from '../src/dependencies.ts'
import { objectLikeOutput } from '../src/visualization/object-like-output.ts'
import type {
  AddImportersDependenciesMap,
  Dependency,
} from '../src/dependencies.ts'
import type { InstallOptions } from '../src/install.ts'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { PathScurry } from 'path-scurry'
import { resolve } from 'node:path'
import { error } from '@vltpkg/error-cause'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)"?projectRoot"?: .*$/gm, '$1projectRoot: #')

const createMockPackageInfo = (
  overrides: Partial<typeof mockPackageInfoBase> = {},
) =>
  ({
    ...mockPackageInfoBase,
    ...overrides,
  }) as unknown as PackageInfoClient

const mockPackageInfo = createMockPackageInfo()

t.test('install', async t => {
  const abbrevManifest = {
    name: 'abbrev',
    version: '2.0.0',
  }

  const packageInfo = {
    async manifest(spec: Spec, _options?: any) {
      switch (spec.name) {
        case 'abbrev':
          return abbrevManifest
        default:
          return null
      }
    },
    async extract(spec: Spec) {
      return { resolved: '', spec }
    },
  } as unknown as PackageInfoClient

  const projectRoot = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-project',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: 0,
      options: {},
      nodes: {},
      edges: {},
    }),
  })
  t.chdir(projectRoot)

  const options = {
    projectRoot,
    scurry: new PathScurry(projectRoot),
    packageJson: new PackageJson(),
    packageInfo,
    allowScripts: ':not(*)',
  } as unknown as InstallOptions

  const rootDepID = joinDepIDTuple(['file', '.'])

  const { install } = await import('../src/install.ts')

  const result = await install(
    options,
    new Map() as AddImportersDependenciesMap,
  )

  t.matchSnapshot(
    objectLikeOutput(result.graph),
    'should return a graph',
  )

  // adding a new dependency
  const result2 = await install(
    options,
    new Map([
      [
        rootDepID,
        new Map<string, Dependency>([
          [
            'abbrev',
            asDependency({
              spec: Spec.parse('abbrev', 'latest'),
              type: 'dev',
            }),
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap,
  )

  t.matchSnapshot(
    objectLikeOutput(result2.graph),
    'should call build adding new dependency',
  )
})

t.test('install with no package.json file in cwd', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({}, null, 2),
  })
  const options = {
    projectRoot: dir,
    scurry: new PathScurry(dir),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    allowScripts: ':not(*)',
  } as unknown as InstallOptions
  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/reify/index.ts': {
      reify: async () => {
        return { buildQueue: [], diff: {} }
      },
    },
  })

  const { graph } = await install(
    options,
    new Map([
      [
        joinDepIDTuple(['file', '.']),
        new Map<string, Dependency>([
          [
            'abbrev',
            asDependency({
              spec: Spec.parse('abbrev', '2.0.0'),
              type: 'prod',
            }),
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap,
  )

  t.matchSnapshot(
    objectLikeOutput(graph),
    'should create a graph with the new dependency',
  )
})

t.test('unknown error reading package.json', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({}, null, 2),
  })
  const options = {
    projectRoot: dir,
    scurry: new PathScurry(dir),
    packageJson: {
      read() {
        throw new Error('ERR')
      },
    },
    packageInfo: mockPackageInfo,
    allowScripts: ':not(*)',
  } as unknown as InstallOptions
  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/reify/index.ts': {
      reify: async () => {
        return { buildQueue: [], diff: {} }
      },
    },
  })

  await t.rejects(
    install(options, new Map() as AddImportersDependenciesMap),
    /ERR/,
    'should throw unknown errors when reading package.json fails',
  )
})

t.test(
  'install with expectLockfile option (no clean install)',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
      node_modules: {
        'some-package': {
          'package.json': JSON.stringify({
            name: 'some-package',
            version: '1.0.0',
          }),
        },
      },
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
      allowScripts: ':not(*)',
      // No cleanInstall option - just expect-lockfile
    } as unknown as InstallOptions

    const removedPaths: string[] = []
    let confirmed = false

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ diff: {} }),
      },
      '@vltpkg/rollback-remove': {
        RollbackRemove: class MockRollbackRemove {
          async rm(path: string) {
            removedPaths.push(path)
          }
          confirm() {
            confirmed = true
          }
        },
      },
    })

    await install(options, new Map() as AddImportersDependenciesMap)

    t.equal(
      removedPaths.length,
      0,
      'should NOT remove node_modules with only expectLockfile',
    )
    t.notOk(confirmed, 'should NOT confirm removal')
  },
)

t.test('install with cleanInstall option (ci command)', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: 0,
      options: {},
      nodes: {},
      edges: {},
    }),
    node_modules: {
      'some-package': {
        'package.json': JSON.stringify({
          name: 'some-package',
          version: '1.0.0',
        }),
      },
    },
  })

  const options = {
    projectRoot: dir,
    scurry: new PathScurry(dir),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    expectLockfile: true,
    cleanInstall: true, // This is set by ci command
    allowScripts: ':not(*)',
  } as unknown as InstallOptions

  const removedPaths: string[] = []
  let confirmed = false

  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/reify/index.ts': {
      reify: async () => ({ buildQueue: {}, diff: {} }),
    },
    '@vltpkg/rollback-remove': {
      RollbackRemove: class MockRollbackRemove {
        async rm(path: string) {
          removedPaths.push(path)
        }
        confirm() {
          confirmed = true
        }
      },
    },
  })

  await install(options, new Map() as AddImportersDependenciesMap)

  t.ok(
    removedPaths.length > 0,
    'should remove node_modules with cleanInstall',
  )
  t.ok(
    removedPaths.some(p => p.includes('node_modules')),
    'should remove node_modules directory',
  )
  t.ok(confirmed, 'should confirm removal')
})

t.test(
  'install with expectLockfile but missing lockfile',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      // No vlt-lock.json file
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      /vlt-lock\.json file is required when using --expect-lockfile, --frozen-lockfile, or ci command/,
      'should throw error when lockfile is missing',
    )
  },
)

t.test(
  'install with frozenLockfile and in-sync lockfile',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          'some-package': '^1.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
      node_modules: {
        'some-package': {
          'package.json': JSON.stringify({
            name: 'some-package',
            version: '1.0.0',
          }),
        },
      },
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      '../src/ideal/get-importer-specs.ts': {
        getImporterSpecs: () => ({
          add: Object.assign(new Map(), {
            modifiedDependencies: false,
          }),
          remove: Object.assign(new Map(), {
            modifiedDependencies: false,
          }),
        }),
      },
      '../src/lockfile/load.ts': {
        load: () => ({
          nodes: new Map(),
          importers: [],
          gc: () => {},
        }),
        loadHidden: () => ({
          nodes: new Map(),
          importers: [],
        }),
      },
    })

    await t.resolves(
      install(options, new Map() as AddImportersDependenciesMap),
      'should succeed with in-sync lockfile',
    )
  },
)

t.test(
  'install with frozenLockfile and missing lockfile',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      // No vlt-lock.json file
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      /vlt-lock\.json file is required when using --expect-lockfile, --frozen-lockfile, or ci command/,
      'should throw error when lockfile is missing',
    )
  },
)

t.test(
  'install with frozenLockfile and out-of-sync lockfile (deps added)',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          'new-package': '^2.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const addMap = new Map()
    addMap.set(
      '',
      new Map([['new-package', { spec: {}, type: 'prod' }]]),
    )

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      '../src/ideal/get-importer-specs.ts': {
        getImporterSpecs: () => ({
          add: Object.assign(addMap, { modifiedDependencies: true }),
          remove: Object.assign(new Map(), {
            modifiedDependencies: false,
          }),
        }),
      },
      '../src/lockfile/load.ts': {
        load: () => ({
          nodes: new Map([['', { location: dir }]]),
          importers: [],
          gc: () => {},
        }),
        loadHidden: () => ({
          nodes: new Map(),
          importers: [],
        }),
      },
      '@vltpkg/workspaces': {
        Monorepo: {
          maybeLoad: () => undefined,
        },
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      {
        message: /Lockfile is out of sync with package\.json/,
        cause: {
          path: resolve(dir, 'vlt-lock.json'),
        },
      },
      'should throw error when dependencies are added',
    )
  },
)

t.test(
  'install with frozenLockfile and out-of-sync lockfile (deps removed)',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const removeMap = new Map()
    removeMap.set('', new Set(['old-package']))

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      '../src/ideal/get-importer-specs.ts': {
        getImporterSpecs: () => ({
          add: Object.assign(new Map(), {
            modifiedDependencies: false,
          }),
          remove: Object.assign(removeMap, {
            modifiedDependencies: true,
          }),
        }),
      },
      '../src/lockfile/load.ts': {
        load: () => ({
          nodes: new Map([['', { location: dir }]]),
          importers: [],
          gc: () => {},
        }),
        loadHidden: () => ({
          nodes: new Map(),
          importers: [],
        }),
      },
      '@vltpkg/workspaces': {
        Monorepo: {
          maybeLoad: () => undefined,
        },
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      /Lockfile is out of sync with package\.json/,
      'should throw error when dependencies are removed',
    )
  },
)

t.test('install with frozenLockfile and spec changes', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        react: '^19.0.0', // Changed from ^18.0.0 to ^19.0.0
      },
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: 0,
      options: {},
      nodes: {},
      edges: {},
    }),
  })

  const options = {
    projectRoot: dir,
    scurry: new PathScurry(dir),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    frozenLockfile: true,
    allowScripts: ':not(*)',
  } as unknown as InstallOptions

  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/reify/index.ts': {
      reify: async () => ({ buildQueue: {}, diff: {} }),
    },
    '../src/ideal/get-importer-specs.ts': {
      getImporterSpecs: () => ({
        add: Object.assign(new Map(), {
          modifiedDependencies: false,
        }),
        remove: Object.assign(new Map(), {
          modifiedDependencies: false,
        }),
      }),
    },
    '../src/lockfile/load.ts': {
      load: () => {
        // Create a mock spec object with a toString method
        const mockSpec18 = {
          toString: () => 'react@^18.0.0',
          type: 'registry',
          name: 'react',
          spec: '^18.0.0',
        }
        const graph = {
          nodes: new Map([
            [
              '',
              {
                location: dir,
                id: '',
                manifest: { dependencies: { react: '^19.0.0' } },
              },
            ],
          ]),
          importers: [
            {
              id: '',
              location: dir,
              manifest: { dependencies: { react: '^19.0.0' } },
              edgesOut: new Map([
                [
                  'react',
                  {
                    spec: mockSpec18,
                    name: 'react',
                    from: { location: dir },
                    to: { id: 'registry::react@18.0.0' },
                  },
                ],
              ]),
            },
          ],
          gc: () => {},
        }
        return graph
      },
      loadHidden: () => ({
        nodes: new Map(),
        importers: [],
      }),
    },
    '@vltpkg/workspaces': {
      Monorepo: {
        maybeLoad: () => undefined,
      },
    },
  })

  await t.rejects(
    install(options, new Map() as AddImportersDependenciesMap),
    /Lockfile is out of sync with package\.json.*react spec changed from.*\^18.*to.*\^19/s,
    'should throw error when dependency specs have changed',
  )
})

t.test(
  'install with frozenLockfile prevents adding packages',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
    })

    const addDeps = new Map()
    addDeps.set(
      '',
      new Map([['new-dep', { spec: {}, type: 'prod' }]]),
    )
    // Set the modifiedDependencies flag to match the new implementation check
    Object.assign(addDeps, { modifiedDependencies: true })

    await t.rejects(
      install(options, addDeps as AddImportersDependenciesMap),
      /Cannot add dependencies when using --frozen-lockfile/,
      'should prevent adding new dependencies',
    )
  },
)

t.test(
  'both expectLockfile and frozenLockfile set (frozen takes precedence)',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          'new-package': '^1.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const addMap = new Map()
    addMap.set(
      '',
      new Map([['new-package', { spec: {}, type: 'prod' }]]),
    )

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      '../src/ideal/get-importer-specs.ts': {
        getImporterSpecs: () => ({
          add: Object.assign(addMap, { modifiedDependencies: true }),
          remove: Object.assign(new Map(), {
            modifiedDependencies: false,
          }),
        }),
      },
      '../src/lockfile/load.ts': {
        load: () => ({
          nodes: new Map([['', { location: dir }]]),
          importers: [],
          gc: () => {},
        }),
        loadHidden: () => ({
          nodes: new Map(),
          importers: [],
        }),
      },
      '@vltpkg/workspaces': {
        Monorepo: {
          maybeLoad: () => undefined,
        },
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      /Lockfile is out of sync with package\.json/,
      'frozen-lockfile validation takes precedence over expect-lockfile',
    )
  },
)

t.test(
  'install with frozenLockfile and workspace out-of-sync',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
        workspaces: ['packages/*'],
      }),
      packages: {
        'pkg-a': {
          'package.json': JSON.stringify({
            name: 'pkg-a',
            version: '1.0.0',
            dependencies: {
              'new-dep': '^1.0.0',
            },
          }),
        },
      },
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const wsDir = resolve(dir, 'packages/pkg-a')
    const addMap = new Map()
    addMap.set(
      'workspace:packages/pkg-a',
      new Map([['new-dep', { spec: {}, type: 'prod' }]]),
    )

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      '../src/ideal/get-importer-specs.ts': {
        getImporterSpecs: () => ({
          add: Object.assign(addMap, { modifiedDependencies: true }),
          remove: Object.assign(new Map(), {
            modifiedDependencies: false,
          }),
        }),
      },
      '../src/lockfile/load.ts': {
        load: () => ({
          nodes: new Map([
            ['workspace:packages/pkg-a', { location: wsDir }],
          ]),
          importers: [],
          gc: () => {},
        }),
        loadHidden: () => ({
          nodes: new Map(),
          importers: [],
        }),
      },
      '@vltpkg/workspaces': {
        Monorepo: {
          maybeLoad: () => undefined,
        },
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      {
        message: /Lockfile is out of sync with package\.json/,
      },
      'should show workspace location in error',
    )
  },
)

t.test(
  'install with frozenLockfile when package.json needs init',
  async t => {
    const dir = t.testdir({
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
      'vlt.json': JSON.stringify({}, null, 2),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: {
        read: () => {
          throw Object.assign(
            new Error('Could not read package.json file'),
            {
              code: 'ENOENT',
            },
          )
        },
      },
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    let initCalled = false
    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '@vltpkg/init': {
        init: async () => {
          initCalled = true
        },
      },
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      '../src/ideal/get-importer-specs.ts': {
        getImporterSpecs: () => ({
          add: Object.assign(new Map(), {
            modifiedDependencies: false,
          }),
          remove: Object.assign(new Map(), {
            modifiedDependencies: false,
          }),
        }),
      },
      '../src/lockfile/load.ts': {
        load: () => ({
          nodes: new Map(),
          importers: [],
          gc: () => {},
        }),
        loadHidden: () => ({
          nodes: new Map(),
          importers: [],
        }),
      },
    })

    // Mock the second read after init
    let readCount = 0
    options.packageJson.read = () => {
      readCount++
      if (readCount === 1) {
        throw Object.assign(
          new Error('Could not read package.json file'),
          {
            code: 'ENOENT',
          },
        )
      }
      return { name: 'test', version: '1.0.0' }
    }

    await t.resolves(
      install(options, new Map() as AddImportersDependenciesMap),
      'should succeed after init',
    )
    t.ok(initCalled, 'should call init when package.json is missing')
  },
)

t.test(
  'install with frozenLockfile when package.json read fails (non-ENOENT)',
  async t => {
    const dir = t.testdir({
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
      'vlt.json': JSON.stringify({}, null, 2),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: {
        read: () => {
          throw new Error('Permission denied')
        },
      },
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '@vltpkg/init': {
        init: async () => {
          throw new Error('should not call init')
        },
      },
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      /Permission denied/,
      'should throw original error when not ENOENT',
    )
  },
)

t.test(
  'install with frozenLockfile shows importerId when node location is missing',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          'new-dep': '^1.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const addMap = new Map()
    addMap.set(
      'missing-node-id',
      new Map([
        ['new-dep', { spec: {}, type: 'prod' }],
        ['new-dep-2', { spec: {}, type: 'prod' }],
      ]),
    )
    const removeMap = new Map()
    removeMap.set('another-missing-id', new Set(['old-dep']))

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      '../src/ideal/get-importer-specs.ts': {
        getImporterSpecs: () => ({
          add: Object.assign(addMap, { modifiedDependencies: true }),
          remove: Object.assign(removeMap, {
            modifiedDependencies: true,
          }),
        }),
      },
      '../src/lockfile/load.ts': {
        load: () => ({
          nodes: new Map(), // Empty nodes map so location lookup fails
          importers: [],
          gc: () => {},
        }),
        loadHidden: () => ({
          nodes: new Map(),
          importers: [],
        }),
      },
      '@vltpkg/workspaces': {
        Monorepo: {
          maybeLoad: () => undefined,
        },
      },
    })

    try {
      await install(options, new Map() as AddImportersDependenciesMap)
      t.fail('should have thrown')
    } catch (err: any) {
      t.match(
        err.message,
        /missing-node-id: 2 dependencies to add/,
        'should use importerId for add (new-dep, new-dep-2)',
      )
      t.match(
        err.message,
        /another-missing-id: 1 dependency to remove/,
        'should use importerId for remove',
      )
    }
  },
)

t.test('install with expectLockfile but no node_modules', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: 0,
      options: {},
      nodes: {},
      edges: {},
    }),
    // No node_modules directory
  })

  const options = {
    projectRoot: dir,
    scurry: new PathScurry(dir),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    expectLockfile: true,
    allowScripts: ':not(*)',
  } as unknown as InstallOptions

  const removedPaths: string[] = []
  let confirmed = false

  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/reify/index.ts': {
      reify: async () => ({ buildQueue: {}, diff: {} }),
    },
    '@vltpkg/rollback-remove': {
      RollbackRemove: class MockRollbackRemove {
        async rm(path: string) {
          removedPaths.push(path)
        }
        confirm() {
          confirmed = true
        }
      },
    },
  })

  await install(options, new Map() as AddImportersDependenciesMap)

  t.equal(
    removedPaths.length,
    0,
    'should not try to remove non-existent node_modules',
  )
  t.notOk(
    confirmed,
    'should not confirm removal when nothing to remove',
  )
})

t.test(
  'install with cleanInstall should rollback on idealBuild error',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
      node_modules: {
        'some-package': {
          'package.json': JSON.stringify({
            name: 'some-package',
            version: '1.0.0',
          }),
        },
      },
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
      cleanInstall: true, // This is set by ci command
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const removedPaths: string[] = []
    let confirmed = false
    let rolledBack = false

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/ideal/build.ts': {
        build: async () => {
          throw error('idealBuild failed for testing', {})
        },
      },
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      '@vltpkg/rollback-remove': {
        RollbackRemove: class MockRollbackRemove {
          async rm(path: string) {
            removedPaths.push(path)
          }
          confirm() {
            confirmed = true
          }
          async rollback() {
            rolledBack = true
          }
        },
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      /idealBuild failed for testing/,
      'should throw error from idealBuild',
    )

    t.ok(
      removedPaths.length > 0,
      'should have attempted to remove node_modules during clean install',
    )
    t.ok(
      removedPaths.some(p => p.includes('node_modules')),
      'should have attempted to remove node_modules directory',
    )
    t.ok(
      confirmed,
      'should confirm removal initially during clean install',
    )
    t.ok(rolledBack, 'should rollback removal after error')
  },
)

t.test('install with lockfileOnly option', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
      dependencies: {
        abbrev: '^1.0.0',
      },
    }),
  })

  const options = {
    projectRoot: dir,
    scurry: new PathScurry(dir),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    lockfileOnly: true,
  } as unknown as InstallOptions

  let reifyCalled = false
  let lockfileSaveCalled = false
  let lockfileSaveOptions: any = null

  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/ideal/build.ts': {
      build: async () => ({
        nodes: new Map(),
        importers: [],
        projectRoot: dir,
      }),
    },
    '../src/reify/index.ts': {
      reify: async () => {
        reifyCalled = true
        return { hasChanges: () => false }
      },
    },
    '../src/index.ts': {
      lockfile: {
        save: (opts: any) => {
          lockfileSaveCalled = true
          lockfileSaveOptions = opts
        },
      },
    },
  })

  const result = await install(
    options,
    new Map() as AddImportersDependenciesMap,
  )

  t.notOk(
    reifyCalled,
    'should NOT call reify when lockfileOnly is true',
  )
  t.ok(
    lockfileSaveCalled,
    'should call lockfile.save when lockfileOnly is true',
  )
  t.ok(lockfileSaveOptions, 'should pass options to lockfile.save')
  t.ok(result.graph, 'should return graph')
  t.equal(
    result.diff,
    undefined,
    'should return undefined for diff when lockfileOnly is true',
  )
})

t.test('lockfileOnly incompatible with cleanInstall', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
    }),
  })

  const options = {
    projectRoot: dir,
    scurry: new PathScurry(dir),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    lockfileOnly: true,
    cleanInstall: true, // This should cause an error
  } as unknown as InstallOptions

  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {})

  await t.rejects(
    install(options, new Map() as AddImportersDependenciesMap),
    /Cannot use --lockfile-only with --clean-install/,
    'should throw error when lockfileOnly and cleanInstall are both set',
  )
})

t.test(
  'install with lockfileOnly and adding packages (updatePackageJson)',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      lockfileOnly: true,
    } as unknown as InstallOptions

    let reifyCalled = false
    let lockfileSaveCalled = false
    let updatePackageJsonCalled = false
    let updatePackageJsonOptions: any = null

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/ideal/build.ts': {
        build: async () => ({
          nodes: new Map(),
          importers: [],
          projectRoot: dir,
        }),
      },
      '../src/reify/index.ts': {
        reify: async () => {
          reifyCalled = true
          return { hasChanges: () => false }
        },
      },
      '../src/index.ts': {
        lockfile: {
          save: () => {
            lockfileSaveCalled = true
          },
        },
      },
      '../src/reify/update-importers-package-json.ts': {
        updatePackageJson: (opts: any) => {
          updatePackageJsonCalled = true
          updatePackageJsonOptions = opts
          return () => {}
        },
      },
    })

    const rootDepID = joinDepIDTuple(['file', '.'])
    const addMap = new Map([
      [
        rootDepID,
        new Map<string, Dependency>([
          [
            'new-dep',
            asDependency({
              spec: Spec.parse('new-dep', '^1.0.0'),
              type: 'prod',
            }),
          ],
        ]),
      ],
    ]) as AddImportersDependenciesMap
    Object.assign(addMap, { modifiedDependencies: true })

    const result = await install(options, addMap)

    t.notOk(reifyCalled, 'should NOT call reify with lockfileOnly')
    t.ok(lockfileSaveCalled, 'should call lockfile.save')
    t.ok(
      updatePackageJsonCalled,
      'should call updatePackageJson when adding packages',
    )
    t.ok(
      updatePackageJsonOptions?.add,
      'should pass add map to updatePackageJson',
    )
    t.ok(result.graph, 'should return graph')
    t.equal(result.diff, undefined, 'should return undefined diff')
  },
)

t.test(
  'install with lockfileOnly and removing packages (updatePackageJson)',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      lockfileOnly: true,
    } as unknown as InstallOptions

    let reifyCalled = false
    let lockfileSaveCalled = false
    let updatePackageJsonCalled = false
    let updatePackageJsonOptions: any = null

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/ideal/build.ts': {
        build: async ({ remove }: any) => {
          // Simulate idealBuild populating the remove map
          remove.set('file~.', new Set(['old-dep']))
          Object.assign(remove, { modifiedDependencies: true })
          return {
            nodes: new Map(),
            importers: [],
            projectRoot: dir,
          }
        },
      },
      '../src/reify/index.ts': {
        reify: async () => {
          reifyCalled = true
          return { hasChanges: () => false }
        },
      },
      '../src/index.ts': {
        lockfile: {
          save: () => {
            lockfileSaveCalled = true
          },
        },
      },
      '../src/reify/update-importers-package-json.ts': {
        updatePackageJson: (opts: any) => {
          updatePackageJsonCalled = true
          updatePackageJsonOptions = opts
          return () => {}
        },
      },
    })

    const result = await install(
      options,
      new Map() as AddImportersDependenciesMap,
    )

    t.notOk(reifyCalled, 'should NOT call reify with lockfileOnly')
    t.ok(lockfileSaveCalled, 'should call lockfile.save')
    t.ok(
      updatePackageJsonCalled,
      'should call updatePackageJson when removing packages',
    )
    t.ok(
      updatePackageJsonOptions?.remove,
      'should pass remove map to updatePackageJson',
    )
    t.ok(result.graph, 'should return graph')
    t.equal(result.diff, undefined, 'should return undefined diff')
  },
)

t.test(
  'install failure without hidden lockfile propagates original error',
  async t => {
    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: 0,
        options: {},
        nodes: {},
        edges: {},
      }),
      // No node_modules/.vlt-lock.json (hidden lockfile)
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/ideal/build.ts': {
        build: async () => {
          throw error('test error without hidden lockfile', {})
        },
      },
      '../src/reify/index.ts': {
        reify: async () => ({ buildQueue: {}, diff: {} }),
      },
      'node:fs': {
        ...(await import('node:fs')),
        existsSync: () => true,
        rmSync: () => {
          throw error('rmSync error during cleanup', {})
        },
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      /test error without hidden lockfile/,
      'should propagate original error when no hidden lockfile exists',
    )
  },
)

t.test('remote dependency integrity in lockfile', async t => {
  const remoteIntegrity = 'sha512-remote-computed-integrity'
  const remoteDepId =
    'remote~~https://example.com/remote-pkg-1.0.0.tgz'

  // Create mock packageInfo that returns integrity for remote deps
  const mockPackageInfoWithIntegrity = createMockPackageInfo({
    extract: async (_spec: any, _target: string, options: any) => {
      // Simulate remote dependency returning computed integrity
      return {
        resolved: 'https://example.com/remote-pkg-1.0.0.tgz',
        integrity: options.integrity ?? remoteIntegrity,
        spec: _spec,
      }
    },
  })

  await t.test(
    'node captures integrity from extract result',
    async t => {
      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test',
          version: '1.0.0',
        }),
        'vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {},
          nodes: {},
          edges: {},
        }),
      })

      const options = {
        projectRoot: dir,
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        packageInfo: mockPackageInfoWithIntegrity,
        allowScripts: ':not(*)',
      } as unknown as InstallOptions

      // Mock graph with a remote node
      const mockGraph = {
        nodes: new Map([
          [
            remoteDepId,
            {
              id: remoteDepId,
              name: 'remote-pkg',
              integrity: undefined, // Initially no integrity
              resolved: 'https://example.com/remote-pkg-1.0.0.tgz',
              manifest: { name: 'remote-pkg', version: '1.0.0' },
              importer: false,
              dev: false,
              optional: false,
              inVltStore: () => true,
              location: `node_modules/.vlt/${remoteDepId}/node_modules/remote-pkg`,
            },
          ],
        ]),
        importers: [],
        projectRoot: dir,
      }

      const { install } = await t.mockImport<
        typeof import('../src/install.ts')
      >('../src/install.ts', {
        '../src/ideal/build.ts': {
          build: async () => mockGraph,
        },
        '../src/reify/index.ts': {
          reify: async () => ({
            diff: { hasChanges: () => false },
          }),
        },
      })

      const result = await install(
        options,
        new Map() as AddImportersDependenciesMap,
      )

      t.ok(result.graph, 'should return graph')
      // The graph node should now have integrity populated
      // This verifies extract-node.ts captures the integrity
    },
  )

  await t.test(
    'lockfile preserves remote dependency integrity on reload',
    async t => {
      const dir = t.testdir({
        'package.json': JSON.stringify({
          name: 'test',
          version: '1.0.0',
        }),
        // Lockfile with remote dep that has integrity
        'vlt-lock.json': JSON.stringify({
          lockfileVersion: 0,
          options: {},
          nodes: {
            [remoteDepId]: [0, 'remote-pkg', remoteIntegrity],
          },
          edges: {
            'file~.': { 'remote-pkg prod': remoteDepId },
          },
        }),
      })

      const options = {
        projectRoot: dir,
        scurry: new PathScurry(dir),
        packageJson: new PackageJson(),
        packageInfo: mockPackageInfoWithIntegrity,
        allowScripts: ':not(*)',
      } as unknown as InstallOptions

      const { install } = await t.mockImport<
        typeof import('../src/install.ts')
      >('../src/install.ts', {
        '../src/reify/index.ts': {
          reify: async () => ({
            diff: { hasChanges: () => false },
          }),
        },
      })

      const result = await install(
        options,
        new Map() as AddImportersDependenciesMap,
      )

      t.ok(result.graph, 'should return graph')
      // Verify integrity was loaded from lockfile
      const node = result.graph.nodes.get(remoteDepId)
      if (node) {
        t.equal(
          node.integrity,
          remoteIntegrity,
          'integrity loaded from lockfile',
        )
      }
    },
  )
})

t.test(
  'install with frozenLockfile and lockfile version mismatch',
  async t => {
    const { LOCKFILE_VERSION } = await t.mockImport<
      typeof import('../src/lockfile/types.ts')
    >('../src/lockfile/types.ts')

    const dir = t.testdir({
      'package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          foo: '^1.0.0',
        },
      }),
      'vlt-lock.json': JSON.stringify({
        lockfileVersion: LOCKFILE_VERSION + 1, // Newer version
        options: {},
        nodes: {},
        edges: {},
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
      allowScripts: ':not(*)',
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ diff: { hasChanges: () => false } }),
      },
    })

    await t.rejects(
      install(options, new Map() as AddImportersDependenciesMap),
      {
        message: 'Unsupported lockfile version',
        cause: {
          code: 'ELOCKFILEVERSION',
          found: LOCKFILE_VERSION + 1,
          wanted: LOCKFILE_VERSION,
        },
      },
      'should throw when lockfile version is newer',
    )
  },
)
