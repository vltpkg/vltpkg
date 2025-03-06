import t from 'tap'
import type { Test } from 'tap'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import * as Bundle from '../src/bundle.ts'
import * as Compile from '../src/compile.ts'

const mockCli = async (
  t: Test,
  {
    argv = [],
    pkg,
  }: {
    argv?: string[]
    pkg?: Record<string, string | object>
  },
) => {
  const dir = t.testdir({
    'package.json': JSON.stringify({
      name: 'my-pkg',
      version: '1.2.3',
      description: 'hi',
      repository: 'my-repo',
      keywords: ['hi'],
      type: 'module',
      license: 'MIT',
      some_other_prop: 'hi',
      dont_copy_this: 'hi',
      engines: { node: '>=10', npm: '>=6' },
      ...pkg,
    }),
    'README.md': 'hi',
    LICENSE: 'hi',
    'postinstall.cjs': 'hi',
    'placeholder-bin.js': 'hi',
  })

  t.chdir(dir)
  t.capture(console, 'log')
  t.intercept(process, 'argv', {
    value: [
      process.execPath,
      resolve(import.meta.dirname, '../src/cli.ts'),
      ...argv,
    ],
  })

  const calls = { bundle: 0, compile: 0 }

  await t.mockImport<typeof import('../src/cli.ts')>(
    '../src/cli.ts',
    {
      '../src/bundle.ts': t.createMock(Bundle, {
        bundle: async (o: unknown) => {
          calls.bundle++
          return o
        },
      }),
      '../src/compile.ts': t.createMock(Compile, {
        compile: async (o: unknown) => {
          calls.compile++
          return o
        },
      }),
    },
  )

  return {
    dir,
    calls,
    readOutdir: (p: string) => readdirSync(join(dir, p)).sort(),
    readPkg: (p: string) =>
      JSON.parse(readFileSync(join(dir, p, 'package.json'), 'utf8')),
  }
}

t.test('default', async t => {
  const outdir = 'outdir'
  const { readOutdir } = await mockCli(t, {
    argv: [`--outdir=${outdir}`],
  })
  t.strictSame(
    readOutdir(outdir),
    [],
    'no files without publishConfig',
  )
})

t.test('invalid bins', async t => {
  const outdir = 'outdir'
  await t.rejects(
    mockCli(t, {
      argv: [`--outdir=${outdir}`, '--bins=not-a-bin'],
    }),
  )
})

t.test('bundle', async t => {
  const { calls } = await mockCli(t, {
    argv: [`--outdir=outdir`, 'bundle'],
  })
  t.equal(calls.bundle, 1)
  t.equal(calls.compile, 0)
})

t.test('compile', async t => {
  const { calls } = await mockCli(t, {
    argv: [`--outdir=outdir`, 'compile'],
  })
  t.equal(calls.bundle, 0)
  t.equal(calls.compile, 1)
})
