import type { Test } from 'tap'
import { spawn } from 'node:child_process'
import { join, resolve } from 'node:path'
import { existsSync, readdirSync } from 'node:fs'
import assert from 'node:assert'
import { BINS_DIR as SOURCE_DIR } from '@vltpkg/infra-build'

export const BUNDLE_DIR = resolve(
  import.meta.dirname,
  '../../.build-bundle',
)

export const COMPILE_DIR = resolve(
  import.meta.dirname,
  '../../.build-compile',
)

export const ROOT_COMPILE_DIR = resolve(
  import.meta.dirname,
  '../../.build-compile-root',
)

export type Variants = 'src' | 'bundle' | 'compile' | 'rootCompile'

const DEFAULT_VARIANTS: Variants[] = ['src']
if (existsSync(BUNDLE_DIR)) {
  DEFAULT_VARIANTS.push('bundle')
}
if (existsSync(COMPILE_DIR)) {
  DEFAULT_VARIANTS.push('compile')
}
if (existsSync(ROOT_COMPILE_DIR)) {
  DEFAULT_VARIANTS.push('rootCompile')
}

export type CommandOptions = {
  testdir?: Parameters<Test['testdir']>[0]
  env?: NodeJS.ProcessEnv
}

export type RunOptions = CommandOptions & {
  variants?: Variants[]
}

export type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
}

export type Command = (
  t: Test,
  bin: string,
  args: string[],
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

const findBin = (dir: string, bin: string) => {
  const contents = readdirSync(dir)
  const maybeBins = ['', '.exe', '.js', '.ts'].map(
    ext => `${bin}${ext}`,
  )
  const binToRun = contents.find(f => maybeBins.includes(f))
  assert(binToRun, `could not find bin: ${bin}`)
  return join(dir, binToRun)
}

const runBase = async (
  t: Test,
  dir: string,
  bin: string,
  args: string[],
  { env = {}, testdir = {} }: CommandOptions = {},
) => {
  const cwd = t.testdir(testdir)
  const binToRun = findBin(
    dir === ROOT_COMPILE_DIR ?
      join(ROOT_COMPILE_DIR, 'node_modules', '.bin')
    : dir,
    bin,
  )

  const [command, commandArgs] =
    dir === COMPILE_DIR || dir === ROOT_COMPILE_DIR ?
      [binToRun, args]
    : [process.execPath, [binToRun, ...args]]

  return new Promise<CommandResult>((res, rej) => {
    const proc = spawn(command, commandArgs, {
      cwd: cwd,
      shell: true,
      windowsHide: true,
      env: {
        ...ENV,
        ...env,
        // Config will always stop at $HOME so override that one
        // level about the testdir so we dont go back up to our
        // own monorepo root
        HOME: cwd,
        USERPROFILE: cwd,
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
        const replace = (s: string) =>
          s
            .replaceAll(/\\+/g, '\\')
            .replaceAll(t.testdirName, '{{DIR_NAME}}')
            .trim()
        res({
          stdout: replace(stdout),
          stderr: replace(stderr),
          output: replace(output),
          status: code,
        })
      })
      .on('error', err => rej(err))
  })
}

export const src = (
  t: Test,
  bin: string,
  args: string[],
  options?: CommandOptions,
) =>
  runBase(t, SOURCE_DIR, bin, args, {
    ...options,
    env: {
      ...options?.env,
      NODE_OPTIONS: '--no-warnings --experimental-strip-types',
    },
  })

export const bundle = (
  t: Test,
  bin: string,
  args: string[],
  options?: CommandOptions,
) => runBase(t, BUNDLE_DIR, bin, args, options)

export const compile = (
  t: Test,
  bin: string,
  args: string[],
  options?: CommandOptions,
) => runBase(t, COMPILE_DIR, bin, args, options)

export const rootCompile = (
  t: Test,
  bin: string,
  args: string[],
  options?: CommandOptions,
) => runBase(t, ROOT_COMPILE_DIR, bin, args, options)

export const run = async (
  t: Test,
  bin: string,
  args: string[],
  { variants = DEFAULT_VARIANTS, ...options }: RunOptions = {},
) => {
  const ranVariants: [Variants, CommandResult][] = []

  t.comment(variants.join(', '))

  if (variants.includes('src')) {
    await t.test('src', async t => {
      ranVariants.push(['src', await src(t, bin, args, options)])
    })
  }

  if (variants.includes('bundle')) {
    await t.test('bundle', async t => {
      ranVariants.push([
        'bundle',
        await bundle(t, bin, args, options),
      ])
    })
  }

  if (variants.includes('compile')) {
    await t.test('compile', async t => {
      ranVariants.push([
        'compile',
        await compile(t, bin, args, options),
      ])
    })
  }

  if (variants.includes('rootCompile')) {
    await t.test('root compile', async t => {
      ranVariants.push([
        'rootCompile',
        await rootCompile(t, bin, args, options),
      ])
    })
  }

  t.equal(ranVariants.length, variants.length, 'ran all variants')

  // treat bundle as the default result for other tests
  const defaultResult = (ranVariants.find(([k]) => k === 'bundle') ??
    ranVariants[0])?.[1]
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
