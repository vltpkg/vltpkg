import { Test } from 'tap'
import { join } from 'path'
import { type Command, type LoadedConfig } from '../../src/types.ts'

export type Testdir = Parameters<Test['testdir']>[0]

export const setupEnv = (t: Test) => {
  // fresh process.env on every test
  const cleanEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^VLT_/i.test(k)),
  )
  // not sure why this is required, but Windows tests fail without it.
  cleanEnv.PATH = process.env.PATH
  t.beforeEach(t =>
    t.intercept(process, 'env', { value: { ...cleanEnv } }),
  )
  return cleanEnv
}

export const mockConfig = async (t: Test) =>
  t.mockImport<typeof import('../../src/config/index.ts')>(
    '../../src/config/index.ts',
    // jackspeak definitions keep state so if we want a clean
    // config, we need a clean definitions file too
    {
      '../../src/config/definition.js': await t.mockImport(
        '../../src/config/definition.ts',
      ),
    },
  )

export type SetupCommand = {
  command: string
  testdir?: Testdir
  chdir?: string
  projectRoot?: string
  argv?: string[]
  reload?: boolean
  mocks?: Record<string, any>
}

export const chtestdir = (
  t: Test,
  testdir: SetupCommand['testdir'] = {},
  chdir: string = '',
) => {
  const dir = t.testdir(testdir)
  t.chdir(join(dir, chdir))
  return dir
}

export const mockCommandOutput = async <T>(
  t: Test,
  command: Command<T>,
  config: LoadedConfig,
) => {
  const { outputCommand } = await t.mockImport<
    typeof import('../../src/output.ts')
  >('../../src/output.ts')
  const logs = t.capture(console, 'log').args
  const errs = t.capture(console, 'error').args
  await outputCommand(command, config, { start: Date.now() })
  return { logs: logs(), errs: errs() }
}

export const setupCommand = async <T>(
  t: Test,
  {
    command: commandName,
    testdir = {},
    chdir = '',
    projectRoot = '',
    argv: baseArgv = [],
    reload = true,
    mocks = {},
  }: SetupCommand,
) => {
  const dir = chtestdir(t, testdir, chdir)
  const { Config } = await mockConfig(t)
  const Command = await t.mockImport<Command<T>>(
    join('../../src/commands', `${commandName}.ts`),
    mocks,
  )
  const loadConfig = async (...argv: string[]) => {
    const conf = await Config.load(
      t.testdirName,
      [commandName, ...baseArgv, ...argv],
      reload,
    )
    conf.projectRoot = join(dir, projectRoot)
    return conf
  }
  const runCommand = async (
    confOrArgv: LoadedConfig | string[] = [],
  ) => {
    const config =
      Array.isArray(confOrArgv) ?
        await loadConfig(...confOrArgv)
      : confOrArgv
    const { logs, errs } = await mockCommandOutput(t, Command, config)
    return {
      logs: logs.map(v => v[0]).join('\n'),
      errs: errs.map(v => v[0]).join('\n'),
    }
  }
  return {
    dir,
    command: Command.command,
    loadConfig,
    runCommand,
  }
}

export type CommandResultOptions = {
  positionals?: LoadedConfig['positionals']
  values?: Partial<LoadedConfig['values']>
  options?: Partial<LoadedConfig['options']>
}

export const commandView = async <T>(
  t: Test,
  command: Command<T>,
  {
    positionals = [],
    values = {},
    options = {},
  }: CommandResultOptions,
) => {
  const config = {
    positionals,
    values,
    options,
    get(k: string) {
      return values[k as keyof typeof values]
    },
  } as LoadedConfig
  const { logs } = await mockCommandOutput(t, command, config)
  return logs.map(v => v[0]).join('\n')
}
