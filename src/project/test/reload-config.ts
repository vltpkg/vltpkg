import t from 'tap'

let unloadCalls: ('user' | 'project')[] = []
let loadCalls: [string, string[], boolean][] = []
const parsedConfig = { options: { projectRoot: '/tmp/project' } }

const { reloadConfig } = await t.mockImport<
  typeof import('../src/reload-config.ts')
>('../src/reload-config.ts', {
  '@vltpkg/vlt-json': {
    unload: (which?: 'user' | 'project') => {
      if (which) unloadCalls.push(which)
    },
  },
  '@vltpkg/cli-sdk/config': {
    Config: {
      load: async (
        folder: string,
        argv: string[],
        fresh: boolean,
      ) => {
        loadCalls.push([folder, argv, fresh])
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
  t.equal(result, parsedConfig)
})
