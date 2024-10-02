import { parseArgs as nodeParseArgs } from 'node:util'
import generateMatrix, { getMatrix, matrixConfig } from '../matrix.js'
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

const parseArgs = () => {
  const { outdir, quiet, save, ...matrix } = nodeParseArgs({
    options: {
      outdir: { type: 'string' },
      quiet: { type: 'boolean' },
      save: { type: 'boolean' },
      ...matrixConfig,
    },
  }).values
  return {
    /* c8 ignore next */
    outdir: resolve(outdir ?? '.build'),
    verbose: !quiet,
    save,
    matrix: getMatrix(matrix),
  }
}

const main = async () => {
  const o = parseArgs()
  rmSync(o.outdir, { recursive: true, force: true })
  const { bundles, compilations } = await generateMatrix(o)
  console.log(
    JSON.stringify(
      [...bundles, ...compilations].map(p => p.dir),
      null,
      2,
    ),
  )
}

await main()
