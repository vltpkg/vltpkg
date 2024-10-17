import t, { Test } from 'tap'
import { join } from 'path'
import { defaultOptions } from '../src/index.js'
import * as types from '../src/types.js'

const testCompile = async (
  t: Test,
  options: Partial<types.Factors>,
) => {
  const { default: compile } = await t.mockImport(
    '../src/compile.js',
    {
      'node:child_process': {
        spawnSync: () => ({ status: 0 }),
      },
    },
  )
  const dir = t.testdir({
    source: {
      nested: {
        file: '',
      },
      'some-file.js': '',
    },
    compile: {},
  })
  const def = defaultOptions()
  compile({
    source: join(dir, 'source'),
    outdir: join(dir, 'compile'),
    bin: types.Bins.vlt,
    ...def,
    ...options,
  })
}

t.test('runtimes', async t => {
  await t.resolves(
    testCompile(t, {
      runtime: types.Runtimes.Node,
    }),
  )
  await t.resolves(
    testCompile(t, {
      runtime: types.Runtimes.Deno,
    }),
  )
  await t.resolves(
    testCompile(t, {
      runtime: types.Runtimes.Bun,
    }),
  )
})
