import { dirname, join } from 'node:path'
import { rmSync } from 'node:fs'
import { parseArgs as nodeParseArgs } from 'node:util'
import { spawnSync } from 'node:child_process'
import { findPackageJson } from 'package-json-from-dist'
import generateMatrix, { matrixConfig, getMatrix } from './matrix.js'
import { Runtime, Runtimes } from './types.js'

const parseArgs = () => {
  const {
    values: {
      args,
      bin,
      hyperfine,
      saveFixtures,
      verbose,
      ...matrix
    },
  } = nodeParseArgs({
    options: {
      args: { type: 'string' },
      bin: { type: 'string' },
      saveFixtures: { type: 'boolean' },
      hyperfine: { type: 'string', multiple: true },
      verbose: { type: 'boolean' },
      ...matrixConfig,
    } as const,
  })
  return {
    args: args ?? 'pkg get',
    bin: bin ?? 'vlt',
    hyperfine: hyperfine ?? [],
    saveFixtures: saveFixtures ?? false,
    verbose,
    matrix: getMatrix(matrix),
  }
}

const getRunFile = (o: { runtime: Runtime }) => {
  if (o.runtime === Runtimes.Deno) {
    return 'deno run -A'
  }
  if (o.runtime === Runtimes.Bun) {
    return 'bun'
  }
  return 'node'
}

const benchmark = async () => {
  const o = parseArgs()

  const cwd = dirname(findPackageJson(import.meta.filename))
  const outdir = join(cwd, '.benchmark')
  rmSync(outdir, { recursive: true, force: true })

  const { bundles, compilations } = await generateMatrix(
    { outdir, verbose: o.verbose },
    o.matrix,
  )

  const benchmarks = new Set<string>()

  if (o.matrix.bundle) {
    for (const [path, matrix] of bundles) {
      benchmarks.add(`${getRunFile(matrix)} ${join(path, o.bin)}.js`)
    }
  }

  if (o.matrix.compile) {
    for (const [path] of compilations) {
      benchmarks.add(join(path, o.bin))
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
      '--warmup=5',
      ...o.hyperfine,
      '-L',
      'cmd',
      [...benchmarks].map(a => `"${a}"`).join(','),
      `"{cmd} ${o.args}"`,
    ],
    {
      cwd,
      stdio: 'inherit',
      shell: true,
    },
  )

  if (!o.saveFixtures) {
    rmSync(outdir, { recursive: true, force: true })
  }
}

await benchmark()
