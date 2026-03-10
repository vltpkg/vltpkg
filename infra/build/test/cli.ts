import t from 'tap'
import type { Test } from 'tap'
import { resolve } from 'node:path'
import * as Bundle from '../src/bundle.ts'

const mockCli = async (
  t: Test,
  {
    argv = [],
  }: {
    argv?: string[]
  },
) => {
  const dir = t.testdir()
  t.chdir(dir)
  t.capture(console, 'log')
  t.intercept(process, 'argv', {
    value: [
      process.execPath,
      resolve(import.meta.dirname, '../src/cli.ts'),
      ...argv,
    ],
  })

  const calls = { bundle: 0 }

  await t.mockImport<typeof import('../src/cli.ts')>(
    '../src/cli.ts',
    {
      '../src/bundle.ts': t.createMock(Bundle, {
        bundle: async (o: unknown) => {
          calls.bundle++
          return o
        },
      }),
    },
  )

  return {
    calls,
  }
}

t.test('default', async t => {
  const { calls } = await mockCli(t, {
    argv: [`--outdir=outdir`],
  })
  t.equal(calls.bundle, 1)
})

t.test('invalid bins', async t => {
  await t.rejects(
    mockCli(t, {
      argv: [`--outdir=outdir`, '--bins=not-a-bin'],
    }),
  )
})

t.test('bundle', async t => {
  const { calls } = await mockCli(t, {
    argv: [`--outdir=outdir`, 'bundle'],
  })
  t.equal(calls.bundle, 1)
})
