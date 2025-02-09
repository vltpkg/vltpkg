import assert from 'node:assert'
import t, { type Test } from 'tap'

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
  await t.mockImport<typeof import('../../src/bin/benchmark.ts')>(
    '../../src/bin/benchmark.ts',
    {
      'node:child_process': {
        spawnSync: (_: any, a: string[]) => (args = a),
      },
      '../../src/matrix.js': await t.mockImport(
        '../../src/matrix.ts',
        {
          '../../src/compile.js': {
            default: () => {},
          },
          '../../src/bundle.js': {
            default: () => {},
          },
        },
      ),
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
  t.ok(args.find(a => /compile-.*deno.*vlt$/.exec(a)))
  t.ok(args.find(a => /compile-.*bun.*vlt$/.exec(a)))
})

t.test('nothing', async t => {
  await t.rejects(benchmark(t, '--runtime=node', '--compile=true'), {
    message: 'no benchmark matrix generated for supplied options',
  })
})
