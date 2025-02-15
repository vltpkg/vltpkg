import t from 'tap'
import type { Test } from 'tap'
import { relative, join } from 'path'
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

t.test('basic', async t => {
  const { files } = await testBundle(t, {})
  t.ok(files.includes('vlt.js'))
  t.ok(files.find(f => f.startsWith('chunk-')))
})
