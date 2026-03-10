import t from 'tap'
import type { Test } from 'tap'

const mockBins = (t: Test, mocks?: Record<string, any>) =>
  t.mockImport<typeof import('../src/bins.ts')>(
    '../src/bins.ts',
    mocks,
  )

t.test('basic', async t => {
  const { BINS, BINS_DIR, isBin } = await mockBins(t)
  t.type(BINS_DIR, 'string')
  t.strictSame(BINS, ['vlxl', 'vlr', 'vlrx', 'vlt', 'vlx'])

  t.ok(isBin('vlt'))
  t.notOk(isBin('vltt'))
})

t.test('changes argv', async t => {
  t.intercept(process, 'argv', { value: ['a', 'b', 'c', 'd'] })
  const runFn = () => true
  const cliSdk = t.captureFn(runFn)
  const { run } = await mockBins(t, { '@vltpkg/cli-sdk': cliSdk })
  await run('exec')
  t.strictSame(process.argv, ['a', 'b', 'exec', 'c', 'd'])
  t.strictSame(cliSdk.args(), [[]])
})
