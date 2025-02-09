import t, { type Test } from 'tap'
import { join } from 'path'
import { defaultOptions } from '../src/index.ts'
import * as types from '../src/types.ts'

const testCompile = async (
  t: Test,
  options: Partial<types.Factors>,
) => {
  const { default: compile } = await t.mockImport(
    '../src/compile.ts',
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
  await t.rejects(
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
