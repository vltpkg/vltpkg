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
