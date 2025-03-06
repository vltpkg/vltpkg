import t from 'tap'

t.intercept(process, 'argv', { value: ['a', 'b', 'c', 'd'] })
const runFn = () => true
const run = t.captureFn(runFn)
await t.mockImport<typeof import('../../src/bins/vlrx.ts')>(
  '../../src/bins/vlrx.ts',
  {
    '@vltpkg/cli-sdk': run,
  },
)
t.strictSame(process.argv, ['a', 'b', 'run-exec', 'c', 'd'])
t.strictSame(run.args(), [[]])
