import type { Test } from 'tap'
import { spawn } from 'node:child_process'
import assert from 'node:assert'
import { publishedVariant, Variants } from './variants.ts'
import type { Variant, VariantType } from './variants.ts'
import { stripVTControlCharacters } from 'node:util'

const DEFAULT_VARIANTS = Object.values(Variants)
  .filter(v => v.default)
  .map(v => v.type)

export type CommandOptions = {
  testdir?: Parameters<Test['testdir']>[0]
  env?: NodeJS.ProcessEnv
  stripAnsi?: boolean
}

export type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
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

const runBase = async (
  variant: Variant,
  t: Test,
  bin = 'vlt',
  args: string[] = [],
  { env = {}, testdir = {}, stripAnsi }: CommandOptions = {},
) => {
  const cwd = t.testdir(testdir)
  const { dir } = variant

  const command =
    typeof variant.command === 'function' ?
      variant.command({ bin })
    : variant.command

  const commandArgs =
    variant.arg0 ? [variant.arg0({ dir, bin }), ...args] : args

  return new Promise<CommandResult>((res, rej) => {
    const proc = spawn(command, commandArgs, {
      cwd: cwd,
      shell: true,
      windowsHide: true,
      env: {
        ...ENV,
        ...variant.env,
        ...env,
        // Config will always stop at $HOME so override that one
        // level about the testdir so we dont go back up to our
        // own monorepo root
        HOME: cwd,
        USERPROFILE: cwd,
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
        })
      })
      .on('error', err => rej(err))
  })
}

export const src: Command = (...args) =>
  runBase(Variants.source, ...args)

export const bundle: Command = (...args) =>
  runBase(Variants.bundle, ...args)

export const compile: Command = (...args) =>
  runBase(Variants.compile, ...args)

export const rootCompile: Command = (...args) =>
  runBase(Variants.rootCompile, ...args)

export const rootCompileNoScripts: Command = (...args) =>
  runBase(Variants.rootCompileNoScripts, ...args)

// The default run command will use whatever is configured as
// the published variant
export const run: Command = (...args) =>
  runBase(Variants[publishedVariant], ...args)

export const runMatch = async (
  t: Test,
  bin: string,
  args?: string[],
  options: CommandOptions = {},
) => {
  const ranVariants: [VariantType, CommandResult][] = []

  for (const variant of DEFAULT_VARIANTS) {
    await t.test(variant, async t => {
      ranVariants.push([
        variant,
        await runBase(Variants[variant], t, bin, args, options),
      ])
    })
  }

  t.equal(
    ranVariants.length,
    DEFAULT_VARIANTS.length,
    'ran all variants',
  )

  // treat bundle as the default result for other tests
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
      res,
      defaultResult,
      `output for ${variant} matches default`,
    )
  }

  return defaultResult
}
