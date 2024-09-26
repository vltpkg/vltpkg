import t, { Test } from 'tap'
import { join, relative } from 'path'
import compile from '../src/compile.js'
import bundle from '../src/bundle.js'
import { defaultOptions } from '../src/index.js'
import {
  BundleFactors,
  CompileFactors,
  Runtimes,
} from '../src/types.js'

const testCompile = async (
  t: Test,
  options: Partial<BundleFactors> & Partial<CompileFactors>,
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
  const bins = compile({
    source,
    outdir: join(dir, 'compile'),
    ...def,
    ...options,
  })
  return bins.map(p => relative(dir, p))
}

t.test('runtimes', async t => {
  await t.resolves(
    testCompile(t, {
      runtime: Runtimes.Node,
    }),
  )
  await t.resolves(
    testCompile(t, {
      runtime: Runtimes.Deno,
    }),
  )
  await t.resolves(
    testCompile(t, {
      runtime: Runtimes.Bun,
    }),
  )
})
