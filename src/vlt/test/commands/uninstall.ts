import t from 'tap'
import { type LoadedConfig } from '../../src/config/index.ts'

const options = {}
let log = ''

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/uninstall.ts')
>('../../src/commands/uninstall.ts', {
  '../../src/uninstall.js': {
    async uninstall() {
      log += 'uninstall\n'
    },
  },
  '../../src/parse-add-remove-args.js': {
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
t.matchSnapshot(usage().usage(), 'usage')

// removes a package
log = ''
await command({
  positionals: ['abbrev@2'],
  values: {},
  options,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should uninstall a dependency')
