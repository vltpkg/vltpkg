import t from 'tap'
import type { Test } from 'tap'
import { setupEnv } from './fixtures/util.ts'
import { join } from 'node:path'
import type { LoadedConfig } from '../src/config/index.ts'

setupEnv(t)

export const run = async (
  t: Test,
  {
    argv = [],
  }: {
    argv?: string[]
  } = {},
) => {
  t.intercept(process, 'argv', {
    value: [process.execPath, 'index.ts', ...argv],
  })
  const state = {
    logs: [] as string[],
    config: {} as LoadedConfig,
  }
  const index = await t.mockImport<typeof import('../src/index.ts')>(
    '../src/index.ts',
    {
      '../src/output.ts': {
        stdout: (v: string) => state.logs.push(v),
        stderr: (v: string) => state.logs.push(v),
        outputCommand: (_: unknown, conf: LoadedConfig) =>
          (state.config = conf),
      },
    },
  )
  await index.default()
  return state
}

t.test('infer workspace', async t => {
  const dir = t.testdir({
    'vlt-workspaces.json': '"src/foo"',
    src: {
      foo: {
        'package.json': JSON.stringify({ name: '@acme/foo' }),
      },
    },
  })
  t.chdir(join(dir, 'src/foo'))
  const { config } = await run(t)
  t.strictSame(config.get('workspace'), ['src/foo'])
})

t.test('print version', async t => {
  const { logs } = await run(t, { argv: ['-v'] })
  t.matchOnly(logs[0], /^\d\.\d\.\d/)
})
