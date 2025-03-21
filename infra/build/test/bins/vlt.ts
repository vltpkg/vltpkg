import t from 'tap'

t.test('basic', async t => {
  const run = t.captureFn(() => {})
  await t.mockImport<typeof import('../../src/bins/vlt.ts')>(
    '../../src/bins/vlt.ts',
    {
      '../../src/bins.ts': { run },
    },
  )
  t.strictSame(run.args(), [[]])
})
