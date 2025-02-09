import t, { type Test } from 'tap'
import { relative, sep, join } from 'path'
import type * as types from '../src/types.ts'
import { defaultOptions } from '../src/index.ts'
import bundle from '../src/bundle.ts'

const testBundle = async (
  t: Test,
  {
    testdir,
    ...options
  }: Partial<types.BundleFactors> & { testdir?: object },
) => {
  const dir = t.testdir({ ...testdir, '.build': {} })
  const outdir = join(dir, '.build')
  const { outputs } = await bundle({
    outdir,
    ...defaultOptions(),
    ...options,
  })
  return {
    dir,
    outdir,
    files: Object.keys(outputs).map(p => relative(outdir, p)),
  }
}

t.test('no external commands', async t => {
  const { files: noCommands } = await testBundle(t, {
    externalCommands: false,
  })
  t.notOk(noCommands.some(c => c.startsWith(`commands${sep}`)))
})
