import { join, resolve } from 'node:path'
import { realpathSync, rmSync } from 'node:fs'
import { bundle, compile, BINS_DIR } from '@vltpkg/infra-build'
import type { Bin } from '@vltpkg/infra-build'
import { whichSync } from '@vltpkg/which'
import t from 'tap'

// only bundle/compile the vlt binary since that is all we test
// this makes the tests run faster
export const Bins = ['vlt'] as const

const ALL_VARIANTS = {
  source: 'source',
  denoSource: 'denoSource',
  bundle: 'bundle',
  denoBundle: 'denoBundle',
  compile: 'compile',
} as const

export type VariantType = keyof typeof ALL_VARIANTS

export const publishedVariant: VariantType = ALL_VARIANTS.compile

const filterVariants =
  process.env.SMOKE_TEST_VARIANTS?.split(',') ??
  Object.values(ALL_VARIANTS)

export const allVariants = Object.values(ALL_VARIANTS).filter(k =>
  filterVariants.includes(k),
)

export const defaultVariants: VariantType[] = [
  ALL_VARIANTS.source,
  ALL_VARIANTS.bundle,
  ALL_VARIANTS.compile,
].filter(k => filterVariants.includes(k))

export type Variant = {
  args: (bin: Bin) => string[]
  PATH?: string
  env?: NodeJS.ProcessEnv
  artifact?: Artifact
}

export type PrepareFn = (opts: {
  outdir: string
  bins: typeof Bins
}) => Promise<unknown>

class Artifact {
  #dir: string
  #bin: (bin: Bin) => string
  #prepare?: PrepareFn

  constructor(opts: {
    dir: string
    bin: (bin: Bin) => string
    prepare?: PrepareFn
  }) {
    this.#dir = opts.dir
    this.#bin = opts.bin
    this.#prepare = opts.prepare
  }

  get dir() {
    return this.#dir
  }

  bin(bin: Bin) {
    return join(this.#dir, this.#bin(bin))
  }

  async prepare() {
    if (this.#prepare) {
      rmSync(this.#dir, { recursive: true, force: true })
      await this.#prepare({ outdir: this.#dir, bins: Bins })
    }
  }

  cleanup() {
    if (this.#prepare && !t.saveFixture) {
      rmSync(this.#dir, { recursive: true, force: true })
    }
  }
}

export const Artifacts: Record<
  Exclude<VariantType, `deno${string}`>,
  Artifact
> = {
  source: new Artifact({
    dir: BINS_DIR,
    bin: bin => `${bin}.ts`,
  }),
  bundle: new Artifact({
    dir: resolve(process.cwd(), '.build-bundle'),
    bin: bin => `${bin}.js`,
    prepare: bundle,
  }),
  compile: new Artifact({
    dir: resolve(process.cwd(), '.build-compile'),
    bin: bin => (process.platform === 'win32' ? `${bin}.exe` : bin),
    prepare: opts => compile({ ...opts, quiet: true }),
  }),
}

export const Runtimes = {
  node: realpathSync(whichSync('node')),
  deno: realpathSync(whichSync('deno')),
}

export const Variants: Record<VariantType, Variant> = {
  source: {
    args: bin => [Runtimes.node, Artifacts.source.bin(bin)],
    env: {
      NODE_OPTIONS: '--no-warnings --experimental-strip-types',
    },
  },
  denoSource: {
    args: bin => [
      Runtimes.deno,
      '-A',
      '--unstable-node-globals',
      '--unstable-bare-node-builtins',
      Artifacts.source.bin(bin),
    ],
  },
  bundle: {
    args: bin => [Runtimes.node, Artifacts.bundle.bin(bin)],
  },
  denoBundle: {
    args: bin => [Runtimes.deno, '-A', Artifacts.bundle.bin(bin)],
  },
  compile: {
    args: bin => [Artifacts.compile.bin(bin)],
    PATH: Artifacts.compile.dir,
  },
}
