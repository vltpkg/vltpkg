export const Booleans = {
  True: 'true',
  False: 'false',
} as const
export const BooleanValues = Object.values(Booleans)
export type Boolean = (typeof Booleans)[keyof typeof Booleans]
export const isBoolean = (v: unknown): v is Boolean =>
  BooleanValues.includes(v as Boolean)
export const toBoolean = (v: Boolean) => v === Booleans.True

export const Platforms = {
  Linux: 'linux',
  Win: 'win32',
  Mac: 'darwin',
} as const
export const PlatformValues = Object.values(Platforms)
export type Platform = (typeof Platforms)[keyof typeof Platforms]
export const isPlatform = (v: unknown): v is Platform =>
  PlatformValues.includes(v as Platform)

export const Archs = {
  x64: 'x64',
  arm64: 'arm64',
} as const
export const ArchValues = Object.values(Archs)
export type Arch = (typeof Archs)[keyof typeof Archs]
export const isArch = (v: unknown): v is Arch =>
  ArchValues.includes(v as Arch)

export const Runtimes = {
  Node: 'node',
  Deno: 'deno',
  Bun: 'bun',
} as const
export const RuntimeValues = Object.values(Runtimes)
export type Runtime = (typeof Runtimes)[keyof typeof Runtimes]
export const isRuntime = (v: unknown): v is Runtime =>
  RuntimeValues.includes(v as Runtime)

export const Formats = {
  Cjs: 'cjs',
  Esm: 'esm',
} as const
export const FormatValues = Object.values(Formats)
export type Format = (typeof Formats)[keyof typeof Formats]
export const isFormat = (v: unknown): v is Format =>
  FormatValues.includes(v as Format)

export const bundleFactorKeys = [
  'runtime',
  'format',
  'externalCommands',
  'minify',
  'sourcemap',
] as const

export type BundleFactors = {
  runtime: Runtime
  format: Format
  externalCommands: boolean
  minify: boolean
  sourcemap: boolean
}

export type BundleOptions = {
  outdir: string
} & BundleFactors

export const compileFactorsKeys = [
  'runtime',
  'format',
  'platform',
  'arch',
] as const

export type CompileFactors = {
  runtime: Runtime
  format: Format
  platform: Platform
  arch: Arch
}

export type CompileOptions = {
  source: string
  outdir: string
} & CompileFactors

export type Matrix = {
  minify: boolean
  sourcemap: boolean
  externalCommands: boolean
  runtime: Runtime
  format: Format
  platform: Platform
  arch: Arch
  compile: boolean
}

export type MatrixOptions = {
  [K in keyof Matrix]: Set<Matrix[K]>
}
