import { join, resolve, dirname } from 'node:path'
import { bundle, compile, BINS_DIR } from '@vltpkg/infra-build'
import { rootCompile } from './root-compile.ts'

// only bundle/compile the vlt binary since that is all we test
// this makes the tests run faster
const BINS = ['vlt'] as const

export type VariantType =
  | 'source'
  | 'bundle'
  | 'compile'
  | 'rootCompile'
  | 'rootCompileNoScripts'

export type Variant = {
  type: VariantType
  default: boolean
  dir: string
  command: string | ((opts: { bin: string }) => string)
  path: string | (({ dir }: { dir: string }) => string)
  arg0?: (opts: { dir: string; bin: string }) => string
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
    arg0: ({ dir, bin }) => join(dir, `${bin}.ts`),
    env: {
      NODE_OPTIONS: '--no-warnings --experimental-strip-types',
    },
  },
  bundle: {
    type: 'bundle',
    default: true,
    dir: resolve(process.cwd(), '.build-bundle'),
    command: process.execPath,
    path: dirname(process.execPath),
    arg0: ({ dir, bin }) => join(dir, `${bin}.js`),
    setup: ({ dir }) => bundle({ outdir: dir, bins: BINS }),
  },
  compile: {
    type: 'compile',
    default: true,
    dir: resolve(process.cwd(), '.build-compile'),
    command: ({ bin }) => bin,
    path: ({ dir }) => dir,
    setup: ({ dir }) =>
      compile({ outdir: dir, bins: BINS, stdio: 'pipe' }),
  },
  rootCompile: {
    type: 'rootCompile',
    default: false,
    dir: resolve(process.cwd(), '.build-compile-root'),
    command: ({ bin }) => bin,
    path: ({ dir }) => join(dir, 'node_modules', '.bin'),
    setup: ({ dir }) => rootCompile({ outdir: dir, bins: BINS }),
  },
  rootCompileNoScripts: {
    type: 'rootCompileNoScripts',
    default: false,
    dir: resolve(process.cwd(), '.build-compile-root-no-scripts'),
    command: ({ bin }) => bin,
    path: ({ dir }) => join(dir, 'node_modules', '.bin'),
    setup: ({ dir }) =>
      rootCompile({ outdir: dir, bins: BINS, noScripts: true }),
  },
}
