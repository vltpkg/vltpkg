import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { Graph } from '@vltpkg/graph'

const options = {}
let log = ''
t.afterEach(() => (log = ''))

const Command = await t.mockImport<
  typeof import('../../src/commands/install.ts')
>('../../src/commands/install.ts', {
  '@vltpkg/graph': {
    async install() {
      log += 'install\n'
      return {
        graph: {},
      }
    },
  },
  '../../src/parse-add-remove-args.ts': {
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

t.strictSame(
  Command.views.json({
    toJSON: () => ({ install: true }),
  } as unknown as Graph),
  { install: true },
)

t.test('frozen-lockfile flag', async t => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'test',
      version: '1.0.0',
    }),
    'vlt-lock.json': JSON.stringify({
      lockfileVersion: 0,
      options: {},
      nodes: {},
      edges: {},
    }),
  })

  const options = {
    projectRoot: dir,
    frozenLockfile: true,
  }

  let log = ''
  const Command = await t.mockImport<
    typeof import('../../src/commands/install.ts')
  >('../../src/commands/install.ts', {
    '@vltpkg/graph': {
      async install(opts: any, add: any) {
        log += `install frozenLockfile=${opts.frozenLockfile}\n`
        if (add && add.size > 0) {
          log += `add packages: ${add.size}\n`
        }
        return {
          graph: {},
        }
      },
      asDependency: (dep: any) => dep,
    },
  })

  await Command.command({
    positionals: [],
    values: {},
    options,
  } as unknown as LoadedConfig)

  t.match(
    log,
    /install frozenLockfile=true/,
    'should pass frozenLockfile to install',
  )
})
