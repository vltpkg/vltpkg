import assert from 'node:assert'
import t, { Test } from 'tap'

const benchmark = async (t: Test, ...argv: string[]) => {
  const dir = t.testdir()
  t.capture(console, 'log')
  t.intercept(process, 'argv', {
    value: [
      process.execPath,
      'benchmark.js',
      `--outdir=${dir}`,
      ...argv,
    ],
  })
  let args: string[] = []
  await t.mockImport<typeof import('../../src/bin/benchmark.js')>(
    '../../src/bin/benchmark.js',
    {
      'node:child_process': {
        spawnSync: (_: any, a: string[]) => (args = a),
      },
    },
  )
  const benchmarkArg = args.at(-2)
  assert(benchmarkArg, 'has benchmark arg')
  return benchmarkArg.replaceAll('"', '').split(',')
}

t.test('basic', async t => {
  const args = await benchmark(
    t,
    '--runtime=node,bun,deno',
    '--compile=true,false',
  )
  t.ok(args.find(a => /^node.*vlt\.js$/.exec(a)))
  t.ok(args.find(a => /^bun.*vlt\.js$/.exec(a)))
  t.ok(args.find(a => /^deno run -A.*vlt\.js$/.exec(a)))
  t.ok(args.find(a => /compile-.*node.*vlt$/.exec(a)))
  t.ok(args.find(a => /compile-.*deno.*vlt$/.exec(a)))
  t.ok(args.find(a => /compile-.*bun.*vlt$/.exec(a)))
})

t.test('nothing', async t => {
  await t.rejects(
    benchmark(t, '--runtime=node', '--compile=true', '--format=esm'),
    { message: 'no benchmark matrix generated for supplied options' },
  )
})