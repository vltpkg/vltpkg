import { join } from 'node:path'
import { rmSync } from 'node:fs'
import bundle from './bundle.ts'
import compile from './compile.ts'
import * as types from './types.ts'
import { defaultMatrix, fullMatrix } from './index.ts'

export type Bundle = types.BundleFactors & {
  bundleId: string
  compileId?: never
}

export type BundleDir = Bundle & {
  dir: string
}

export type Compilation = types.CompileFactors & {
  bundleId: string
  compileId: string
}

export type CompilationDir = Compilation & {
  dir: string
}

export type ParseArgs = {
  defaults: types.FactorArrays
  full: types.FactorArrays
  matrix: Partial<
    Record<'all', boolean | undefined> &
      Record<types.Keys, string[] | boolean[] | undefined>
  >
}

export const matrixConfig: Record<
  types.Keys,
  { type: 'string'; multiple: true }
> &
  Record<'all', { type: 'boolean' }> = {
  all: { type: 'boolean' },
  minify: { type: 'string', multiple: true },
  sourcemap: { type: 'string', multiple: true },
  externalCommands: { type: 'string', multiple: true },
  compile: { type: 'string', multiple: true },
  runtime: { type: 'string', multiple: true },
  platform: { type: 'string', multiple: true },
  arch: { type: 'string', multiple: true },
} as const

// Allow multiple args to be specified multiple times or comma delimited values
// Always returns a unique array of args since each matrix value cannot be
// specified more than once.
const parseArg = <T, U = T>(
  key: types.Keys,
  { matrix, defaults, full }: ParseArgs,
  is: (v: unknown) => v is T,
  map: (v: T) => U = v => v as unknown as U,
): Set<U> => {
  const fullValue = full[key] as U[]
  return new Set(
    matrix.all ? fullValue
    : matrix[key] === undefined ? (defaults[key] as U[])
    : matrix[key]
        .reduce<string[]>(
          (acc, arg) =>
            acc.concat(
              (typeof arg === 'boolean' ? arg.toString() : arg).split(
                ',',
              ),
            ),
          [],
        )
        .flatMap(v => {
          if (v === types.All) {
            return fullValue
          }
          if (!is(v)) {
            throw new Error(
              `invalid value of '${v}' for key ${String(key)}`,
            )
          }
          return map(v)
        }),
  )
}

const parseBoolean = (key: types.Keys, o: ParseArgs) =>
  parseArg(key, o, types.isBoolean, types.toBoolean)

const parseArgs = (
  args: ParseArgs['matrix'] = {},
): types.FactorSets => {
  const o = {
    matrix: args,
    full: fullMatrix(),
    defaults: defaultMatrix(),
  }
  // compile and runtime can affect other args
  const compile = parseBoolean('compile', o)
  const runtime = parseArg('runtime', o, types.isRuntime)
  o.defaults = defaultMatrix()
  return {
    compile,
    runtime,
    minify: parseBoolean('minify', o),
    sourcemap: parseBoolean('sourcemap', o),
    externalCommands: parseBoolean('externalCommands', o),
    platform: parseArg('platform', o, types.isPlatform),
    arch: parseArg('arch', o, types.isArch),
  }
}

const getId = (
  prefix: string,
  keys: readonly string[],
  o: Record<string, unknown>,
) =>
  [
    prefix,
    ...keys
      .map(k =>
        typeof o[k] === 'boolean' ?
          o[k] ?
            k
          : `no_${k}`
        : o[k],
      )
      .filter(v => v !== ''),
  ].join('-')

const isBundleSupported = (o: types.Matrix) => {
  if (
    o.runtime === types.Runtimes.Deno ||
    o.runtime === types.Runtimes.Bun
  ) {
    // bun+deno must use esm
    return true
  }
  return true
}

const isCompileSupported = (o: types.Matrix) => {
  if (
    o.runtime === types.Runtimes.Deno &&
    o.arch === types.Archs.arm64 &&
    o.platform === types.Platforms.Win
  ) {
    // deno does not support arm64+windows
    // https://github.com/denoland/deno/issues/13331
    return false
  }
  if (o.runtime === types.Runtimes.Node) {
    // node must use cjs to compile
    return false
  }
  // bun+deno must use esm
  return true
}

export const getMatrix = (o: ParseArgs['matrix'] = {}) => {
  const factors = parseArgs(o)

  const bundle = factors.compile.has(false)
  const compile = factors.compile.has(true)

  const matrix = Object.entries(types.pickMatrix(factors)).reduce<
    types.Matrix[]
  >(
    (m, [k, vs]) =>
      (m.length ? m : [{} as types.Matrix]).reduce<types.Matrix[]>(
        (acc, i) => acc.concat([...vs].map(v => ({ ...i, [k]: v }))),
        [],
      ),
    [],
  )

  const bundles = new Map<string, Bundle>()
  const compilations = new Map<string, Compilation>()

  for (const m of matrix) {
    if (!isBundleSupported(m)) {
      continue
    }
    const bundleId = getId('bundle', types.bundleKeys, m)
    bundles.set(bundleId, { ...types.pickBundle(m), bundleId })
    if (compile && isCompileSupported(m)) {
      const compileId = getId('compile', types.compileKeys, m)
      compilations.set(compileId, {
        ...types.pickCompilation(m),
        bundleId,
        compileId,
      })
    }
  }

  return {
    factors,
    bundle,
    bundles: [...bundles.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([, v]) => v),
    compile,
    compilations: [...compilations.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([, v]) => v),
  }
}

export default async (o: {
  outdir: string
  verbose?: boolean
  bin?: types.Bin[]
  save?: boolean
  matrix: ReturnType<typeof getMatrix>
}) => {
  const bundles: BundleDir[] = []
  const compilations: CompilationDir[] = []
  const cleanup: string[] = []

  for (const b of o.matrix.bundles) {
    const dir = join(o.outdir, b.bundleId)
    if (o.verbose) {
      console.log(`bundling - ${dir}`)
    }
    await bundle({ ...b, outdir: dir })
    if (o.matrix.bundle) {
      bundles.push({ dir, ...b })
    } else if (!o.save) {
      // bundles are needed as the source for compilation
      // but get deleted at the end if they arent needed
      cleanup.push(dir)
    }
  }

  if (o.matrix.compile) {
    for (const c of o.matrix.compilations) {
      const source = join(o.outdir, c.bundleId)
      const dir = join(o.outdir, c.compileId)
      if (o.verbose) {
        console.log(`compiling - ${dir}`)
      }
      for (const bin of o.bin ?? types.BinNames) {
        compile({
          ...c,
          source,
          bin,
          outdir: dir,
        })
      }
      compilations.push({ dir, ...c })
    }
  }

  for (const path of cleanup) {
    rmSync(path, { recursive: true, force: true })
  }

  return { bundles, compilations }
}
