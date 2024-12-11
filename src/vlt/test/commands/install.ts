import t from 'tap'
import { type LoadedConfig } from '../../src/config/index.js'

const options = {}
let log = ''

const { usage, command } = await t.mockImport<
  typeof import('../../src/commands/install.js')
>('../../src/commands/install.js', {
  '../../src/install.js': {
    async install() {
      log += 'install\n'
    },
  },
  '../../src/parse-add-remove-args.js': {
    parseAddArgs: (conf: LoadedConfig) => {
      const items =
        conf.positionals.length > 0 ?
          `from ${conf.positionals.join(',')}`
        : ''
      const values =
        Object.keys(conf.values).length > 0 ?
          `, with values ${Object.entries(conf.values).join('=')}`
        : ''
      log += `parse add args ${items}${values}\n`
      return { add: new Map() }
    },
  },
})
t.matchSnapshot(usage().usage(), 'usage')
await command({
  positionals: [],
  values: {},
  options,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should call install with expected options')

// adds a new package
log = ''
await command({
  positionals: ['abbrev@2'],
  values: { 'save-dev': true },
  options,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should install adding a new dependency')
