import { joinDepIDTuple } from '@vltpkg/dep-id'
import { BuildIdealOptions } from '@vltpkg/graph'
import t from 'tap'
import { LoadedConfig } from '../../src/config/index.js'

t.cleanSnapshot = s =>
  s.replace(/^(\s+)"?projectRoot"?: .*$/gm, '$1projectRoot: #')

let reifyOpts: any

class PackageJson {
  read() {
    return { name: 'my-project', version: '1.0.0' }
  }
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class PathScurry {}

const options = {
  projectRoot: t.testdirName,
  packageJson: new PackageJson(),
  scurry: new PathScurry(),
}
const rootDepID = joinDepIDTuple(['file', '.'])

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/uninstall.js')
>('../../src/commands/uninstall.js', {
  '@vltpkg/graph': {
    ideal: {
      build: async ({ remove }: BuildIdealOptions) =>
        `buildideal result removes ${remove?.get(rootDepID)?.size || 0} new package(s)`,
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
t.matchSnapshot((await usage()).usage(), 'usage')
await command(
  {
    positionals: [],
    values: {},
    options,
  } as unknown as LoadedConfig,
  {},
)
t.matchSnapshot(
  reifyOpts,
  'should reify uninstalling a new dependency',
)
