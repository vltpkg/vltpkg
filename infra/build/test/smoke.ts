import t, { Test } from 'tap'
import { spawn } from 'node:child_process'
import { Bins, Paths, defaultOptions } from '../src/index.js'
import bundle from '../src/bundle.js'
import { join } from 'node:path'
import * as types from '../src/types.js'
import assert from 'node:assert'

type Testdir = Parameters<Test['testdir']>[0]

type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
}

type TestCase = {
  args?: string[]
  testdir?: Testdir
  snapshot?: boolean
} & Partial<CommandResult>

type TestCommand = {
  bin: types.Bin
  command: string
  outdir: string
  source: string
  testCase: TestCase
}

const clean = (s: string) =>
  s
    .replaceAll(Paths.MONO_ROOT, '{ROOT}')
    .replaceAll(/^( {4}at )(.*)$/gm, '$1{STACK}')
    .replaceAll(/(\{ROOT\}(.*?):)\d+/g, '$1{LINE_NUMBER}')
    .replaceAll(process.version, '{NODE}')
    .replaceAll('\\', '/')
    .replaceAll(/\r\n/g, '\n')

t.cleanSnapshot = clean

const tResult = async <T>(
  t: Test,
  name: string,
  fn: (t: Test) => Promise<T>,
) => {
  let res: unknown = null
  await t.test(name, async t => (res = await fn(t)))
  if (!res) {
    t.bailout('tResult test must return something')
  }
  return res as T
}

const testdirs: Record<string, Testdir> = {
  default: {
    'package.json': JSON.stringify({
      name: 'default',
      scripts: {
        'some-script': `node -e "console.log('script output')"`,
      },
    }),
  },
  pkg: {
    'package.json': JSON.stringify({
      name: 'hi',
    }),
  },
}

const testCommand = async (
  t: Test,
  {
    bin,
    command,
    outdir,
    source,
    testCase: {
      args = [],
      testdir = testdirs[bin] ??
        testdirs[command] ??
        testdirs.default,
      snapshot,
      status = 0,
      ...match
    },
  }: TestCommand,
) =>
  t.test(args.length ? args.join(' ') : '(no args)', async t => {
    const run = async (
      t: Test,
      dir: string,
    ): Promise<CommandResult> => {
      const binPath = join(dir, `${bin}.js`)
      const cwd = t.testdir(testdir)
      // Remove env vars that might cause trouble for tests since
      // we might be be using vlt or another tool to run these tests.
      // Not all of these have been proven to cause problems but it
      // errs on the side of removing more for a cleaner test environment.
      const env = Object.entries(process.env).reduce<
        NodeJS.Process['env']
      >((acc, [k, v]) => {
        if (!/^_?(tapjs|tap|npm|vlt|node|ts_node)(_|$)/i.test(k)) {
          acc[k] = v
        }
        return acc
      }, {})
      return new Promise((res, rej) => {
        const proc = spawn(
          process.execPath,
          [binPath, command, ...args].filter(Boolean),
          {
            cwd: cwd,
            shell: true,
            env: {
              ...env,
              NO_COLOR: '1',
              // Config will always stop at $HOME so override that one
              // level about the testdir so we dont go back up to our
              // own monorepo root
              HOME: cwd,
              USERPROFILE: cwd,
            },
          },
        )
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
              s.replaceAll(join(t.testdirName), '{{DIR_NAME}}')
            const resStdout = replace(stdout)
            const resStderr = replace(stderr)
            const resOutput = replace(output)
            t.comment(t.testdirName)
            t.comment(join(t.testdirName))
            t.comment('stdout')
            t.comment(stdout)
            t.comment('---')
            t.comment(resStdout)
            t.comment('stderr')
            t.comment(stderr)
            t.comment('---')
            t.comment(resStderr)
            t.comment('output')
            t.comment(output)
            t.comment('---')
            t.comment(resOutput)

            res({
              stdout: resStdout,
              stderr: resStderr,
              output: resOutput,
              status: code,
            })
          })
          .on('error', err => rej(err))
      })
    }

    const sourceRes = await tResult<CommandResult>(t, 'source', t =>
      run(t, source),
    )

    const buildRes = await tResult<CommandResult>(t, 'build', t =>
      run(t, outdir),
    )
    t.comment(JSON.stringify({ sourceRes, buildRes }, null, 2))
    t.equal(sourceRes.status, buildRes.status, 'status')
    t.equal(sourceRes.stdout, buildRes.stdout, 'stdout')
    t.equal(clean(sourceRes.stderr), clean(buildRes.stderr), 'stderr')
    if (snapshot) {
      t.matchSnapshot(buildRes.output, 'output')
    }
    t.match(buildRes, { status, ...match })
  })

t.test('commands', async t => {
  const outdir = t.testdir()
  await bundle({ outdir, ...defaultOptions() })

  const snapshots: Record<
    typeof types.DefaultBin,
    { [command: string]: TestCase[] }
  > &
    Record<
      Exclude<types.Bin, typeof types.DefaultBin | 'vlix'>,
      TestCase[]
    > = {
    vlt: {
      pkg: [
        { args: ['get'], snapshot: true },
        { args: ['get', 'name'], snapshot: true },
        {
          args: ['get', 'name', 'version'],
          status: 1,
          snapshot: true,
        },
      ],
      install: [{}, { args: ['--help'] }],
    },
    vlx: [{ args: ['missing-command'], output: 'missing-command' }],
    vlr: [{ args: ['some-script'], output: 'script output' }],
    vlrx: [{ args: ['some-script'], output: 'script output' }],
  }

  for (const [bin, commands] of Object.entries(snapshots)) {
    assert(types.isBin(bin))
    await t.test(bin, async t => {
      for (const [command, cases] of Object.entries(
        Array.isArray(commands) ? { '': commands } : commands,
      )) {
        await t.test(
          command.length ? command : '(no command)',
          async t => {
            for (const c of cases) {
              await testCommand(t, {
                bin,
                command,
                source: Bins.DIR,
                outdir,
                testCase: c,
              })
            }
          },
        )
      }
    })
  }
})
