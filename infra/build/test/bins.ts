import module from 'node:module'
import t from 'tap'
import type { Test } from 'tap'
import { XDG } from '@vltpkg/xdg'

const { FAILED, ENABLED, ALREADY_ENABLED, DISABLED } =
  module.constants.compileCacheStatus

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

const mockCompileCache = async (t: Test, statuses: number[]) => {
  const enableCompileCache = t.captureFn(() => ({
    status: statuses.shift(),
  }))
  await mockBins(t, {
    'node:module': {
      default: { enableCompileCache, constants: module.constants },
    },
  })
  return enableCompileCache.args()
}

t.test('enables compile cache', async t => {
  for (const status of [ENABLED, ALREADY_ENABLED, DISABLED]) {
    t.strictSame(
      await mockCompileCache(t, [status]),
      [[]],
      `status ${status}`,
    )
  }
})

t.test('falls back to vlt cache dir', async t => {
  const dir = new XDG('vlt').cache('compile-cache')
  t.strictSame(
    await mockCompileCache(t, [FAILED, ENABLED]),
    [[], [dir]],
    'retry in vlt cache dir',
  )
  t.strictSame(
    await mockCompileCache(t, [FAILED, FAILED]),
    [[], [dir]],
    'no 3rd attempt',
  )
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
