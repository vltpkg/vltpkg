import t from 'tap'

t.test('basic', async t => {
  const run = t.captureFn(() => {})
  await t.mockImport<typeof import('../../src/bins/vlxl.ts')>(
    '../../src/bins/vlxl.ts',
    {
      '../../src/bins.ts': { run },
    },
  )
  t.strictSame(run.args(), [['exec-local']])
})
