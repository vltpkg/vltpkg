import t from 'tap'
import { readdir } from 'node:fs/promises'
import generateMatrix, { getMatrix } from '../src/matrix.js'
import { Archs, Platforms } from '../src/types.js'
import { sep } from 'node:path'

const mocks = {
  platform: [Platforms.Mac],
  arch: [Archs.arm64],
}

t.test('matrix', async t => {
  t.matchSnapshot(getMatrix({ ...mocks }), 'empty matrix')
  t.matchSnapshot(
    getMatrix({ publish: true, ...mocks }),
    'publish matrix',
  )
  t.matchSnapshot(getMatrix({ all: true }), 'full matrix')
  t.throws(() => getMatrix({ runtime: ['test'] }))
  t.doesNotThrow(() => getMatrix({ runtime: ['node'] }))
})

t.test('generate matrix', async t => {
  const dir = t.testdir()
  const logs = t.capture(console, 'log').args
  await t.resolves(
    generateMatrix(
      { outdir: dir, verbose: true },
      getMatrix({ ...mocks }),
    ),
  )
  t.matchSnapshot(logs(), 'logs')
  t.matchSnapshot(
    (await readdir(dir, { recursive: true })).map(f =>
      f.replaceAll(sep, '/'),
    ),
    'files',
  )
})
