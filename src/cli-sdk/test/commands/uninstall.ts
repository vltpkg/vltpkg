import { PathScurry } from 'path-scurry'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { UninstallResult } from '../../src/commands/uninstall.ts'

const options = { scurry: new PathScurry() }
let log = ''

const Command = await t.mockImport<
  typeof import('../../src/commands/uninstall.ts')
>('../../src/commands/uninstall.ts', {
  '@vltpkg/graph': {
    async uninstall() {
      log += 'uninstall\n'
      return {
        graph: {},
      }
    },
  },
  '../../src/parse-add-remove-args.ts': {
    parseRemoveArgs: (conf: LoadedConfig, _scurry: PathScurry) => {
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
  get: (_key: string) => undefined,
} as LoadedConfig)
t.matchSnapshot(log, 'should uninstall a dependency')

t.strictSame(
  Command.views.json({
    graph: {
      toJSON: () => ({ install: true }),
    },
  } as unknown as UninstallResult),
  { install: true },
)

t.test('global uninstall flag', async t => {
  let applyGlobalCalled = false
  let unlinkRemovedBinsCalled = false
  const stderrMessages: string[] = []

  const GlobalCommand = await t.mockImport<
    typeof import('../../src/commands/uninstall.ts')
  >('../../src/commands/uninstall.ts', {
    '@vltpkg/graph': {
      async uninstall() {
        return { graph: {} }
      },
    },
    '../../src/parse-add-remove-args.ts': {
      parseRemoveArgs: () => ({ remove: new Map() }),
    },
    '../../src/global.ts': {
      applyGlobalConfig: () => {
        applyGlobalCalled = true
        return '/fake/global/dir'
      },
      unlinkRemovedBins: async () => {
        unlinkRemovedBinsCalled = true
        return ['cowsay']
      },
    },
    '../../src/output.ts': {
      stderr: (...args: unknown[]) => {
        stderrMessages.push(String(args[0]))
      },
    },
  })

  await GlobalCommand.command({
    positionals: ['cowsay'],
    values: {},
    options: { scurry: new PathScurry() },
    get: (key: string) => (key === 'global' ? true : undefined),
  } as unknown as LoadedConfig)

  t.ok(
    applyGlobalCalled,
    'should call applyGlobalConfig when --global is set',
  )
  t.ok(
    unlinkRemovedBinsCalled,
    'should call unlinkRemovedBins after uninstall',
  )
  t.ok(
    stderrMessages.some(m => m.includes('cowsay')),
    'should report removed binary names',
  )
})
