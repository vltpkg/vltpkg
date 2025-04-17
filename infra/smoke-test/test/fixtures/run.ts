import t from 'tap'
import type { Test } from 'tap'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import assert from 'node:assert'
import { stripVTControlCharacters } from 'node:util'
import { realpathSync } from 'node:fs'
import { ansiToAnsi } from 'ansi-to-pre'
import { whichSync } from '@vltpkg/which'
import {
  BINS_DIR,
  createArtifacts,
  createVariants,
  isVariant,
  VARIANT_VALUES,
  VARIANTS,
} from '@vltpkg/infra-build'
import type {
  Bin,
  Variant,
  VariantOptions,
} from '@vltpkg/infra-build'

// only bundle/compile the vlt binary since that is all we test
// this makes the tests run faster
export const Bins = ['vlt'] as const

const filterVariants = (variants: readonly Variant[]) => {
  const filter =
    process.env.SMOKE_TEST_VARIANTS?.split(',').filter(isVariant)
  return filter ? variants.filter(v => filter.includes(v)) : variants
}

export const publishedVariant = VARIANT_VALUES.Compile
export const allVariants = filterVariants(VARIANTS)
export const defaultVariants = filterVariants([
  VARIANT_VALUES.Node,
  VARIANT_VALUES.Bundle,
  VARIANT_VALUES.Compile,
])

export const Artifacts = createArtifacts({
  bins: Bins,
  cleanup: !t.saveFixture,
  windows: process.platform === 'win32',
  dirs: {
    Node: BINS_DIR,
    Bundle: join(process.cwd(), '.build-bundle'),
    Compile: join(process.cwd(), '.build-compile'),
  },
})

export const Variants = createVariants({
  artifacts: Artifacts,
  node: realpathSync(whichSync('node')),
  deno: realpathSync(whichSync('deno')),
})

export type FixtureDir = Parameters<typeof t.fixture<'dir'>>[1]

export type CommandFixtureDirectory =
  | 'root'
  | 'project'
  | 'config'
  | 'cache'
  | 'data'
  | 'state'
  | 'runtime'

export type CommandFixtures = Record<
  CommandFixtureDirectory,
  FixtureDir
>

export type SharedCommandOptions = {
  bin?: Bin
  packageJson?: boolean | Record<string, unknown>
  env?: NodeJS.ProcessEnv
  debug?: boolean
  tty?: boolean
  cleanOutput?: (output: string) => string
}

export type SpawnCommandOptions = SharedCommandOptions & {
  dirs: Record<CommandFixtureDirectory, string>
}

export type SpawnCommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
}

export type CommandOptions = SharedCommandOptions &
  Partial<Record<CommandFixtureDirectory, FixtureDir>>

export type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
  raw: {
    stdout: string
    stderr: string
    output: string
  }
  dirs: Record<CommandFixtureDirectory, string>
}

export type Command = (
  t: Test,
  args?: string[],
  options?: CommandOptions,
) => Promise<CommandResult>

export type MultipleCommandOptions = CommandOptions & {
  variants?: readonly Variant[]
  match?: false | Exclude<keyof CommandResult, 'dirs'>[]
  test?: (
    t: Test,
    result: CommandResult & {
      variant: Variant
      run: (
        args?: string[],
        options?: Omit<SpawnCommandOptions, 'dirs'>,
      ) => Promise<SpawnCommandResult>
    },
  ) => Promise<void>
}

const spawnCommand = async (
  t: Test,
  variant: VariantOptions,
  args: string[] = [],
  {
    dirs,
    env,
    debug = !!process.env.CI,
    bin = 'vlt',
    tty = false,
    cleanOutput = v => v,
  }: SpawnCommandOptions,
) => {
  const [command, ...commandArgs] = variant.args(bin)
  assert(command, 'no command')

  // When debugging the spawned command will write to stderr to help triage
  // timeouts or other command errors. Each log line will be prefixed with some
  // distinct info about the test since tests can be run in parallel. The logs
  // will also be truncated after a certain number of lines because we don't
  // need to see all the output, just whether it happened or not.
  let debugLog = (..._: string[]) => {}
  if (debug) {
    const tapPrefix = t.fullname
      .split(' > ')
      .filter(r => r !== 'TAP')
      .map(v => v.replace(/^test[\\/](.*?)\.ts$/, '$1'))
    const type = tapPrefix.pop()
    const testPrefix = [
      tapPrefix.join('_'),
      // The last part is the variant name so make it more prominent
      type,
      [bin, ...args].join('_'),
    ]
    debugLog = (msg: string, logPrefix?: string) => {
      const lines = msg.trim().split('\n')
      const length = lines.length
      if (length > 20) {
        lines.length = 20
        lines.push(`__${length - 20} more lines__`)
      }
      const prefixParts = [...testPrefix, logPrefix]
        .filter(v => v != null)
        .map(v => v.replace(/\s+/g, '-'))
      const prefix = `[${prefixParts.join('][')}] `
      console.error(prefix + lines.join(`\n${prefix}`))
    }
  }
  debugLog('__START__')

  const spawnPty = await import('node-pty')
    .then(r => r.spawn)
    .catch(() => null)

  const { stdout, stderr, output, ...res } =
    await new Promise<SpawnCommandResult>(res => {
      const outputs = {
        stdout: '',
        stderr: '',
        output: '',
      }

      const spawnEnv = {
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
      }

      if (spawnPty && tty) {
        const ttyProc = spawnPty(command, [...commandArgs, ...args], {
          cwd: dirs.project,
          env: spawnEnv,
        })
        ttyProc.onData(data => {
          // node-pty does not allow for separating stdout and stderr so we have
          // to treat all data as both stdout and stderr. This means we can't
          // use tty:true in smoke tests to test what is on stdout vs stderr.
          outputs.stdout += data
          outputs.stderr += data
          outputs.output += data
          // This is only used for debugging so we resolve all ansi control
          // sequences and then strip colors to make it easier to read the logs.
          debugLog(stripVTControlCharacters(ansiToAnsi(data)), 'tty')
        })
        ttyProc.onExit(({ exitCode }) =>
          res({
            ...outputs,
            status: exitCode,
          }),
        )
      } else {
        const proc = spawn(command, [...commandArgs, ...args], {
          cwd: dirs.project,
          shell: true,
          windowsHide: true,
          env: spawnEnv,
        })
        proc.stdout.on('data', d => {
          const chunk = `${d.toString()}`
          outputs.stdout += chunk
          outputs.output += chunk
          debugLog(chunk, 'stdout')
        })
        proc.stderr.on('data', d => {
          const chunk = `${d.toString()}`
          outputs.stderr += chunk
          outputs.output += chunk
          debugLog(chunk, 'stderr')
        })
        proc.on('exit', code =>
          res({
            ...outputs,
            status: code,
          }),
        )
      }
    })

  debugLog('__CLOSE__')

  const defaultClean = (output: string) =>
    output.trim().replaceAll(dirs.root, '{{CWD}}')

  return {
    ...res,
    raw: { stdout, stderr, output },
    stdout: cleanOutput(defaultClean(stdout)),
    stderr: cleanOutput(defaultClean(stderr)),
    output: cleanOutput(defaultClean(output)),
  }
}

export const runVariant = async (
  variant: VariantOptions,
  t: Test,
  args?: string[],
  { packageJson = true, ...options }: CommandOptions = {},
): Promise<CommandResult> => {
  const root = t.testdir({
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
  } satisfies Omit<CommandFixtures, 'root'>)

  const dirs: Record<CommandFixtureDirectory, string> = {
    root,
    project: join(root, 'project'),
    config: join(root, 'config'),
    cache: join(root, 'cache'),
    data: join(root, 'data'),
    state: join(root, 'state'),
    runtime: join(root, 'runtime'),
  }

  return {
    ...(await spawnCommand(t, variant, args, {
      dirs,
      ...options,
    })),
    dirs,
  }
}

// Export all variants as individual commands
export const source: Command = (...args) =>
  runVariant(Variants.Node, ...args)

export const denoSource: Command = (...args) =>
  runVariant(Variants.Deno, ...args)

export const bundle: Command = (...args) =>
  runVariant(Variants.Bundle, ...args)

export const denoBundle: Command = (...args) =>
  runVariant(Variants.DenoBundle, ...args)

export const compile: Command = (...args) =>
  runVariant(Variants.Compile, ...args)

// And export whatever is the currently published variant
export const runPublished: Command = (...args) =>
  runVariant(Variants[publishedVariant], ...args)

export const runMultiple = async (
  t: Test,
  args?: string[],
  {
    test,
    variants = defaultVariants,
    match = ['status', 'stdout', 'stderr'],
    ...options
  }: MultipleCommandOptions = {},
) => {
  const variantResults: [Variant, CommandResult][] =
    await Promise.all(
      variants.map(async variant => {
        let result = {} as CommandResult
        await t.test(variant, async t => {
          result = await runVariant(
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
        })
        return [variant, result]
      }),
    )

  t.equal(variantResults.length, variants.length, 'ran all variants')

  // treat published variant as the default result for other tests
  // if it exists, otherwise just the first one
  const defaultVariant =
    variantResults.find(([v]) => v === publishedVariant) ??
    variantResults[0]

  assert(defaultVariant, 'no default result')

  const [defaultType, defaultResult] = defaultVariant

  if (match) {
    for (const [type, result] of variantResults) {
      if (type === defaultType) {
        continue
      }

      for (const key of match) {
        t.equal(
          result[key],
          defaultResult[key],
          `${type}.${key} === ${defaultType}.${key}`,
        )
      }
    }
  }

  return {
    ...defaultResult,
    variants: Object.fromEntries(variantResults),
  }
}
