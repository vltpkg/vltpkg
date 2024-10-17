import { readFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { findPackageJson } from 'package-json-from-dist'
import * as os from 'node:os'
import * as types from './types.js'
import assert from 'node:assert'

const BUILD_ROOT = dirname(findPackageJson(import.meta.filename))
const MONO_ROOT = resolve(BUILD_ROOT, '../..')
const SRC = join(MONO_ROOT, 'src')
const CLI = join(SRC, 'vlt')
// TODO(source-maps): this is a ./dist/ path which might need
// to be changed to a src path to get proper sourcemaps
// https://github.com/vltpkg/vltpkg/issues/150
const COMMANDS = join(CLI, 'dist/esm/commands')

export const Paths = {
  BUILD_ROOT,
  MONO_ROOT,
  SRC,
  CLI,
  COMMANDS,
}

export const Bins = (() => {
  const { bin } = JSON.parse(
    readFileSync(join(CLI, 'package.json'), 'utf8'),
  )
  assert(
    [...types.BinNames].sort().join() ===
      Object.keys(bin).sort().join(),
    new Error(`bin field in ${CLI} must match types`),
  )
  const paths = Object.values<string>(bin)
  assert(
    paths[0],
    new Error(`bin field in ${CLI} must be an object of paths`),
  )
  return {
    PATHS: paths,
    // TODO(source-maps): this is a ./dist/ path which might need
    // to be changed to a src path to get proper sourcemaps
    // https://github.com/vltpkg/vltpkg/issues/150
    DIR: join(CLI, dirname(paths[0])),
  }
})()

export const fullMatrix = (): Readonly<types.FactorArrays> => {
  return {
    minify: types.BooleanValues.map(types.toBoolean),
    sourcemap: types.BooleanValues.map(types.toBoolean),
    externalCommands: types.BooleanValues.map(types.toBoolean),
    compile: types.BooleanValues.map(types.toBoolean),
    runtime: types.RuntimeValues,
    format: types.FormatValues,
    platform: types.PlatformValues,
    arch: types.ArchValues,
  } as const
}

export const defaultOptions = (): Readonly<types.Factors> => {
  const osPlatform = os.platform()
  const osArch = os.arch()
  return {
    minify: false,
    sourcemap: true,
    externalCommands: true,
    compile: false,
    runtime: types.Runtimes.Node,
    format: types.Formats.Esm,
    platform:
      types.isPlatform(osPlatform) ? osPlatform : types.Platforms.Mac,
    arch: types.isArch(osArch) ? osArch : types.Archs.arm64,
  } as const
}

export const defaultMatrix = (
  o?: Pick<types.FactorSets, 'compile' | 'runtime'>,
): Readonly<types.FactorArrays> => {
  const defaults = defaultOptions()
  const formats = new Set([defaults.format])
  if (
    o?.runtime.has(types.Runtimes.Bun) ||
    o?.runtime.has(types.Runtimes.Deno)
  ) {
    formats.add(types.Formats.Esm)
  }
  if (o?.runtime.has(types.Runtimes.Node) && o.compile.has(true)) {
    formats.add(types.Formats.Cjs)
  }
  return {
    minify: [defaults.minify],
    sourcemap: [defaults.sourcemap],
    externalCommands: [defaults.externalCommands],
    compile: [defaults.compile],
    runtime: [defaults.runtime],
    format: [...formats],
    platform: [defaults.platform],
    arch: [defaults.arch],
  } as const
}
