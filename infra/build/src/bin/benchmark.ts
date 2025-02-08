import { join, resolve } from 'node:path'
import { rmSync } from 'node:fs'
import { parseArgs as nodeParseArgs } from 'node:util'
import { spawnSync } from 'node:child_process'
import generateMatrix, { matrixConfig, getMatrix } from '../matrix.ts'
import * as types from '../types.ts'
import assert from 'node:assert'

const parseArgs = () => {
  const { outdir, command, save, quiet, hyperfine, ...matrix } =
    nodeParseArgs({
      options: {
        outdir: { type: 'string' },
        command: { type: 'string' },
        save: { type: 'boolean' },
        quiet: { type: 'boolean' },
        hyperfine: {
          type: 'string',
          multiple: true,
          default: ['--warmup=5'],
        },
        ...matrixConfig,
      },
    }).values
  const args = (command ?? 'vlt pkg get').split(' ')
  const bin = args.shift()

  assert(
    types.isBin(bin),
    new Error('invalid bin', {
      cause: {
        found: bin,
        wanted: types.BinNames,
      },
    }),
  )
  assert(Array.isArray(hyperfine), 'hyperfine')

  return {
    /* c8 ignore next */
    outdir: resolve(outdir ?? '.benchmark'),
    args,
    bin,
    hyperfine,
    save,
    verbose: !quiet,
    matrix: getMatrix(matrix),
  }
}

const getRunFile = (runtime: types.Runtime) => {
  const args = runtime === types.Runtimes.Deno ? 'run -A' : ''
  return [runtime, args].filter(Boolean).join(' ')
}

const main = async () => {
  const { hyperfine, args, ...o } = parseArgs()
  rmSync(o.outdir, { recursive: true, force: true })

  const { bundles, compilations } = await generateMatrix({
    ...o,
    bin: [o.bin],
  })

  const benchmarks = new Set<string>()
  if (o.matrix.bundle) {
    for (const p of bundles) {
      for (const r of o.matrix.factors.runtime) {
        benchmarks.add(`${getRunFile(r)} ${join(p.dir, o.bin)}.js`)
      }
    }
  }
  if (o.matrix.compile) {
    for (const p of compilations) {
      benchmarks.add(join(p.dir, o.bin))
    }
  }
  if (!benchmarks.size) {
    throw new Error(
      'no benchmark matrix generated for supplied options',
    )
  }

  spawnSync(
    'hyperfine',
    [
      ...hyperfine,
      '-L',
      'cmd',
      [...benchmarks].map(a => JSON.stringify(a)).join(','),
      JSON.stringify(`{cmd} ${args.join(' ')}`),
    ],
    {
      stdio: 'inherit',
      shell: true,
    },
  )

  if (!o.save) {
    rmSync(o.outdir, { recursive: true, force: true })
  }
}

await main()
