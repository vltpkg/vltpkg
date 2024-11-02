import t, { Test } from 'tap'
import { Jack, jack } from 'jackspeak'
import {
  setupEnv,
  mockConfig,
  Testdir,
  chtestdir,
} from './fixtures/run.js'

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
      usage?: () => Promise<Jack>
    }
  },
) => {
  chtestdir(t, testdir, chdir)
  t.intercept(process, 'argv', {
    value: [process.execPath, 'index.js', commandName, ...argv],
  })
  const logs: any[] = []
  t.capture(console, 'log', (...msg: any[]) => logs.push(msg))
  const config = await mockConfig(t)
  const index = await t.mockImport(`../src/index.js`, {
    '../src/config/index.js': config,
    ...(command ?
      { [`../src/commands/${commandName}.js`]: command }
    : {}),
  })
  await index.default()
  return {
    config: await config.Config.load(),
    logs,
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
      usage: async () =>
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
  t.equal(logs.length, 1)
  t.equal(logs[0].length, 1)
  t.strictSame(
    logs[0][0].split('\n').map((l: string) => l.trim()),
    ['Usage:', 'im helping!!! im helping youuuuuu', ''],
  )
})
