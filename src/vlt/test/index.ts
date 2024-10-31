import t, { type Test } from 'tap'
import { type Jack, jack } from 'jackspeak'
import {
  setupEnv,
  mockConfig,
  type Testdir,
  chtestdir,
} from './fixtures/run.js'
import { error } from '@vltpkg/error-cause'

setupEnv(t)

export const run = async (
  t: Test,
  {
    commandName,
    testdir,
    chdir,
    argv = [],
    command,
  }: {
    commandName: string
    testdir: Testdir
    chdir?: string
    argv?: string[]
    command?: {
      command: () => Promise<void>
      usage?: () => Jack
    }
  },
) => {
  chtestdir(t, testdir, chdir)
  t.intercept(process, 'argv', {
    value: [process.execPath, 'index.js', commandName, ...argv],
  })
  const logs: any[] = []
  const errs: any[] = []
  t.capture(console, 'log', (...msg: any[]) => logs.push(msg))
  t.capture(console, 'error', (...msg: any[]) => errs.push(msg))
  const Config = await mockConfig(t)
  const index = await t.mockImport(`../src/index.js`, {
    '../src/config/index.js': Config,
    ...(command ?
      { [`../src/commands/${commandName}.js`]: command }
    : {}),
  })
  await index.default()
  return {
    config: await Config.Config.load(),
    logs,
    errs,
  }
}

t.test('infer workspace', async t => {
  let commandRun = false
  const { config } = await run(t, {
    commandName: 'install',
    command: {
      command: async () => {
        commandRun = true
      },
    },
    testdir: {
      'vlt-workspaces.json': '"src/foo"',
      src: {
        foo: {
          'package.json': JSON.stringify({ name: '@acme/foo' }),
        },
      },
    },
    chdir: 'src/foo',
  })
  t.equal(commandRun, true)
  t.strictSame(config.get('workspace'), ['src/foo'])
})

t.test('print usage', async t => {
  let commandRun = false
  const { logs } = await run(t, {
    commandName: 'install',
    argv: ['-h'],
    command: {
      command: async () => {
        commandRun = true
      },
      usage: () =>
        jack({
          usage: 'im helping!!! im helping youuuuuu',
        }),
    },
    testdir: {
      '.git': {},
      'vlt.json': JSON.stringify({}),
    },
  })
  t.equal(commandRun, false)
  t.strictSame(
    logs
      .flatMap(e => e)
      .flatMap(e => e.split('\n'))
      .map(e => e.trim())
      .filter(Boolean),
    ['Usage:', 'im helping!!! im helping youuuuuu'],
  )
})

t.test('print EUSAGE error', async t => {
  const { logs, errs } = await run(t, {
    commandName: 'config',
    argv: ['ls'],
    command: {
      command: async () => {
        throw error('there was a problem', {
          code: 'EUSAGE',
        })
      },
      usage: () =>
        jack({
          usage: 'im helping!!! im helping youuuuuu',
        }),
    },
    testdir: {
      '.git': {},
      'vlt.json': JSON.stringify({}),
    },
  })
  t.strictSame(logs, [])
  t.strictSame(
    errs
      .flatMap(e => e)
      .flatMap(e => e.split('\n'))
      .map(e => e.trim())
      .filter(Boolean),
    [
      'Usage:',
      'im helping!!! im helping youuuuuu',
      'Error: there was a problem',
    ],
  )
  t.equal(process.exitCode, 1)
  process.exitCode = undefined
})
