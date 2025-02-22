import t from 'tap'

t.intercept(process, 'argv', { value: ['a', 'b', 'c', 'd'] })
const runFn = () => true
const run = t.captureFn(runFn)
await t.mockImport<typeof import('../../src/bins/vlx.ts')>(
  '../../src/bins/vlx.ts',
  {
    '../../src/index.ts': run,
  },
)
t.strictSame(process.argv, ['a', 'b', 'exec', 'c', 'd'])
t.strictSame(run.args(), [[]])
