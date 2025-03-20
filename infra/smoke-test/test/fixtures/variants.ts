import { join, resolve, dirname } from 'node:path'
import { bundle, compile, BINS_DIR } from '@vltpkg/infra-build'
import { rootCompile } from './root-compile.ts'
import { whichSync } from '@vltpkg/which'

// only bundle/compile the vlt binary since that is all we test
// this makes the tests run faster
const BINS = ['vlt'] as const

export type VariantType =
  | 'source'
  | 'denoSource'
  | 'bundle'
  | 'denoBundle'
  | 'compile'
  | 'rootCompile'
  | 'rootCompileNoScripts'

export type Variant = {
  type: VariantType
  default?: boolean
  dir: string
  command: string | ((opts: { bin: string }) => string)
  path: string | (({ dir }: { dir: string }) => string)
  args?: (opts: { dir: string; bin: string }) => string[]
  env?: NodeJS.ProcessEnv
  setup?:
    | ((opts: { dir: string }) => Promise<unknown>)
    | ((opts: { dir: string }) => unknown)
}

export const publishedVariant: VariantType = 'compile'

export const Variants: Record<VariantType, Variant> = {
  source: {
    type: 'source',
    default: true,
    dir: BINS_DIR,
    command: process.execPath,
    path: dirname(process.execPath),
    args: ({ dir, bin }) => [join(dir, `${bin}.ts`)],
    env: {
      NODE_OPTIONS: '--no-warnings --experimental-strip-types',
    },
  },
  denoSource: {
    type: 'denoSource',
    dir: BINS_DIR,
    command: whichSync('deno'),
    path: '',
    args: ({ dir, bin }) => [
      '-A',
      '--unstable-node-globals',
      '--unstable-bare-node-builtins',
      join(dir, `${bin}.ts`),
    ],
  },
  bundle: {
    type: 'bundle',
    default: true,
    dir: resolve(process.cwd(), '.build-bundle'),
    command: process.execPath,
    path: dirname(process.execPath),
    args: ({ dir, bin }) => [join(dir, `${bin}.js`)],
    setup: ({ dir }) => bundle({ outdir: dir, bins: BINS }),
  },
  denoBundle: {
    type: 'denoBundle',
    // Uses the same bundle directory as the regular bundle
    dir: resolve(process.cwd(), '.build-bundle'),
    command: whichSync('deno'),
    path: '',
    args: ({ dir, bin }) => [
      '-A',
      '--unstable-node-globals',
      '--unstable-bare-node-builtins',
      join(dir, `${bin}.js`),
    ],
  },
  compile: {
    type: 'compile',
    default: true,
    dir: resolve(process.cwd(), '.build-compile'),
    command: ({ bin }) => bin,
    path: ({ dir }) => dir,
    setup: ({ dir }) =>
      compile({ outdir: dir, bins: BINS, quiet: true }),
  },
  rootCompile: {
    type: 'rootCompile',
    dir: resolve(process.cwd(), '.build-compile-root'),
    command: ({ bin }) => bin,
    path: ({ dir }) => join(dir, 'node_modules', '.bin'),
    setup: ({ dir }) => rootCompile({ outdir: dir, bins: BINS }),
  },
  rootCompileNoScripts: {
    type: 'rootCompileNoScripts',
    dir: resolve(process.cwd(), '.build-compile-root-no-scripts'),
    command: ({ bin }) => bin,
    path: ({ dir }) => join(dir, 'node_modules', '.bin'),
    setup: ({ dir }) =>
      rootCompile({ outdir: dir, bins: BINS, noScripts: true }),
  },
}
