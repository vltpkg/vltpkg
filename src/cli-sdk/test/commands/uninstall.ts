import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import { commandView } from '../fixtures/run.ts'

const options = {}
let log = ''

const Command = await t.mockImport<
  typeof import('../../src/commands/uninstall.ts')
>('../../src/commands/uninstall.ts', {
  '@vltpkg/graph': {
    async uninstall() {
      log += 'uninstall\n'
      return {
        graph: {
          toJSON: () => ({ uninstall: true }),
        },
      }
    },
  },
  '../../src/parse-add-remove-args.ts': {
    parseRemoveArgs: (conf: LoadedConfig) => {
      const items =
        conf.positionals.length > 0 ?
          `from ${conf.positionals.join(',')}`
        : ''
      const values =
        Object.keys(conf.values).length > 0 ?
          `, with values ${Object.entries(conf.values).join('=')}`
        : ''
      log += `parse remove args ${items}${values}\n`
      return { remove: new Map() }
    },
  },
})
t.matchSnapshot(Command.usage().usage(), 'usage')

// removes a package
log = ''
await Command.command({
  positionals: ['abbrev@2'],
  values: {},
  options,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should uninstall a dependency')

t.test('json', async t => {
  const output = await commandView(t, Command, {
    values: { view: 'json' },
  })
  t.strictSame(JSON.parse(output), { uninstall: true })
})
