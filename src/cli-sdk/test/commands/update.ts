import { error } from '@vltpkg/error-cause'
import t from 'tap'
import type { LoadedConfig } from '../../src/config/index.ts'
import type { InstallResult } from '../../src/commands/install.ts'
import { isLazyView, loadLazyView } from '../../src/view.ts'

const options = {}
let log = ''
t.afterEach(() => (log = ''))

const Command = await t.mockImport<
  typeof import('../../src/commands/update.ts')
>('../../src/commands/update.ts', {
  '@vltpkg/graph': {
    async update() {
      log += 'update\n'
      return {
        graph: {},
      }
    },
  },
})

t.test('usage', t => {
  t.matchSnapshot(Command.usage().usage(), 'usage')
  t.end()
})

t.test('update with no arguments', async t => {
  log = ''
  await Command.command({
    positionals: [],
    values: {},
    options,
    explicit: {},
    get: (_key: string) => undefined,
  } as unknown as LoadedConfig)
  t.matchSnapshot(log, 'should call update with expected options')
})

t.test('unknown spec prefix from package.json', async t => {
  const { command } = await t.mockImport<
    typeof import('../../src/commands/update.ts')
  >('../../src/commands/update.ts', {
    '@vltpkg/graph': {
      async update() {
        throw error('Protocol nope: is not defined', {
          spec: 'bar@nope:bar@^2.x',
          found: 'nope:',
        })
      },
    },
  })
  await t.rejects(
    command({
      positionals: [],
      values: {},
      options,
      explicit: {},
      get: () => undefined,
    } as unknown as LoadedConfig),
    {
      message: /^Unknown spec prefix "nope:"/,
      cause: { code: 'ECONFIG' },
    },
  )
})

t.test('update with arguments throws error', async t => {
  await t.rejects(
    Command.command({
      positionals: ['some-package'],
      values: {},
      options,
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig),
    {
      message: 'Arguments are not yet supported for vlt update',
      cause: { code: 'EUSAGE' },
    },
  )
})

t.test('update with multiple arguments throws error', async t => {
  await t.rejects(
    Command.command({
      positionals: ['package-a', 'package-b'],
      values: {},
      options,
      get: (_key: string) => undefined,
    } as unknown as LoadedConfig),
    {
      message: 'Arguments are not yet supported for vlt update',
      cause: { code: 'EUSAGE' },
    },
  )
})

t.test('views.json returns graph toJSON', t => {
  const mockGraph = {
    buildQueue: [],
    graph: {
      toJSON: () => ({ updated: true }),
    },
  } as unknown as InstallResult

  t.strictSame(Command.views.json(mockGraph), {
    graph: { updated: true },
  })
  t.end()
})

t.test('views.human uses InstallReporter', async t => {
  t.ok(isLazyView(Command.views.human))
  const human = await loadLazyView(Command.views.human)
  t.equal(human.name, 'InstallReporter')
})

// Test JSON view with buildQueue
t.strictSame(
  Command.views.json({
    buildQueue: ['~~foo@1.0.0' as any, '~~bar@2.0.0' as any],
    graph: {
      toJSON: () => ({
        lockfileVersion: 1,
        options: {},
        nodes: {},
        edges: {},
      }),
    } as any,
  }),
  {
    buildQueue: ['~~foo@1.0.0', '~~bar@2.0.0'],
    message:
      '2 packages that will need to be built, run "vlt build" to complete the update.',
    graph: { lockfileVersion: 1, options: {}, nodes: {}, edges: {} },
  },
  'json view with buildQueue should include buildQueue, message, and graph',
)

t.test('persists spec config after update', async t => {
  const plan = {
    which: 'project',
    values: { registries: { loc: 'http://loc/' } },
  }
  const setup = async (opts: {
    plan?: typeof plan
    conflict?: boolean
    fail?: boolean
  }) => {
    let log = ''
    const Command = await t.mockImport<
      typeof import('../../src/commands/update.ts')
    >('../../src/commands/update.ts', {
      '@vltpkg/graph': {
        async update() {
          log += 'update\n'
          if (opts.fail) throw new Error('update failed')
          return { graph: { toJSON: () => ({}) } }
        },
      },
      '../../src/persist-spec-config.ts': {
        planSpecConfigPersist: () => {
          log += 'plan\n'
          if (opts.conflict) throw new Error('conflict')
          return opts.plan
        },
      },
    })
    const conf = {
      positionals: [],
      values: {},
      options: {},
      get: () => undefined,
      addConfigToFile: async (which: string, values: unknown) => {
        log += `write ${which} ${JSON.stringify(values)}\n`
      },
    } as unknown as LoadedConfig
    return {
      Command,
      run: () => Command.command(conf),
      log: () => log,
    }
  }

  t.test('writes after update', async t => {
    const { Command, run, log } = await setup({ plan })
    const res = await run()
    t.equal(
      log(),
      'plan\nupdate\nwrite project {"registries":{"loc":"http://loc/"}}\n',
    )
    t.strictSame(res.persistedConfig, plan)
    t.match(Command.views.json(res), { persistedConfig: plan })
  })
  t.test('no plan, no write', async t => {
    const { run, log } = await setup({})
    t.equal((await run()).persistedConfig, undefined)
    t.equal(log(), 'plan\nupdate\n')
  })
  t.test('failed update, no write', async t => {
    const { run, log } = await setup({ plan, fail: true })
    await t.rejects(run(), { message: 'update failed' })
    t.equal(log(), 'plan\nupdate\n')
  })
  t.test('conflict, no update', async t => {
    const { run, log } = await setup({ plan, conflict: true })
    await t.rejects(run(), { message: 'conflict' })
    t.equal(log(), 'plan\n')
  })
  t.end()
})
