// just a stub for now
import t from 'tap'
import { LoadedConfig } from '../../src/config/index.js'

const reifies: any[] = []

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/install.js')
>('../../src/commands/install.js', {
  '@vltpkg/graph': {
    buildIdeal: async () => 'buildideal result',
    actual: {
      load: () => 'actual.load result',
    },
    reify: async (reifyOptions: any) => {
      reifies.push(reifyOptions)
    },
  },
})
t.type(usage, 'string')
await command({ positionals: [] } as unknown as LoadedConfig)
t.strictSame(reifies, [
  {
    actual: 'actual.load result',
    graph: 'buildideal result',
    loadManifests: true,
  },
])
