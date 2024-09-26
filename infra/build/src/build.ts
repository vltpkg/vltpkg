import { parseArgs as nodeParseArgs } from 'node:util'
import assert from 'node:assert'
import generateMatrix, { getMatrix, matrixConfig } from './matrix.js'

const parseArgs = () => {
  const {
    values: { outdir, verbose, ...matrix },
  } = nodeParseArgs({
    options: {
      outdir: { type: 'string' },
      saveSource: { type: 'boolean' },
      verbose: { type: 'boolean' },
      ...matrixConfig,
    } as const,
  })
  assert(
    typeof outdir === 'string' && outdir,
    new TypeError(`outdir is required`),
  )
  return {
    outdir,
    verbose,
    matrix: getMatrix(matrix),
  }
}

const { outdir, verbose, matrix } = parseArgs()
await generateMatrix({ outdir, verbose }, matrix)
