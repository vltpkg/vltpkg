import t, { Test } from 'tap'

const build = async (t: Test, ...argv: string[]) => {
  const dir = t.testdir()
  const logs = t.capture(console, 'log').args
  t.intercept(process, 'argv', {
    value: [process.execPath, 'build.js', `--outdir=${dir}`, ...argv],
  })
  await t.mockImport<typeof import('../../src/bin/build.js')>(
    '../../src/bin/build.js',
  )
  return {
    res: JSON.parse((logs().at(-1) ?? [])[0]),
  }
}

t.test('basic', async t => {
  const r = await build(t)
  t.equal(r.res.length, 1)
})

t.test('runtime', async t => {
  const r = await build(t, '--format=esm,cjs')
  t.equal(r.res.length, 2)
})
