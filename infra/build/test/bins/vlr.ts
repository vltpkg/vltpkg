import t from '../tap-import.ts'

t.test('basic', async t => {
  const run = t.captureFn(() => {})
  await t.mockImport<typeof import('../../src/bins/vlr.ts')>(
    '../../src/bins/vlr.ts',
    {
      '../../src/bins.ts': { run },
    },
  )
  t.strictSame(run.args(), [['run']])
})
