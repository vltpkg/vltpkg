import t, { type Test } from 'tap'

const build = async (t: Test, ...argv: string[]) => {
  const dir = t.testdir()
  const logs = t.capture(console, 'log').args
  t.intercept(process, 'argv', {
    value: [process.execPath, 'build.js', `--outdir=${dir}`, ...argv],
  })
  let compiled = 0
  let bundled = 0
  await t.mockImport<typeof import('../../src/bin/build.ts')>(
    '../../src/bin/build.ts',
    {
      '../../src/matrix.js': await t.mockImport(
        '../../src/matrix.ts',
        {
          '../../src/compile.js': {
            default: () => {
              compiled++
            },
          },
          '../../src/bundle.js': {
            default: () => {
              bundled++
            },
          },
        },
      ),
    },
  )
  return {
    compiled,
    bundled,
    res: JSON.parse((logs().at(-1) ?? [])[0]),
  }
}

t.test('basic', async t => {
  const r = await build(t)
  t.equal(r.res.length, 1)
  t.equal(r.compiled, 0)
  t.equal(r.bundled, 1)
})

t.test('runtime', async t => {
  const r = await build(t, '--format=esm,cjs')
  t.equal(r.res.length, 2)
  t.equal(r.compiled, 0)
  t.equal(r.bundled, 2)
})
