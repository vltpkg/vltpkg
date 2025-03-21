import type { Test } from 'tap'
import { spawn } from 'node:child_process'
import assert from 'node:assert'
import {
  publishedVariant,
  defaultVariants,
  Variants,
} from './variants.ts'
import type { Variant, VariantType } from './variants.ts'
import { stripVTControlCharacters } from 'node:util'
import { join } from 'node:path'

type FixtureDirContent = string | FixtureDir
interface FixtureDir {
  [entry: string]: FixtureDirContent
}

export type CommandOptions = {
  project?: FixtureDir
  testdir?: FixtureDir
  packageJson?: Record<string, unknown>
  env?: NodeJS.ProcessEnv
  stripAnsi?: boolean
}

export type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
  project: string
  dir: string
}

export type Command = (
  t: Test,
  bin?: string,
  args?: string[],
  options?: CommandOptions,
) => Promise<CommandResult>

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

export const runBase = async (
  variant: Variant,
  t: Test,
  bin = 'vlt',
  args: string[] = [],
  {
    env = {},
    packageJson,
    project,
    testdir: testdirContents,
    stripAnsi,
  }: CommandOptions = {},
) => {
  const testdir = t.testdir({
    home: {},
    cache: {},
    data: {},
    state: {},
    runtime: {},
    project: {
      ...(packageJson ?
        { 'package.json': JSON.stringify(packageJson) }
      : {}),
      ...project,
    },
    ...testdirContents,
  })
  const { dir } = variant

  const command =
    typeof variant.command === 'function' ?
      variant.command({ bin })
    : variant.command

  const commandArgs =
    variant.args ? [...variant.args({ dir, bin }), ...args] : args

  return new Promise<CommandResult>((res, rej) => {
    const proc = spawn(command, commandArgs, {
      cwd: join(testdir, 'project'),
      shell: true,
      windowsHide: true,
      env: {
        ...ENV,
        ...variant.env,
        ...env,
        // Config will always stop at $HOME so override that one
        // level about the testdir so we dont go back up to our
        // own monorepo root
        HOME: testdir,
        USERPROFILE: testdir,
        // Make sure tests are isolated
        XDG_CONFIG_HOME: join(testdir, 'home'),
        XDG_CACHE_HOME: join(testdir, 'cache'),
        XDG_DATA_HOME: join(testdir, 'data'),
        XDG_STATE_HOME: join(testdir, 'state'),
        XDG_RUNTIME_DIR: join(testdir, 'runtime'),
        // PATH is only set to what the variant needs
        PATH:
          typeof variant.path === 'function' ?
            variant.path({ dir })
          : variant.path,
      },
    })
    let stdout = ''
    let stderr = ''
    let output = ''
    proc.stdout.on('data', d => {
      stdout += `${d.toString()}`
      output += `${d.toString()}`
    })
    proc.stderr.on('data', d => {
      stderr += `${d.toString()}`
      output += `${d.toString()}`
    })
    proc
      .on('close', code => {
        const clean = (s: string) => {
          const cleaned = s
            .replaceAll(/\\+/g, '\\')
            .replaceAll(t.testdirName, '{{DIR_NAME}}')
            .trim()
          return stripAnsi ?
              stripVTControlCharacters(cleaned)
            : cleaned
        }
        res({
          stdout: clean(stdout),
          stderr: clean(stderr),
          output: clean(output),
          status: code,
          dir: testdir,
          project: join(testdir, 'project'),
        })
      })
      .on('error', err => rej(err))
  })
}

export const runVariant: Record<
  Exclude<VariantType, 'rootCompile' | 'rootCompileNoScripts'>,
  Command
> = {
  source: (...args) => runBase(Variants.source, ...args),
  denoSource: (...args) => runBase(Variants.denoSource, ...args),
  bundle: (...args) => runBase(Variants.bundle, ...args),
  denoBundle: (...args) => runBase(Variants.denoBundle, ...args),
  compile: (...args) => runBase(Variants.compile, ...args),
}

// The default run command will use whatever is configured as
// the published variant
export const run: Command = (...args) =>
  runBase(Variants[publishedVariant], ...args)

export const runMatch = async (
  t: Test,
  bin: string,
  args?: string[],
  {
    test,
    variants = defaultVariants,
    ...options
  }: CommandOptions & {
    variants?: VariantType[]
    test?: (
      t: Test,
      result: CommandResult & { variant: VariantType },
    ) => Promise<void>
  } = {},
) => {
  const ranVariants: [VariantType, CommandResult][] = []

  for (const variant of variants) {
    await t.test(variant, async t => {
      const result = await runBase(
        Variants[variant],
        t,
        bin,
        args,
        options,
      )
      await test?.(t, { ...result, variant })
      ranVariants.push([variant, result])
    })
  }

  t.equal(ranVariants.length, variants.length, 'ran all variants')

  // treat published variant as the default result for other tests
  // if it exists, otherwise just the first one
  const defaultResult = (ranVariants.find(
    ([k]) => k === publishedVariant,
  ) ?? ranVariants[0])?.[1]
  assert(defaultResult, 'no default variant')

  // all commands should return the same output. this could get tricky
  // when testing commands that should error since stack traces, etc
  // will be different. if we want to test those in the future we can
  // make this check optional
  for (const [variant, res] of ranVariants) {
    t.strictSame(
      { status: res.status, output: res.output },
      { status: defaultResult.status, output: defaultResult.output },
      `output for ${variant} matches default`,
    )
  }

  return {
    ...defaultResult,
    variants: Object.fromEntries(ranVariants),
  }
}
