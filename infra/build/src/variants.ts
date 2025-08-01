import { posix, win32 } from 'node:path'
import { rm } from 'node:fs/promises'
import { bundle } from './bundle.ts'
import { compile } from './compile.ts'
import { BINS } from './bins.ts'
import type { Bin } from './bins.ts'

export const VARIANTS = ['Source', 'Bundle', 'Compile'] as const

// Changing this will change which variant is published as `vlt` on npm.
export const PUBLISHED_VARIANT: 'Bundle' | 'Compile' = 'Bundle'

export const isVariant = (value: unknown): value is Variant =>
  VARIANTS.includes(value as Variant)

export type Variant = (typeof VARIANTS)[number]

export type VariantOptions = {
  args: (bin: Bin) => string[]
  PATH?: string
  env?: Record<string, string>
}

export type Artifact = {
  dir: string
  bin: (bin: Bin) => string
  prepare?: () => Promise<unknown>
  cleanup?: () => Promise<unknown>
}

export type VariantWithArtifact = VariantOptions & {
  artifact: Artifact
}

export const createArtifacts = ({
  dirs,
  bins = BINS,
  windows = process.platform === 'win32',
  cleanup = true,
}: {
  dirs: Record<Variant, string>
  bins?: readonly Bin[]
  windows?: boolean
  cleanup?: boolean
}): Record<Variant, Artifact> => {
  const path = windows ? win32 : posix
  const createCleanup = (dir: string) =>
    cleanup ?
      () => rm(dir, { recursive: true, force: true })
    : undefined
  return {
    Source: {
      dir: dirs.Source,
      bin: bin => path.join(dirs.Source, `${bin}.ts`),
    },
    Bundle: {
      dir: dirs.Bundle,
      bin: bin => path.join(dirs.Bundle, `${bin}.js`),
      prepare: () => bundle({ outdir: dirs.Bundle, bins }),
      cleanup: createCleanup(dirs.Bundle),
    },
    Compile: {
      dir: dirs.Compile,
      bin: bin =>
        path.join(dirs.Compile, bin) + (windows ? '.exe' : ''),
      prepare: () =>
        compile({ outdir: dirs.Compile, bins, quiet: true }),
      cleanup: createCleanup(dirs.Compile),
    },
  } as const
}

export const Variants: Partial<
  Record<Variant, Pick<VariantOptions, 'env'>>
> = {
  Source: {
    env: {
      NODE_OPTIONS:
        '--no-warnings --enable-source-maps --experimental-strip-types',
    },
  },
  Bundle: {
    env: {
      NODE_OPTIONS: '--no-warnings --enable-source-maps',
    },
  },
}

export const createVariants = ({
  artifacts,
  node = 'node',
}: {
  artifacts: Record<Variant, Artifact>
  node?: string
}): Record<Variant, VariantWithArtifact> =>
  ({
    Source: {
      artifact: artifacts.Source,
      args: bin => [node, artifacts.Source.bin(bin)],
      ...Variants.Source,
    },
    Bundle: {
      artifact: artifacts.Bundle,
      args: bin => [node, artifacts.Bundle.bin(bin)],
      ...Variants.Bundle,
    },
    Compile: {
      artifact: artifacts.Compile,
      args: bin => [artifacts.Compile.bin(bin)],
      PATH: artifacts.Compile.dir,
      ...Variants.Compile,
    },
  }) as const
