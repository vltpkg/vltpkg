import t, { type Test } from 'tap'
import { spawn } from 'node:child_process'
import { Paths, defaultOptions } from '../src/index.ts'
import bundle from '../src/bundle.ts'
import { join } from 'node:path'
import * as types from '../src/types.ts'
import assert from 'node:assert'

type Testdir = Parameters<Test['testdir']>[0]

type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
}

type TestCase = Partial<CommandResult> & {
  args?: string[]
  testdir?: Testdir
  snapshot?: boolean
}

type TestCommand = {
  bin: types.Bin
  command: string
  outdir: string
  source: string
  testCase: TestCase
}

const clean = (s: string) =>
  s.replaceAll('\\', '/').replaceAll(/\r\n/g, '\n')

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
              s
                .replaceAll(/\\+/g, '\\')
                .replaceAll(t.testdirName, '{{DIR_NAME}}')
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
    const sourceRes = await tResult<CommandResult>(t, 'source', t =>
      run(t, source),
    )
    const buildRes = await tResult<CommandResult>(t, 'build', t =>
      run(t, outdir),
    )
    t.equal(sourceRes.status, buildRes.status, 'status')
    t.equal(sourceRes.stdout, buildRes.stdout, 'stdout')
    t.equal(clean(sourceRes.stderr), clean(buildRes.stderr), 'stderr')
    if (snapshot) {
      t.matchSnapshot(buildRes.output, 'output')
    }
    t.match(buildRes, { status, ...match })
  })

t.test('commands', async t => {
  if (process.platform === 'win32') {
    // Something is wrong with how the build is generated on Windows.
    // This test is still needed but we need to fix how the bundle is
    // generated on Windows first.
    t.comment('skipping on windows')
    return
  }

  const outdir = t.testdir()
  await bundle({ outdir, ...defaultOptions() })

  const snapshots: Record<'vlt', { [command: string]: TestCase[] }> &
    Record<Exclude<types.Bin, 'vlt' | 'vlix'>, TestCase[]> = {
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
    vlx: [
      {
        args: ['missing-command'],
        output: 'missing-command',
        status: 0,
      },
    ],
    vlr: [{ args: ['some-script'], output: 'script output' }],
    vlrx: [{ args: ['some-script'], output: 'script output' }],
  }

  for (const [bin, commands] of Object.entries(snapshots)) {
    assert(types.isBin(bin))
    await t[bin === 'vlt' ? 'test' : 'skip'](bin, async t => {
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
                source: Paths.BINS,
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
