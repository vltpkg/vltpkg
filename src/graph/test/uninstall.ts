import { joinDepIDTuple } from '@vltpkg/dep-id'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import type { LoadQuery } from '@vltpkg/workspaces'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import t from 'tap'
import type { Test } from 'tap'
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
    '@vltpkg/workspaces': {
      Monorepo: { maybeLoad: () => undefined },
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
  let confirmed = 0
  let rolledBack = false
  const removedPaths: string[] = []

  const { uninstall } = await t.mockImport<
    typeof import('../src/uninstall.ts')
  >('../src/uninstall.ts', {
    '../src/ideal/build.ts': {
      build: async (opts: any) => {
        await opts.remover.rm('parked')
        return { nodes: new Map(), importers: [], projectRoot: dir }
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
    '@vltpkg/rollback-remove': {
      RollbackRemove: class MockRollbackRemove {
        async rm(path: string) {
          removedPaths.push(path)
        }
        confirm() {
          confirmed++
        }
        async rollback() {
          rolledBack = true
        }
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
  t.strictSame(removedPaths, ['parked'], 'a directory was parked')
  t.equal(confirmed, 1, 'the remover is confirmed before returning')
  t.notOk(rolledBack, 'and not rolled back')
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

// -w filters options.monorepo; other workspaces must stay in the lockfile
const wsLockfile = async (
  t: Test,
  workspaces: string[] | Record<string, string[]>,
  load: LoadQuery,
  full = false,
) => {
  const pkg = (
    name: string,
    dependencies: Record<string, string>,
  ) => ({
    'package.json': JSON.stringify({
      name,
      version: '1.0.0',
      dependencies,
    }),
  })
  const dir = t.testdir({
    ...pkg('root', { abbrev: '2.0.0' }),
    'vlt.json': JSON.stringify({ workspaces }),
    apps: { a: pkg('a', { lodash: '4.17.21' }) },
    packages: { b: pkg('b', { which: '^2.0.1' }) },
  })
  t.chdir(dir)
  unload('project')
  t.teardown(() => unload('project'))
  const packageJson = new PackageJson()
  // fresh scurry: reify changes the fs between calls
  const opts = () =>
    ({
      projectRoot: dir,
      scurry: new PathScurry(dir),
      packageJson,
      packageInfo: mockPackageInfo,
      registries: { npm: 'https://registry.npmjs.org/' },
      lockfileOnly: !full,
      allowScripts: ':not(*)',
    }) as unknown as UninstallOptions
  const read = (f: string) => readFileSync(resolve(dir, f), 'utf8')
  const store = () =>
    readdirSync(resolve(dir, 'node_modules/.vlt')).join('\n')
  const bLink = () =>
    existsSync(
      resolve(dir, 'packages/b/node_modules/which/package.json'),
    )
  const { install } = await import('../src/install.ts')
  // the real remover deletes in a detached child that inherits the
  // cwd (dir), so Windows can't remove the testdir in teardown (EBUSY)
  const { uninstall } = await t.mockImport<
    typeof import('../src/uninstall.ts')
  >('../src/uninstall.ts', {
    '@vltpkg/rollback-remove': {
      RollbackRemove: class {
        async rm(path: string) {
          await rm(path, { recursive: true, force: true })
        }
        confirm() {}
        async rollback() {}
      },
    },
  })

  await install(opts())
  const baseline = read('vlt-lock.json')
  const baseStore = full ? store() : ''

  const monorepo = Monorepo.maybeLoad(dir, {
    scurry: new PathScurry(dir),
    packageJson,
    load,
  })
  const [ws, ...rest] = monorepo?.values() ?? []
  t.equal(ws?.path, 'apps/a', 'filtered to apps/a')
  t.strictSame(rest, [], 'only apps/a')
  const remove = (name: string) =>
    Object.assign(new Map([[ws!.id, new Set([name])]]), {
      modifiedDependencies: true,
    })

  await uninstall({ ...opts(), monorepo }, remove('not-installed'))
  t.equal(read('vlt-lock.json'), baseline, 'no-op keeps lockfile')
  if (full) {
    t.equal(store(), baseStore, 'no-op keeps store')
    t.ok(bLink(), 'no-op keeps b link')
  }

  await uninstall({ ...opts(), monorepo }, remove('lodash'))
  const { nodes, edges } = JSON.parse(read('vlt-lock.json')) as {
    nodes: Record<string, unknown>
    edges: Record<string, string>
  }
  const nodeIds = Object.keys(nodes).join('\n')
  const edgeKeys = Object.keys(edges).join('\n')
  t.notMatch(nodeIds, 'lodash', 'lodash node removed')
  t.notMatch(edgeKeys, 'lodash', 'lodash edge removed')
  t.notMatch(read('apps/a/package.json'), 'lodash', 'manifest saved')
  t.match(edgeKeys, /packages\+b which$/m, 'b edge kept')
  t.match(edgeKeys, / abbrev$/m, 'root edge kept')
  t.match(nodeIds, 'which@2.0.2', 'which node kept')
  t.match(nodeIds, 'isexe@2.0.0', 'isexe node kept')
  if (full) {
    t.notMatch(store(), 'lodash', 'lodash unlinked from store')
    t.match(store(), /which@2\.0\.2$/m, 'which kept in store')
    t.match(store(), /isexe@2\.0\.0$/m, 'isexe kept in store')
    t.ok(bLink(), 'b link kept')
  }
}

t.test('uninstall -w keeps other workspaces in the lockfile', t =>
  wsLockfile(t, ['apps/*', 'packages/*'], { paths: ['apps/a'] }),
)

t.test('uninstall -w keeps other workspaces installed', t =>
  wsLockfile(
    t,
    ['apps/*', 'packages/*'],
    { paths: ['apps/a'] },
    true,
  ),
)

t.test('uninstall --workspace-group keeps other groups', t =>
  wsLockfile(
    t,
    { apps: ['apps/*'], packages: ['packages/*'] },
    { groups: ['apps'] },
  ),
)
