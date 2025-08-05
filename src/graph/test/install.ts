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
import type { BuildIdealAddOptions } from '../src/ideal/types.ts'
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
  const options = {
    projectRoot: t.testdirName,
    scurry: {},
    packageJson: {
      read() {
        return { name: 'my-project', version: '1.0.0' }
      },
    },
  } as unknown as InstallOptions
  let log = ''

  const rootDepID = joinDepIDTuple(['file', '.'])

  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/ideal/build.ts': {
      build: async ({ add }: BuildIdealAddOptions) => {
        log += `buildideal result adds ${add.get(rootDepID)?.size || 0} new package(s)\n`
      },
    },
    '../src/actual/load.ts': {
      load: () => {
        log += 'actual.load\n'
      },
    },
    '../src/reify/index.ts': {
      reify: async () => {
        log += 'reify\n'
      },
    },
    '../src/modifiers.ts': {
      GraphModifier: {
        maybeLoad() {
          log += 'GraphModifier.maybeLoad\n'
        },
      },
    },
  })

  await install(options, new Map() as AddImportersDependenciesMap)

  t.matchSnapshot(log, 'should call build -> actual.load -> reify')

  // adding a new dependency
  log = ''
  await install(
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

  t.matchSnapshot(log, 'should call build adding new dependency')
})

t.test('install with no package.json file in cwd', async t => {
  const dir = t.testdir({})
  const options = {
    projectRoot: dir,
    scurry: new PathScurry(),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
  } as unknown as InstallOptions
  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/reify/index.ts': {
      reify: async () => {},
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
  const dir = t.testdir({})
  const options = {
    projectRoot: dir,
    scurry: new PathScurry(),
    packageJson: {
      read() {
        throw new Error('ERR')
      },
    },
    packageInfo: mockPackageInfo,
  } as unknown as InstallOptions
  const { install } = await t.mockImport<
    typeof import('../src/install.ts')
  >('../src/install.ts', {
    '../src/reify/index.ts': {
      reify: async () => {},
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
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
    scurry: new PathScurry(),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    expectLockfile: true,
    cleanInstall: true, // This is set by ci command
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ diff: {} }),
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
        nodes: {
          'registry:some-package@1.0.0': [0, 'some-package', ''],
        },
        edges: {
          '': [
            ['some-package', 'prod', 'registry:some-package@1.0.0'],
          ],
        },
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ diff: {} }),
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ diff: {} }),
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
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
        reify: async () => ({ diff: {} }),
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
        nodes: {
          'registry:old-package@1.0.0': [0, 'old-package', ''],
        },
        edges: {
          '': [['old-package', 'prod', 'registry:old-package@1.0.0']],
        },
      }),
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
    } as unknown as InstallOptions

    const removeMap = new Map()
    removeMap.set('', new Set(['old-package']))

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ diff: {} }),
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
    } as unknown as InstallOptions

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ diff: {} }),
      },
    })

    const addDeps = new Map()
    addDeps.set(
      '',
      new Map([['new-dep', { spec: {}, type: 'prod' }]]),
    )

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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
      frozenLockfile: true,
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
        reify: async () => ({ diff: {} }),
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
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
        reify: async () => ({ diff: {} }),
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
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
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
        reify: async () => ({ diff: {} }),
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
    })

    const options = {
      projectRoot: dir,
      scurry: new PathScurry(),
      packageJson: {
        read: () => {
          throw new Error('Permission denied')
        },
      },
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
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
        reify: async () => ({ diff: {} }),
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      frozenLockfile: true,
    } as unknown as InstallOptions

    const addMap = new Map()
    addMap.set(
      'missing-node-id',
      new Map([['new-dep', { spec: {}, type: 'prod' }]]),
    )
    const removeMap = new Map()
    removeMap.set('another-missing-id', new Set(['old-dep']))

    const { install } = await t.mockImport<
      typeof import('../src/install.ts')
    >('../src/install.ts', {
      '../src/reify/index.ts': {
        reify: async () => ({ diff: {} }),
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
        /missing-node-id: 1 dependencies to add/,
        'should use importerId for add',
      )
      t.match(
        err.message,
        /another-missing-id: 1 dependencies to remove/,
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
    scurry: new PathScurry(),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    expectLockfile: true,
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      expectLockfile: true,
      cleanInstall: true, // This is set by ci command
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
