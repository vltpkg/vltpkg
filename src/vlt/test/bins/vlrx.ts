import t from 'tap'

t.intercept(process, 'argv', { value: ['a', 'b', 'c', 'd'] })
const runFn = () => true
const run = t.captureFn(runFn)
await t.mockImport('../../src/bins/vlrx.ts', {
  '../../src/index.ts': run,
  '../../src/index.js': run,
})
t.strictSame(process.argv, ['a', 'b', 'run-exec', 'c', 'd'])
t.strictSame(run.args(), [[]])
