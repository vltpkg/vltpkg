import { joinDepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import type { RemoveImportersDependenciesMap } from '../src/dependencies.ts'
import type { BuildIdealRemoveOptions } from '../src/ideal/types.ts'
import type { UninstallOptions } from '../src/uninstall.ts'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import { mockPackageInfo as mockPackageInfoBase } from './fixtures/reify.ts'
import type { PackageInfoClient } from '@vltpkg/package-info'

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

class PackageJsonMock {
  read() {
    return {
      name: 'my-project',
      version: '1.0.0',
      dependencies: {
        abbrev: '^3.0.0',
      },
    }
  }
}

t.test('uninstall', async t => {
  const options = {
    projectRoot: t.testdirName,
    packageJson: new PackageJsonMock(),
    scurry: {},
  } as unknown as UninstallOptions
  let log = ''
  let idealBuildReceivedActual = false
  const rootDepID = joinDepIDTuple(['file', '.'])
  const actualGraph = { __actual: true }

  const { uninstall } = await t.mockImport<
    typeof import('../src/uninstall.ts')
  >('../src/uninstall.ts', {
    '../src/ideal/build.ts': {
      build: async ({
        remove,
        actual,
      }: BuildIdealRemoveOptions & { actual?: unknown }) => {
        idealBuildReceivedActual = actual === actualGraph
        log += `buildideal result removes ${remove.get(rootDepID)?.size || 0} new package(s)\n`
      },
    },
    '../src/actual/load.ts': {
      load: () => {
        log += 'actual.load\n'
        return actualGraph
      },
    },
    '../src/reify/index.ts': {
      reify: async () => {
        log += 'reify\n'
      },
    },
    '@vltpkg/package-json': {
      PackageJson: PackageJsonMock,
    },
    'path-scurry': {
      PathScurry: {},
      PathScurryDarwin: {},
      PathScurryLinux: {},
      PathScurryPosix: {},
      PathScurryWin32: {},
    },
  })

  await uninstall(
    options,
    new Map([
      [rootDepID, new Set(['abbrev'])],
    ]) as RemoveImportersDependenciesMap,
  )

  t.matchSnapshot(log, 'should call build removing a dependency')
  t.ok(
    idealBuildReceivedActual,
    'should pass actual graph to idealBuild for manifest hydration',
  )
})

t.test('uninstall with lockfileOnly option', async t => {
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
    scurry: new PathScurry(),
    packageJson: new PackageJson(),
    packageInfo: mockPackageInfo,
    lockfileOnly: true,
    allowScripts: ':not(*)',
  } as unknown as UninstallOptions

  let reifyCalled = false
  let lockfileSaveCalled = false

  const { uninstall } = await t.mockImport<
    typeof import('../src/uninstall.ts')
  >('../src/uninstall.ts', {
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
  })

  const result = await uninstall(
    options,
    new Map() as RemoveImportersDependenciesMap,
  )

  t.notOk(
    reifyCalled,
    'should NOT call reify when lockfileOnly is true',
  )
  t.ok(
    lockfileSaveCalled,
    'should call lockfile.save when lockfileOnly is true',
  )
  t.ok(result.graph, 'should return graph')
  t.equal(
    result.diff,
    undefined,
    'should return undefined for diff when lockfileOnly is true',
  )
})

t.test(
  'uninstall with lockfileOnly and removing packages (updatePackageJson)',
  async t => {
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
      scurry: new PathScurry(),
      packageJson: new PackageJson(),
      packageInfo: mockPackageInfo,
      lockfileOnly: true,
      allowScripts: ':not(*)',
    } as unknown as UninstallOptions

    let reifyCalled = false
    let lockfileSaveCalled = false
    let updatePackageJsonCalled = false
    let updatePackageJsonOptions: any = null

    const { uninstall } = await t.mockImport<
      typeof import('../src/uninstall.ts')
    >('../src/uninstall.ts', {
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
    const removeMap = new Map([
      [rootDepID, new Set(['abbrev'])],
    ]) as RemoveImportersDependenciesMap
    Object.assign(removeMap, { modifiedDependencies: true })

    const result = await uninstall(options, removeMap)

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
