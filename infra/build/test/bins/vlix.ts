import t from 'tap'

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
