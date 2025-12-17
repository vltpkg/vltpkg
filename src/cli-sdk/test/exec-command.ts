import t from 'tap'
import './commands/exec-local.ts'
import './commands/run-exec.ts'
import './commands/run.ts'

import type { RunResult } from '@vltpkg/run'
import { exec, execFG } from '@vltpkg/run'
import type { Monorepo } from '@vltpkg/workspaces'
import type { LoadedConfig } from '../src/config/index.ts'
import { ExecCommand } from '../src/exec-command.ts'
import { resolve } from 'node:path'
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
    const e = new ExecCommand(
      conf as unknown as LoadedConfig,
      dummyBG,
      dummyFG,
    )
    await e.run()
    t.equal(e.getCwd(), resolve(dir, 'src/a'))
  }
})
