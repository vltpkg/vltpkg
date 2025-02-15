import { readdirSync } from 'node:fs'
import {
  resolve,
  join,
  dirname,
  basename,
  extname,
  relative,
} from 'node:path'
import { findPackageJson } from 'package-json-from-dist'
import * as os from 'node:os'
import * as types from './types.ts'
import assert from 'node:assert'

const BUILD_ROOT = dirname(findPackageJson(import.meta.filename))
const MONO_ROOT = resolve(BUILD_ROOT, '../..')
const SRC = join(MONO_ROOT, 'src')
const CLI = join(SRC, 'vlt')
const COMMANDS = join(CLI, 'src/commands')
const BINS = join(CLI, 'src/bins')

export const Paths = {
  BUILD_ROOT,
  MONO_ROOT,
  SRC,
  CLI,
  COMMANDS,
  BINS,
}

export const Bins = (() => {
  const bin = readdirSync(BINS, {
    withFileTypes: true,
  }).reduce<Record<string, string>>((acc, b) => {
    acc[basename(b.name, extname(b.name))] = relative(
      CLI,
      join(b.parentPath, b.name),
    )
    return acc
  }, {})
  assert(
    [...types.BinNames].sort().join() ===
      Object.keys(bin).sort().join(),
    new Error(`${BINS} files must match types`),
  )
  const paths = Object.values<string>(bin)
  assert(
    paths[0],
    new Error(`bin field in ${CLI} must be an object of paths`),
  )
  return paths
})()

export const fullMatrix = (): Readonly<types.FactorArrays> => {
  return {
    minify: types.BooleanValues.map(types.toBoolean),
    sourcemap: types.BooleanValues.map(types.toBoolean),
    splitting: types.BooleanValues.map(types.toBoolean),
    compile: types.BooleanValues.map(types.toBoolean),
    runtime: types.RuntimeValues,
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
    splitting: true,
    compile: false,
    runtime: types.Runtimes.Node,
    platform:
      types.isPlatform(osPlatform) ? osPlatform : types.Platforms.Mac,
    arch: types.isArch(osArch) ? osArch : types.Archs.arm64,
  } as const
}

export const defaultMatrix = (): Readonly<types.FactorArrays> => {
  const defaults = defaultOptions()
  return {
    minify: [defaults.minify],
    sourcemap: [defaults.sourcemap],
    splitting: [defaults.splitting],
    compile: [defaults.compile],
    runtime: [defaults.runtime],
    platform: [defaults.platform],
    arch: [defaults.arch],
  } as const
}
