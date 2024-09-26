import t, { Test } from 'tap'
import { readFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { Paths, defaultOptions } from '../src/index.js'
import bundle from '../src/bundle.js'
import { join, dirname, resolve } from 'node:path'

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

type CommandResult = {
  status: number | null
  stdout: string
  stderr: string
  output: string
}

const testCommand = async (
  t: Test,
  {
    bin,
    command,
    subCommand,
    args,
    testdir = {},
    outdir,
    source,
  }: {
    bin: string
    command: string
    subCommand: string
    args: string[]
    outdir: string
    source: string
    testdir?: Parameters<Test['testdir']>[0]
  },
): Promise<CommandResult> => {
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
        [binPath, command, subCommand, ...args],
        {
          cwd,
          shell: true,
          env: {
            ...env,
            // Config will always stop at $HOME so override that one
            // level about the testdir so we dont go back up to our
            // own monorepo root
            HOME: dirname(cwd),
            USERPROFILE: dirname(cwd),
          },
        },
      )
      const result: CommandResult = {
        stdout: '',
        stderr: '',
        output: '',
        status: null,
      }
      proc.stdout.on('data', d => {
        result.stdout += `${d.toString()}`
        result.output += `${d.toString()}`
      })
      proc.stderr.on('data', d => {
        result.stderr += `${d.toString()}`
        result.output += `${d.toString()}`
      })
      proc
        .on('close', code => res({ ...result, status: code }))
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
  t.matchSnapshot(buildRes.output, 'output')
  return buildRes
}

t.test('snapshots', async t => {
  const outdir = t.testdir()
  const sourceDir = resolve(import.meta.dirname, '../../../src/vlt')
  const source = join(
    sourceDir,
    dirname(
      Object.values(
        JSON.parse(
          await readFile(join(sourceDir, 'package.json'), 'utf8'),
        ).bin,
      )[0] as string,
    ),
  )
  await bundle({ outdir, ...defaultOptions() })

  const testdirs = {
    nameOnly: {
      'package.json': JSON.stringify({ name: 'hi' }),
    },
  }

  const snapshots = {
    vlt: {
      pkg: {
        get: new Map([
          [{ testdir: testdirs.nameOnly }, { status: 0 }],
          [
            { args: ['name'], testdir: testdirs.nameOnly },
            { status: 0 },
          ],
          [
            { args: ['name', 'version'], testdir: testdirs.nameOnly },
            { status: 1 },
          ],
        ]),
      },
    },
  }

  for (const [bin, commands] of Object.entries(snapshots)) {
    await t.test(bin, async t => {
      for (const [command, subs] of Object.entries(commands)) {
        await t.test(command, async t => {
          for (const [subCommand, cases] of Object.entries(subs)) {
            await t.test(subCommand, async t => {
              for (const [
                { args = [], ...opts },
                res,
              ] of cases.entries()) {
                t.test(
                  !args.length ? '(no args)' : args.join(' '),
                  async t => {
                    t.match(
                      await testCommand(t, {
                        ...opts,
                        bin,
                        command,
                        subCommand,
                        args,
                        outdir,
                        source,
                      }),
                      res,
                    )
                  },
                )
              }
            })
          }
        })
      }
    })
  }
})
