import { join, resolve } from 'node:path'
import { realpathSync, rmSync } from 'node:fs'
import { bundle, compile, BINS_DIR } from '@vltpkg/infra-build'
import type { Bin } from '@vltpkg/infra-build'
import { whichSync } from '@vltpkg/which'

const Node = realpathSync(whichSync('node'))

const Deno = realpathSync(whichSync('deno'))

const Source = {
  dir: BINS_DIR,
  bin(bin: Bin) {
    return join(this.dir, `${bin}.ts`)
  },
} as const

const Bundle = {
  dir: resolve(process.cwd(), '.build-bundle'),
  bin(bin: Bin) {
    return join(this.dir, `${bin}.js`)
  },
} as const

const Compile = {
  dir: resolve(process.cwd(), '.build-compile'),
  bin(bin: Bin) {
    return join(this.dir, bin)
  },
} as const

// only bundle/compile the vlt binary since that is all we test
// this makes the tests run faster
export const Bins = ['vlt'] as const

export type VariantType =
  | 'source'
  | 'denoSource'
  | 'bundle'
  | 'denoBundle'
  | 'compile'

export type Variant = {
  spawn: (bin: Bin) => [string] | [string, string[]]
  PATH?: string
  env?: NodeJS.ProcessEnv
  setup?: () => Promise<unknown>
  cleanup?: () => void
}

export const publishedVariant: VariantType = 'compile'

export const defaultVariants: VariantType[] = [
  'source',
  'bundle',
  'compile',
]

export const Variants: Record<VariantType, Variant> = {
  source: {
    spawn: bin => [Node, [Source.bin(bin)]],
    env: {
      NODE_OPTIONS: '--no-warnings --experimental-strip-types',
    },
  },
  denoSource: {
    spawn: bin => [
      Deno,
      [
        '-A',
        '--unstable-node-globals',
        '--unstable-bare-node-builtins',
        Source.bin(bin),
      ],
    ],
  },
  bundle: {
    spawn: bin => [Node, [Bundle.bin(bin)]],
    setup: () => bundle({ outdir: Bundle.dir, bins: Bins }),
    cleanup: () =>
      rmSync(Bundle.dir, { recursive: true, force: true }),
  },
  denoBundle: {
    spawn: bin => [Deno, ['-A', Bundle.bin(bin)]],
  },
  compile: {
    spawn: bin => [Compile.bin(bin)],
    PATH: Compile.dir,
    setup: () =>
      compile({ outdir: Compile.dir, bins: Bins, quiet: true }),
    cleanup: () =>
      rmSync(Compile.dir, { recursive: true, force: true }),
  },
}
