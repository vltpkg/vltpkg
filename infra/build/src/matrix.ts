import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { parseArgs } from 'node:util'
import bundle, { getBundleOptions } from './bundle.js'
import compile from './compile.js'
import * as types from './types.js'
import { defaultMatrix } from './index.js'

type MatrixMetaKeys = 'compile'

type MatrixElement = Omit<types.Matrix, MatrixMetaKeys>

type MatrixBundle = MatrixElement & {
  bundleId: string
}

type MatrixCompilation = MatrixElement & {
  bundleId: string
  compileId: string
}

type MatrixParseArgsConfig = Record<
  keyof types.Matrix,
  { type: 'string'; multiple: true }
> &
  Record<'all' | 'publish', { type: 'boolean' }>

type MatrixParseArgsValues = Partial<
  ReturnType<
    typeof parseArgs<{ options: MatrixParseArgsConfig }>
  >['values']
>

const isBundleSupported = (o: types.BundleFactors) => {
  // bun and deno are esm only
  if (
    o.runtime === types.Runtimes.Deno ||
    o.runtime === types.Runtimes.Bun
  ) {
    return o.format === types.Formats.Esm
  }
  return true
}

const isCompileSupported = (o: types.CompileFactors) => {
  if (
    o.runtime === types.Runtimes.Deno &&
    o.arch === types.Archs.arm64 &&
    o.platform === types.Platforms.Win
  ) {
    // deno does not support arm64+windows
    // https://github.com/denoland/deno/issues/13331
    return false
  }
  // node must use cjs to compile
  return (
    o.format ===
    (o.runtime == types.Runtimes.Node ?
      types.Formats.Cjs
    : types.Formats.Esm)
  )
}

export const matrixConfig: MatrixParseArgsConfig = {
  all: { type: 'boolean' },
  publish: { type: 'boolean' },
  minify: { type: 'string', multiple: true },
  sourcemap: { type: 'string', multiple: true },
  externalCommands: { type: 'string', multiple: true },
  compile: { type: 'string', multiple: true },
  runtime: { type: 'string', multiple: true },
  format: { type: 'string', multiple: true },
  platform: { type: 'string', multiple: true },
  arch: { type: 'string', multiple: true },
} as const

// Allow multiple args to be specified multiple times or comma delimited values
// Always returns a unique array of args since each matrix value cannot be
// specified more than once.
const parseMatrixArg = <T, U = T>(
  matrix: MatrixParseArgsValues,
  key: keyof types.MatrixOptions,
  is: (v: unknown) => v is T,
  map: (v: T) => U = v => v as unknown as U,
): Set<U> | undefined =>
  matrix[key] === undefined ?
    undefined
  : new Set(
      matrix[key]
        .filter(a => typeof a === 'string')
        .reduce<string[]>(
          (acc, arg) => acc.concat(arg.split(',')),
          [],
        )
        .map(v => {
          if (!is(v)) {
            throw new Error(
              `invalid value of '${v}' for key ${String(key)}`,
            )
          }
          return map(v)
        }),
    )

const parseBooleanArg = (
  matrix: MatrixParseArgsValues,
  key: keyof types.MatrixOptions,
) => parseMatrixArg(matrix, key, types.isBoolean, types.toBoolean)

const parseMatrixArgs = <T extends MatrixElement>(
  o: MatrixParseArgsValues = {},
): {
  matrix: T[]
  meta: Pick<types.MatrixOptions, MatrixMetaKeys>
} => {
  const full = defaultMatrix(true)
  const defs = defaultMatrix()
  const matrix = {
    minify:
      o.all ?
        full.minify
      : (parseBooleanArg(o, 'minify') ?? defs.minify),
    sourcemap:
      o.all ?
        full.sourcemap
      : (parseBooleanArg(o, 'sourcemap') ?? defs.sourcemap),
    externalCommands:
      o.all ?
        full.externalCommands
      : (parseBooleanArg(o, 'externalCommands') ??
        defs.externalCommands),
    runtime:
      o.all ?
        full.runtime
      : (parseMatrixArg(o, 'runtime', types.isRuntime) ??
        defs.runtime),
    format:
      o.all ?
        full.format
      : (parseMatrixArg(o, 'format', types.isFormat) ?? defs.format),
    platform:
      o.publish || o.all ?
        full.platform
      : (parseMatrixArg(o, 'platform', types.isPlatform) ??
        defs.platform),
    arch:
      o.publish || o.all ?
        full.arch
      : (parseMatrixArg(o, 'arch', types.isArch) ?? defs.arch),
  }

  const compile =
    o.all ?
      full.compile
    : (parseBooleanArg(o, 'compile') ?? defs.compile)

  if (
    matrix.runtime.has(types.Runtimes.Deno) ||
    matrix.runtime.has(types.Runtimes.Bun)
  ) {
    matrix.format.add(types.Formats.Esm)
  }

  if (matrix.runtime.has(types.Runtimes.Node) && compile.has(true)) {
    matrix.format.add(types.Formats.Cjs)
  }

  return {
    meta: { compile },
    matrix: Object.entries(matrix).reduce<T[]>(
      (m, [k, vs]) =>
        (m.length ? m : [{} as T]).reduce<T[]>(
          (acc, i) =>
            acc.concat([...vs].map(v => ({ ...i, [k]: v }))),
          [],
        ),
      [],
    ),
  }
}

const getId = (keys: readonly string[], o: Record<string, unknown>) =>
  keys
    .map(k =>
      typeof o[k] === 'boolean' ?
        o[k] ?
          k
        : `no_${k}`
      : (o[k] ?? ''),
    )
    .filter(v => v !== '')
    .join('-')

const getBundleId = (m: types.BundleFactors) =>
  isBundleSupported(m) ?
    getId(types.bundleFactorKeys, {
      ...m,
      // runtime does not effect the bundle except if getBundleOptions returns an object
      runtime:
        typeof getBundleOptions(m) === 'object' ?
          m.runtime
        : undefined,
    })
  : undefined

const getCompileId = (m: types.CompileFactors) =>
  isCompileSupported(m) ?
    getId(types.compileFactorsKeys, m)
  : undefined

export const getMatrix = (o: MatrixParseArgsValues = {}) => {
  const { matrix, meta } = parseMatrixArgs(o)

  const bundles = new Map<string, MatrixBundle>()
  const compilations = new Map<string, MatrixCompilation>()
  for (const m of matrix) {
    const bundleId = getBundleId(m)
    const compileId = getCompileId(m)
    if (bundleId) {
      bundles.set(bundleId, { ...m, bundleId })
      if (compileId) {
        compilations.set(compileId, { ...m, bundleId, compileId })
      }
    }
  }

  return {
    bundle: meta.compile.has(false),
    bundles: [...bundles.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([, v]) => v),
    compile: meta.compile.has(true),
    compilations: [...compilations.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([, v]) => v),
  }
}

export default async (
  o: { outdir: string; verbose?: boolean },
  matrix: ReturnType<typeof getMatrix>,
) => {
  const bundleResults: [string, MatrixBundle][] = []
  const compilationResults: [string, MatrixCompilation][] = []

  for (const b of matrix.bundles) {
    const path = join(o.outdir, b.bundleId)
    if (o.verbose) {
      console.log(`bundling - ${b.bundleId}`)
    }
    await bundle({ ...b, outdir: path })
    bundleResults.push([path, b])
  }

  if (matrix.compile) {
    for (const c of matrix.compilations) {
      const source = join(o.outdir, c.bundleId)
      const path = join(o.outdir, c.compileId)
      if (o.verbose) {
        console.log(`compiling - ${c.compileId}`)
      }
      compile({ ...c, source, outdir: path })
      compilationResults.push([path, c])
    }
  }

  if (matrix.compile && !matrix.bundle) {
    for (const [path] of bundleResults) {
      rmSync(path, { recursive: true, force: true })
    }
  }

  return {
    bundles: bundleResults,
    compilations: compilationResults,
  }
}
