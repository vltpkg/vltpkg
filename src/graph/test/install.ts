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
