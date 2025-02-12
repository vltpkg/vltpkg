import t from 'tap'
import type { Test } from 'tap'

const build = async (t: Test, ...argv: string[]) => {
  const dir = t.testdir()
  const logs = t.capture(console, 'log').args
  t.intercept(process, 'argv', {
    value: [process.execPath, 'build.ts', `--outdir=${dir}`, ...argv],
  })
  let compiled = 0
  let bundled = 0
  await t.mockImport<typeof import('../../src/bin/build.ts')>(
    '../../src/bin/build.ts',
    {
      '../../src/matrix.ts': await t.mockImport(
        '../../src/matrix.ts',
        {
          '../../src/compile.ts': {
            default: () => {
              compiled++
            },
          },
          '../../src/bundle.ts': {
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
