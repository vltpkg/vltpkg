import t, { Test } from 'tap'
import { join } from 'path'
import compile from '../src/compile.js'
import bundle from '../src/bundle.js'
import { defaultOptions } from '../src/index.js'
import * as types from '../src/types.js'

const testCompile = async (
  t: Test,
  options: Partial<types.Factors>,
) => {
  const dir = t.testdir({
    source: {},
    compile: {},
  })
  const def = defaultOptions()
  const { outdir: source } = await bundle({
    outdir: join(dir, 'source'),
    ...def,
    ...options,
  })
  compile({
    source,
    outdir: join(dir, 'compile'),
    bin: 'vlt',
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
