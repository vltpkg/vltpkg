import type { Test } from 'tap'
import { spawn } from 'node:child_process'
import assert from 'node:assert'
import {
  publishedVariant,
  defaultVariants,
  Variants,
} from './variants.ts'
import type { Variant, VariantType } from './variants.ts'
import { join } from 'node:path'
import type { Bin } from '@vltpkg/infra-build'
import { rmSync } from 'node:fs'

export type FixtureDirContent = string | FixtureDir

export interface FixtureDir {
  [entry: string]: FixtureDirContent
}

export type FixtureName =
  | 'root'
  | 'project'
  | 'config'
  | 'cache'
  | 'data'
  | 'state'
  | 'runtime'

export type Fixtures = Record<FixtureName, FixtureDir>

export type SpawnCommandOptions = {
  dirs: Record<FixtureName, string>
  bin?: Bin
  env?: NodeJS.ProcessEnv
  debug?: boolean
}

export type SpawnCommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
}

export type CommandOptions = {
  bin?: Bin
  packageJson?: boolean | Record<string, unknown>
  env?: NodeJS.ProcessEnv
  debug?: boolean
} & Partial<Record<FixtureName, FixtureDir>>

export type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
  normalizedOutput: string
  dirs: Record<FixtureName, string>
}

export type Command = (
  t: Test,
  args?: string[],
  options?: CommandOptions,
) => Promise<CommandResult>

export type MultipleCommandOptions = CommandOptions & {
  test?: (
    t: Test,
    result: CommandResult & {
      variant: VariantType
      run: (
        args?: string[],
        options?: Omit<SpawnCommandOptions, 'dirs'>,
      ) => Promise<SpawnCommandResult>
    },
  ) => Promise<void>
  variants?: VariantType[]
}

// Remove env vars that might cause trouble for tests since
// we might be be using vlt or another tool to run these tests.
// Not all of these have been proven to cause problems but it
// errs on the side of removing more for a cleaner test environment.
const ENV = Object.entries(process.env).reduce<NodeJS.Process['env']>(
  (acc, [k, v]) => {
    if (!/^_?(tapjs|tap|npm|vlt|node|ts_node)(_|$)/i.test(k)) {
      acc[k] = v
    }
    return acc
  },
  {},
)

const spawnCommand = async (
  t: Test,
  variant: Variant,
  args: string[] = [],
  { dirs, env, debug, bin = 'vlt' }: SpawnCommandOptions,
) => {
  const [command, commandArgs = []] = variant.spawn(bin)
  return new Promise<SpawnCommandResult>((res, rej) => {
    const proc = spawn(command, [...commandArgs, ...args], {
      cwd: dirs.project,
      shell: true,
      windowsHide: true,
      env: {
        ...ENV,
        ...variant.env,
        ...env,
        // We stop walking to find config at $HOME so set that to the root
        // testdir that was created to ensure we never walk up to our own
        // project root.
        HOME: dirs.root,
        USERPROFILE: dirs.root,
        // Make sure tests are isolated by locking all XDG dirs to the testdir
        XDG_CONFIG_HOME: dirs.config,
        XDG_CACHE_HOME: dirs.cache,
        XDG_DATA_HOME: dirs.data,
        XDG_STATE_HOME: dirs.state,
        XDG_RUNTIME_DIR: dirs.runtime,
        // PATH is only set to what the variant needs
        PATH: variant.PATH ?? '',
      },
    })
    let stdout = ''
    let stderr = ''
    let output = ''
    proc.stdout.on('data', d => {
      const chunk = `${d.toString()}`
      stdout += chunk
      output += chunk
      if (debug) t.comment(chunk)
    })
    proc.stderr.on('data', d => {
      const chunk = `${d.toString()}`
      stderr += chunk
      output += chunk
      if (debug) t.comment(chunk)
    })
    proc
      .on('close', code => {
        res({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          output: output.trim(),
          status: code,
        })
      })
      .on('error', err => rej(err))
  })
}

export const runVariant = async (
  variant: Variant,
  t: Test,
  args?: string[],
  { packageJson = true, ...options }: CommandOptions = {},
): Promise<CommandResult> => {
  const cwd = t.testdir({
    project: {
      ...(packageJson ?
        {
          'package.json': JSON.stringify(
            packageJson === true ? { name: t.fullname } : packageJson,
            null,
            2,
          ),
        }
      : undefined),
      ...options.project,
    },
    config: { ...options.config },
    cache: { ...options.cache },
    data: { ...options.data },
    state: { ...options.state },
    runtime: { ...options.runtime },
    ...options.root,
  } satisfies Omit<Fixtures, 'root'>)

  const dirs: Record<FixtureName, string> = {
    root: cwd,
    project: join(cwd, 'project'),
    config: join(cwd, 'config'),
    cache: join(cwd, 'cache'),
    data: join(cwd, 'data'),
    state: join(cwd, 'state'),
    runtime: join(cwd, 'runtime'),
  }

  // This should not be necessary but the smoke-tests can be flaky with EBUSY or
  // ENOTEMPTY errors when tap does its cleanup. I don't _think_ this points to
  // any real bug in the vlt CLI so this explicit teardown function is a way to
  // help with the cleanup to make it less flaky.
  t.teardown(() => {
    for (const [key, dir] of Object.entries(dirs)) {
      if (key === 'root') continue
      rmSync(dir, { force: true, recursive: true })
    }
  })

  const result = await spawnCommand(t, variant, args, {
    dirs,
    ...options,
  })

  return {
    ...result,
    dirs,
    // `normalizedOutput` is used by t.strictSame to ensure variants produce
    // the same output, so we need to normalize the dir names.
    normalizedOutput: result.output.replaceAll(
      t.testdirName,
      '{{DIR_NAME}}',
    ),
  }
}

// Export all variants as individual commands
export const source: Command = (...args) =>
  runVariant(Variants.source, ...args)

export const denoSource: Command = (...args) =>
  runVariant(Variants.denoSource, ...args)

export const bundle: Command = (...args) =>
  runVariant(Variants.bundle, ...args)

export const denoBundle: Command = (...args) =>
  runVariant(Variants.denoBundle, ...args)

export const compile: Command = (...args) =>
  runVariant(Variants.compile, ...args)

// And export whatever is the currently published variant
export const runPublished: Command = (...args) =>
  runVariant(Variants[publishedVariant], ...args)

export const runMultiple = async (
  t: Test,
  args?: string[],
  {
    test,
    variants = defaultVariants,
    ...options
  }: MultipleCommandOptions = {},
) => {
  const ranVariants: [VariantType, CommandResult][] = []

  for (const variant of variants) {
    await t.test(variant, async t => {
      const result = await runVariant(
        Variants[variant],
        t,
        args,
        options,
      )
      await test?.(t, {
        ...result,
        variant,
        // allow tests to run followup commands for each variant
        run: (args, runOptions) =>
          spawnCommand(t, Variants[variant], args, {
            dirs: result.dirs,
            ...options,
            ...runOptions,
          }),
      })
      ranVariants.push([variant, result])
    })
  }

  t.equal(ranVariants.length, variants.length, 'ran all variants')

  // treat published variant as the default result for other tests
  // if it exists, otherwise just the first one
  const defaultResult =
    ranVariants.find(([v]) => v === publishedVariant) ??
    ranVariants[0]

  assert(defaultResult, 'no default result')

  // all commands should return the same output. this could get tricky
  // when testing commands that should error since stack traces, etc
  // will be different. if we want to test those in the future we can
  // make this check optional
  for (const [variant, result] of ranVariants) {
    t.equal(
      result.status,
      defaultResult[1].status,
      `status for ${variant} matches ${defaultResult[0]}`,
    )
    t.equal(
      result.normalizedOutput,
      defaultResult[1].normalizedOutput,
      `normalized output for ${variant} matches ${defaultResult[0]}`,
    )
  }

  return {
    ...defaultResult[1],
    variants: Object.fromEntries(ranVariants),
  }
}
