import t, { Test } from 'tap'
import { readdir } from 'node:fs/promises'
import generateMatrix, {
  getMatrix,
  ParseArgs,
} from '../src/matrix.js'
import { sep } from 'node:path'
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
    files: (await readdir(dir, { recursive: true })).map(f =>
      f.replaceAll(sep, '/'),
    ),
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
  t.equal(files.length, 2)
})
