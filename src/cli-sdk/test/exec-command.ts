import t from 'tap'
import './commands/exec-local.ts'
import './commands/run-exec.ts'
import './commands/run.ts'

import type { RunResult } from '@vltpkg/run'
import { exec, execFG } from '@vltpkg/run'
import type { Monorepo } from '@vltpkg/workspaces'
import type { LoadedConfig } from '../src/config/index.ts'
import { ExecCommand } from '../src/exec-command.ts'
import type { RunnerOptions } from '../src/exec-command.ts'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { unload } from '@vltpkg/vlt-json'

t.test('basic', t => {
  const e = new ExecCommand(
    {
      projectRoot: t.testdirName,
      positionals: [],
      get() {},
      options: {
        packageJson: {
          read: () => ({}),
        },
      },
      values: {},
    } as unknown as LoadedConfig,
    exec,
    execFG,
  )

  t.equal(e.defaultArg0(), e.interactiveShell())
  t.equal(e.fgArg()?.['script-shell'], false)
  t.throws(() =>
    (e as typeof e & { monorepo: Monorepo }).noArgsMulti(),
  )
  t.equal(e.view, 'human')
  t.end()
})

t.test('with view', t => {
  const e = new ExecCommand(
    {
      projectRoot: t.testdirName,
      positionals: [],
      get() {},
      options: {
        packageJson: {
          read: () => ({}),
        },
      },
      values: {
        view: 'inspect',
      },
    } as unknown as LoadedConfig,
    exec,
    execFG,
  )
  t.equal(e.view, 'inspect')
  t.equal(
    e.printResult('path', {} as unknown as RunResult),
    undefined,
  )
  t.end()
})

t.test('printResult multi-workspace formatting', t => {
  const { exitCode } = process
  const logs = t.capture(console, 'log').args
  const e = new ExecCommand(
    {
      projectRoot: t.testdirName,
      positionals: ['build'],
      get() {},
      options: {
        packageJson: {
          read: () => ({}),
        },
      },
      values: {},
    } as unknown as LoadedConfig,
    exec,
    execFG,
  )

  // success with timing >= 1s
  e.printResult(
    'packages/ui',
    {
      command: 'tsc',
      args: [],
      cwd: '/tmp',
      stdout: '',
      stderr: '',
      status: 0,
      signal: null,
    },
    'build',
    3100,
  )
  const successLogs = logs()
  t.equal(successLogs.length, 1)
  t.match(successLogs[0]?.[0], /packages\/ui.*✓ build \(3\.1s\)/)

  // failure with signal
  e.printResult(
    'packages/api',
    {
      command: 'tsc',
      args: [],
      cwd: '/tmp',
      stdout: '',
      stderr: '',
      status: null,
      signal: 'SIGTERM',
    } as unknown as RunResult,
    'build',
    500,
  )
  const failLogs = logs()
  t.equal(failLogs.length, 1)
  t.match(
    failLogs[0]?.[0],
    /packages\/api.*✗ build \(500ms\)\s+signal SIGTERM/,
  )
  process.exitCode = exitCode
  t.end()
})

t.test('getCwd', async t => {
  // fallback to process.cwd() when no nodes/monorepo
  // This matches npx behavior and is required for tools like node-gyp
  // that must run in the directory where they were invoked
  {
    const e = new ExecCommand(
      {
        projectRoot: t.testdirName,
        positionals: [],
        get() {},
        options: {
          packageJson: {
            read: () => ({}),
          },
        },
        values: {},
      } as unknown as LoadedConfig,
      (async () => ({})) as any,
      (async () => ({})) as any,
    )
    t.equal(e.getCwd(), process.cwd())
  }

  // when nodes are selected via --scope, cwd is the first node absolute path
  {
    const dir = t.testdir({
      'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
      'package.json': '{}',
      src: {
        a: { 'package.json': JSON.stringify({ name: 'a' }) },
        b: { 'package.json': JSON.stringify({ name: 'b' }) },
      },
      '.git': {},
    })
    t.chdir(dir)
    const { Config } = await t.mockImport<
      typeof import('../src/config/index.ts')
    >('../src/config/index.ts')
    unload()
    const conf = await Config.load(t.testdirName, [])
    conf.projectRoot = dir
    conf.values.scope = ':workspace#a'
    const dummyBG = (async () => ({
      command: 'x',
      args: [],
      cwd: dir,
      stdout: null,
      stderr: null,
      status: 0,
      signal: null,
    })) as any
    const dummyFG = dummyBG
    const e = new ExecCommand(conf, dummyBG, dummyFG)
    await e.run()
    t.equal(e.getCwd(), resolve(dir, 'src/a'))
  }
})

t.test('a failed workspace aborts the others', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
    'package.json': '{}',
    src: {
      a: { 'package.json': JSON.stringify({ name: 'a' }) },
      b: { 'package.json': JSON.stringify({ name: 'b' }) },
    },
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../src/config/index.ts')
  >('../src/config/index.ts')
  unload()
  const conf = await Config.load(t.testdirName, ['exec', 'x'])
  conf.projectRoot = dir
  conf.values.recursive = true
  const signals = new Map<string, AbortSignal | undefined>()
  const bg = (async ({ cwd, signal }: RunnerOptions) => {
    signals.set(cwd, signal)
    if (cwd === resolve(dir, 'src/a')) {
      // b is running by now
      await delay(50)
      throw new Error('a failed')
    }
    await new Promise(r => signal?.addEventListener('abort', r))
    throw new Error('aborted')
  }) as any
  const e = new ExecCommand(conf, bg, bg)
  await t.rejects(e.run(), {
    cause: { cause: { message: 'a failed' } },
  })
  t.equal(signals.get(resolve(dir, 'src/b'))?.aborted, true)
})

t.test('--scope targets run in dependency order', async t => {
  const dir = t.testdir({
    'vlt.json': JSON.stringify({ workspaces: 'src/*' }),
    'package.json': JSON.stringify({ name: 'root' }),
    src: {
      a: {
        'package.json': JSON.stringify({
          name: 'a',
          version: '1.0.0',
          dependencies: { b: 'workspace:*' },
        }),
      },
      b: {
        'package.json': JSON.stringify({
          name: 'b',
          version: '1.0.0',
        }),
      },
    },
    '.git': {},
  })
  t.chdir(dir)
  const { Config } = await t.mockImport<
    typeof import('../src/config/index.ts')
  >('../src/config/index.ts')
  unload()
  const conf = await Config.load(t.testdirName, ['run', 'hello'])
  conf.projectRoot = dir
  conf.values.scope = ':workspace#a, :workspace#b'
  conf.values.view = 'json'
  const cwds: string[] = []
  const dummyBG = (async ({ cwd }: { cwd: string }) => {
    cwds.push(cwd)
    return {
      command: 'hello',
      args: [],
      cwd,
      stdout: '',
      stderr: '',
      status: 0,
      signal: null,
    }
  }) as unknown as typeof exec
  const e = new ExecCommand(conf, dummyBG, execFG)
  const result = await e.run()
  t.strictSame(cwds, [resolve(dir, 'src/b'), resolve(dir, 'src/a')])
  t.strictSame(Object.keys(result), ['src/b', 'src/a'])
  t.strictSame(
    e.getTargets().map(t => t.label),
    ['src/b', 'src/a'],
  )
})
