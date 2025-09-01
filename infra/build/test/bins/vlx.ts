import t from '../tap-import.ts'

t.test('basic', async t => {
  const run = t.captureFn(() => {})
  await t.mockImport<typeof import('../../src/bins/vlx.ts')>(
    '../../src/bins/vlx.ts',
    {
      '../../src/bins.ts': { run },
    },
  )
  t.strictSame(run.args(), [['exec']])
})
