import t from 'tap'
import { join } from 'node:path'

t.test('basic', async t => {
  t.intercept(process, 'argv', { value: ['a', 'b', 'c', 'd'] })
  const runFn = () => true
  const run = t.captureFn(runFn)
  await t.mockImport<typeof import('../../src/bins/vlix.ts')>(
    '../../src/bins/vlix.ts',
    {
      '@vltpkg/cli-sdk': run,
    },
  )
  t.strictSame(process.argv, ['a', 'b', 'install-exec', 'c', 'd'])
  t.strictSame(run.args(), [[]])
})

t.test('with internal main', async t => {
  const logs = t.capture(console, 'log').args
  const dir = t.testdir({
    'main.js': `console.log('running main')`,
  })
  t.intercept(process, 'env', {
    value: { __VLT_INTERNAL_MAIN: join(dir, 'main.js') },
  })
  await t.resolves(
    t.mockImport<typeof import('../../src/bins/vlix.ts')>(
      '../../src/bins/vlix.ts',
    ),
  )
  t.strictSame(logs(), [['running main']])
})
