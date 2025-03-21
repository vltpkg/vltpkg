import t from 'tap'

t.test('basic', async t => {
  const run = t.captureFn(() => {})
  await t.mockImport<typeof import('../../src/bins/vlix.ts')>(
    '../../src/bins/vlix.ts',
    {
      '../../src/bins.ts': { run },
    },
  )
  t.strictSame(run.args(), [['install-exec']])
})
