import t from 'tap'

t.intercept(process, 'argv', { value: ['a', 'b', 'c', 'd'] })
const runFn = () => true
const run = t.captureFn(runFn)
await t.mockImport('../../src/bins/vlx.ts', {
  '../../src/index.ts': run,
  '../../src/index.js': run,
})
t.strictSame(process.argv, ['a', 'b', 'exec', 'c', 'd'])
t.strictSame(run.args(), [[]])
