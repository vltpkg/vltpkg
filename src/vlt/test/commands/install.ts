import { joinDepIDTuple } from '@vltpkg/dep-id'
import { BuildIdealOptions } from '@vltpkg/graph'
import t from 'tap'
import { LoadedConfig } from '../../src/config/index.js'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)"?projectRoot"?: .*$/gm, '$1projectRoot: #')
class PackageJson {
  read() {
    return { name: 'my-project', version: '1.0.0' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class PathScurry {}

const options = {
  projectRoot: t.testdirName,
  scurry: new PathScurry(),
  packageJson: new PackageJson(),
}
let reifyOpts: any

const rootDepID = joinDepIDTuple(['file', '.'])

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/install.js')
>('../../src/commands/install.js', {
  '@vltpkg/graph': {
    ideal: {
      build: async ({ add }: BuildIdealOptions) =>
        `buildideal result adds ${add?.get(rootDepID)?.size || 0} new package(s)`,
    },
    actual: {
      load: () => 'actual.load result',
    },
    reify: async (reifyOptions: any) => {
      reifyOpts = reifyOptions
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
t.type(usage, 'string')
await command(
  {
    positionals: [],
    values: {},
    options,
  } as unknown as LoadedConfig,
  {},
)
t.matchSnapshot(reifyOpts, 'should call reify with expected options')

// adds a new package
await command(
  {
    positionals: ['abbrev@2'],
    values: { 'save-dev': true },
    options,
  } as unknown as LoadedConfig,
  {},
)
t.matchSnapshot(reifyOpts, 'should reify installing a new dependency')
