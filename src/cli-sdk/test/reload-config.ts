import t from 'tap'

let unloadCalls: ('user' | 'project')[] = []
let loadCalls: [string, string[], boolean, boolean][] = []
let packageInfoLoads = 0
const parsedConfig = {
  options: { projectRoot: '/tmp/project' },
  loadPackageInfo: async () => {
    packageInfoLoads++
  },
}

const { reloadConfig } = await t.mockImport<
  typeof import('../src/reload-config.ts')
>('../src/reload-config.ts', {
  '@vltpkg/vlt-json': {
    unload: (which?: 'user' | 'project') => {
      if (which) unloadCalls.push(which)
    },
  },
  '../src/config/index.ts': {
    Config: {
      load: async (
        folder: string,
        argv: string[],
        fresh: boolean,
        allowGlobal: boolean,
      ) => {
        loadCalls.push([folder, argv, fresh, allowGlobal])
        return parsedConfig
      },
    },
  },
})

t.beforeEach(() => {
  unloadCalls = []
  loadCalls = []
})

t.test('reloadConfig unloads caches and loads config', async t => {
  const folder = '/tmp/project'

  const result = await reloadConfig(folder)

  t.same(unloadCalls, ['user', 'project'])
  t.equal(loadCalls.length, 1)
  t.equal(loadCalls[0]?.[0], folder)
  t.same(loadCalls[0]?.[1], process.argv)
  t.equal(loadCalls[0]?.[2], true)
  t.equal(loadCalls[0]?.[3], false)
  t.equal(result, parsedConfig)
  t.equal(packageInfoLoads, 1, 'loads package-info for host contexts')
})
