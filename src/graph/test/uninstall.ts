import { joinDepIDTuple } from '@vltpkg/dep-id'
import t from 'tap'
import type { RemoveImportersDependenciesMap } from '../src/dependencies.ts'
import type { BuildIdealRemoveOptions } from '../src/ideal/types.ts'
import type { UninstallOptions } from '../src/uninstall.ts'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)"?projectRoot"?: .*$/gm, '$1projectRoot: #')

class PackageJson {
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

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class PathScurry {}

t.test('uninstall', async t => {
  const options = {
    projectRoot: t.testdirName,
    packageJson: new PackageJson(),
    scurry: new PathScurry(),
  }
  let log = ''
  const rootDepID = joinDepIDTuple(['file', '.'])

  const { uninstall } = await t.mockImport<
    typeof import('../src/uninstall.ts')
  >('../src/uninstall.ts', {
    '../src/ideal/build.ts': {
        build: async ({ remove }: BuildIdealRemoveOptions) =>
          (log += `buildideal result removes ${remove?.get(rootDepID)?.size || 0} new package(s)\n`),
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
    '@vltpkg/package-json': {
      PackageJson,
    },
    'path-scurry': {
      PathScurry,
      PathScurryDarwin: PathScurry,
      PathScurryLinux: PathScurry,
      PathScurryPosix: PathScurry,
      PathScurryWin32: PathScurry,
    },
  })

  await uninstall(
    options as unknown as UninstallOptions,
    new Map([
      [rootDepID, new Set(['abbrev'])],
    ]) as RemoveImportersDependenciesMap,
  )

  t.matchSnapshot(log, 'should call build removing a dependency')
})
