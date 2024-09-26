import { readFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { findPackageJson } from 'package-json-from-dist'
import * as os from 'node:os'
import * as types from './types.js'

const osPlatform = os.platform()
const osArch = os.arch()

const BUILD_ROOT = dirname(findPackageJson(import.meta.filename))
const MONO_ROOT = resolve(BUILD_ROOT, '../..')
const SRC = join(MONO_ROOT, 'src')
const CLI = join(SRC, 'vlt')
const CLI_PKG = JSON.parse(
  readFileSync(join(CLI, 'package.json'), 'utf8'),
)
export const BIN_NAMES = Object.keys(CLI_PKG.bin)
export const Paths = {
  BUILD_ROOT,
  MONO_ROOT,
  SRC,
  CLI,
  BINS: Object.values<string>(CLI_PKG.bin),
}

export const defaultOptions = (): Readonly<types.Matrix> =>
  ({
    minify: false,
    sourcemap: true,
    externalCommands: true,
    compile: true,
    runtime: types.Runtimes.Deno,
    format: types.Formats.Esm,
    platform:
      types.isPlatform(osPlatform) ? osPlatform : types.Platforms.Mac,
    arch: types.isArch(osArch) ? osArch : types.Archs.arm64,
  }) as const

export const defaultMatrix = (
  all?: boolean,
): Readonly<types.MatrixOptions> => {
  if (all) {
    return {
      minify: new Set(types.BooleanValues.map(types.toBoolean)),
      sourcemap: new Set(types.BooleanValues.map(types.toBoolean)),
      externalCommands: new Set(
        types.BooleanValues.map(types.toBoolean),
      ),
      compile: new Set(types.BooleanValues.map(types.toBoolean)),
      runtime: new Set(types.RuntimeValues),
      format: new Set(types.FormatValues),
      platform: new Set(types.PlatformValues),
      arch: new Set(types.ArchValues),
    } as const
  }
  const defaults = defaultOptions()
  return {
    minify: new Set([defaults.minify]),
    sourcemap: new Set([defaults.sourcemap]),
    externalCommands: new Set([defaults.externalCommands]),
    compile: new Set([defaults.compile]),
    runtime: new Set([defaults.runtime]),
    format: new Set([defaults.format]),
    platform: new Set([defaults.platform]),
    arch: new Set([defaults.arch]),
  } as const
}
