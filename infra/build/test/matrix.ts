import t, { Test } from 'tap'
import { readdirSync } from 'node:fs'
import generateMatrix, {
  getMatrix,
  ParseArgs,
} from '../src/matrix.js'
import { sep, join } from 'node:path'
import { Bin, Bins } from '../src/types.js'

const testGenerateMatrix = async (
  t: Test,
  { bin, ...o }: ParseArgs['matrix'] & { bin?: Bin } = {},
) => {
  const dir = t.testdir()
  t.capture(console, 'log')
  await t.resolves(
    generateMatrix({
      outdir: dir,
      verbose: true,
      bin,
      matrix: getMatrix(o),
    }),
  )
  return {
    files: readdirSync(dir)
      .flatMap(f =>
        readdirSync(join(dir, f), { withFileTypes: true }),
      )
      .map(d => (d.isDirectory() ? `${d.name}/` : d.name)),
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
  const { files } = await testGenerateMatrix(t)
  t.matchSnapshot(files, 'files')
})

t.test('compile matrix', async t => {
  const { files } = await testGenerateMatrix(t, {
    platform: ['linux'],
    arch: ['arm64'],
    compile: [true],
  })
  t.matchSnapshot(files, 'files')
})

t.test('single bin', async t => {
  const { files } = await testGenerateMatrix(t, {
    bin: Bins.vlt,
    platform: ['linux'],
    arch: ['arm64'],
    compile: [true],
  })
  t.equal(files.length, 1)
})
