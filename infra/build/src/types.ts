export const All = 'all'

export const Bins = {
  vlt: 'vlt',
  vlr: 'vlr',
  vlx: 'vlx',
  vlrx: 'vlrx',
  vlix: 'vlix',
} as const
export const DefaultBin = Bins.vlt
export const BinNames = Object.values(Bins)
export type Bin = (typeof Bins)[keyof typeof Bins]
export const isBin = (v: unknown): v is Bin =>
  BinNames.includes(v as Bin)

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

export type Factors = {
  arch: Arch
  compile: boolean
  externalCommands: boolean
  format: Format
  minify: boolean
  platform: Platform
  runtime: Runtime
  sourcemap: boolean
}

export type Keys = keyof Factors

export const metaKeys = ['compile'] as const

export type MetaKeys = (typeof metaKeys)[number]

export type Matrix = Omit<Factors, MetaKeys>

export const pickMatrix = (
  m: FactorSets,
): Omit<FactorSets, MetaKeys> => ({
  arch: m.arch,
  externalCommands: m.externalCommands,
  format: m.format,
  minify: m.minify,
  platform: m.platform,
  runtime: m.runtime,
  sourcemap: m.sourcemap,
})

export type FactorSets = {
  [K in keyof Factors]: Set<Factors[K]>
}

export type FactorArrays = {
  [K in keyof Factors]: Factors[K][]
}

export const bundleKeys = [
  'format',
  'externalCommands',
  'minify',
  'sourcemap',
] as const

export type BundleFactors = Pick<Factors, (typeof bundleKeys)[number]>

export const pickBundle = (m: Matrix): BundleFactors => ({
  format: m.format,
  externalCommands: m.externalCommands,
  minify: m.minify,
  sourcemap: m.sourcemap,
})

export const compileKeys = [
  'platform',
  'arch',
  'runtime',
  ...bundleKeys,
] as const

export type CompileFactors = Pick<
  Factors,
  (typeof compileKeys)[number]
>

export const pickCompilation = (m: Matrix): CompileFactors => ({
  platform: m.platform,
  arch: m.arch,
  runtime: m.runtime,
  format: m.format,
  externalCommands: m.externalCommands,
  minify: m.minify,
  sourcemap: m.sourcemap,
})