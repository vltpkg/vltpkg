import t from 'tap'
import type { Test } from 'tap'
import { jack } from 'jackspeak'
import type { Jack } from 'jackspeak'
import { setupEnv, mockConfig, chtestdir } from './fixtures/run.ts'
import type { Testdir } from './fixtures/run.ts'
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
    value: [process.execPath, 'index.ts', commandName, ...argv],
  })
  const logs: any[] = []
  const errs: any[] = []
  t.capture(console, 'log', (...msg: any[]) => logs.push(msg))
  t.capture(console, 'error', (...msg: any[]) => errs.push(msg))
  const Config = await mockConfig(t)
  const index = await t.mockImport('../src/index.ts', {
    '../src/config/index.ts': Config,
    ...(command ?
      { [`../src/commands/${commandName}.ts`]: command }
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

t.test('print version', async t => {
  const { logs } = await run(t, {
    commandName: '',
    argv: ['-v'],
    testdir: {
      '.git': {},
      'vlt.json': JSON.stringify({}),
    },
  })
  t.matchOnly(
    logs.flatMap(e => e).flatMap(e => e.split('\n')),
    [/^\d\.\d\.\d/],
  )
})

t.test('print EUSAGE error', async t => {
  const { exitCode } = process
  const exits = t.capture(process, 'exit').args
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
  t.strictSame(exits(), [[1]])
  t.equal(process.exitCode, 1)
  if (t.passing()) process.exitCode = exitCode
})
