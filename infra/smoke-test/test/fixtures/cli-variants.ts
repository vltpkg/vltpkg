import type { Test } from 'tap'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

export type CommandOptions = {
  testdir?: Parameters<Test['testdir']>[0]
  env?: NodeJS.ProcessEnv
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

const runBase = async (
  t: Test,
  command: string,
  args: string[],
  { env = {}, testdir = {} }: CommandOptions = {},
) => {
  const cwd = t.testdir(testdir)

  return new Promise<CommandResult>((res, rej) => {
    const proc = spawn(command, args, {
      cwd: cwd,
      shell: true,
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
  runBase(
    t,
    resolve(import.meta.dirname, '../../../../scripts/bins', bin),
    args,
    options,
  )

export const bundle = (
  t: Test,
  bin: string,
  args: string[],
  options?: CommandOptions,
) =>
  runBase(
    t,
    process.execPath,
    [
      // this gets created by the pretest run-script
      resolve(
        import.meta.dirname,
        '../../.build-bundle',
        `${bin}.js`,
      ),
      ...args,
    ],
    options,
  )

export const compile = (
  t: Test,
  bin: string,
  args: string[],
  options?: CommandOptions,
) =>
  runBase(
    t,
    // this gets created by the pretest run-script
    resolve(import.meta.dirname, '../../.build-compile', bin),
    args,
    options,
  )

export const run = async (
  t: Test,
  bin: string,
  args: string[],
  options?: CommandOptions,
) => {
  let count = 0

  let srcRes: CommandResult = {
    status: null,
    stdout: '',
    stderr: '',
    output: '',
  }
  let bundleRes: CommandResult = {
    status: null,
    stdout: '',
    stderr: '',
    output: '',
  }
  let compileRes: CommandResult = {
    status: null,
    stdout: '',
    stderr: '',
    output: '',
  }

  await t.test('src', async t => {
    srcRes = await src(t, bin, args, options)
    count++
  })

  await t.test('bundle', async t => {
    bundleRes = await bundle(t, bin, args, options)
    count++
  })

  await t.test('compile', async t => {
    compileRes = await compile(t, bin, args, options)
    count++
  })

  t.equal(count, 3, 'ran all variants')

  // all commands should return the same output. this could get tricky
  // when testing commands that should error since stack traces, etc
  // will be different. if we want to test those in the future we can
  // make this check optional
  t.strictSame(srcRes, bundleRes, 'src and bundle same')
  t.strictSame(bundleRes, compileRes, 'bundle and compile same')

  return {
    // treat bundle as the default result for other tests
    ...bundleRes,
    src: srcRes,
    bundle: bundleRes,
    compile: compileRes,
  }
}
