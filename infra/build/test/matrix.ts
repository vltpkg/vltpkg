import t, { type Test } from 'tap'
import { getMatrix, type ParseArgs } from '../src/matrix.ts'
import { type Bin, Bins } from '../src/types.ts'

const testGenerateMatrix = async (
  t: Test,
  { bin, ...o }: ParseArgs['matrix'] & { bin?: Bin[] } = {},
) => {
  const dir = t.testdir()
  t.capture(console, 'log')
  const bundles: any[] = []
  const compiles: any[] = []
  const { default: generateMatrix } = await t.mockImport(
    '../src/matrix.ts',
    {
      '../src/compile.js': {
        default: (a: any) => {
          compiles.push(a)
        },
      },
      '../src/bundle.js': {
        default: (a: any) => {
          bundles.push(a)
        },
      },
    },
  )
  await t.resolves(
    generateMatrix({
      outdir: dir,
      verbose: true,
      bin,
      matrix: getMatrix(o),
    }),
  )
  return {
    bundles,
    compiles,
  }
}

t.test('matrix', async t => {
  t.matchSnapshot(
    getMatrix({
      runtime: ['all'],
      platform: ['linux'],
      arch: ['arm64'],
      compile: [true],
    }),
    'all runtime',
  )
  t.matchSnapshot(getMatrix({ all: true }), 'full matrix')
  t.throws(() => getMatrix({ runtime: ['test'] }))
  t.doesNotThrow(() => getMatrix({ runtime: ['node'] }))
  t.strictSame(
    getMatrix({ minify: ['true'] }),
    getMatrix({ minify: [true] }),
  )
})

t.test('bundle matrix', async t => {
  const { bundles, compiles } = await testGenerateMatrix(t)
  t.equal(bundles.length, 1)
  t.strictSame(compiles, [])
})

t.test('compile matrix', async t => {
  const { bundles, compiles } = await testGenerateMatrix(t, {
    platform: ['linux'],
    arch: ['arm64'],
    compile: [true],
    runtime: ['deno'],
  })
  t.matchSnapshot(
    bundles.map(b => b.bundleId),
    'bundles',
  )
  t.matchSnapshot(
    compiles.map(c => c.bin),
    'files',
  )
})

t.test('single bin', async t => {
  const { compiles } = await testGenerateMatrix(t, {
    bin: [Bins.vlt],
    platform: ['linux'],
    arch: ['arm64'],
    compile: [true],
    runtime: ['deno'],
  })
  t.equal(compiles.length, 1)
})
