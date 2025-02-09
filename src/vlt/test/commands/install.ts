import t from 'tap'
import { type LoadedConfig } from '../../src/config/index.ts'
import { commandView } from '../fixtures/run.ts'

const options = {}
let log = ''
t.afterEach(() => (log = ''))

const Command = await t.mockImport<
  typeof import('../../src/commands/install.ts')
>('../../src/commands/install.ts', {
  '../../src/install.js': {
    async install() {
      log += 'install\n'
      return {
        graph: {
          toJSON: () => ({ install: true }),
        },
      }
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

t.matchSnapshot(Command.usage().usage(), 'usage')

await Command.command({
  positionals: [],
  values: {},
  options,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should call install with expected options')

// adds a new package
await Command.command({
  positionals: ['abbrev@2'],
  values: { 'save-dev': true },
  options,
} as unknown as LoadedConfig)
t.matchSnapshot(log, 'should install adding a new dependency')

t.test('json', async t => {
  const output = await commandView(t, Command, {
    values: { view: 'json' },
  })
  t.strictSame(JSON.parse(output), { install: true })
})
