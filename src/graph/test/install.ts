import { joinDepIDTuple } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import t from 'tap'
import type {
  AddImportersDependenciesMap,
  Dependency,
} from '../src/dependencies.ts'
import { asDependency } from '../src/dependencies.ts'
import type { BuildIdealAddOptions } from '../src/ideal/types.ts'
import type { InstallOptions } from '../src/install.ts'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)"?projectRoot"?: .*$/gm, '$1projectRoot: #')

class PackageJson {
  read() {
    return { name: 'my-project', version: '1.0.0' }
  }
}

t.test('install', async t => {
  const options = {
    projectRoot: t.testdirName,
    scurry: {},
    packageJson: new PackageJson(),
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
    '@vltpkg/package-json': {
      PackageJson,
    },
    'path-scurry': {
      PathScurry: {},
      PathScurryDarwin: {},
      PathScurryLinux: {},
      PathScurryPosix: {},
      PathScurryWin32: {},
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
