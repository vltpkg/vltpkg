import { mkdirSync, cpSync, existsSync } from 'node:fs'
import {
  join,
  relative,
  dirname,
  sep,
  basename,
  extname,
  resolve,
} from 'node:path'
import { readFile } from 'node:fs/promises'
import * as esbuild from 'esbuild'
import { createRequire } from 'node:module'
import assert from 'node:assert'
import { BINS_DIR, BINS } from './bins.ts'
import type { Bin } from './bins.ts'

export const CLI = dirname(
  createRequire(import.meta.url).resolve(
    '@vltpkg/cli-sdk/package.json',
  ),
)
const SRC_WORKSPACES = resolve(CLI, '..')

const toPosix = (p: string) => p.replaceAll(sep, '/')

export const basenameWithoutExtension = (p: string) =>
  basename(p, extname(p))

export const withoutExtension = (p: string) =>
  join(dirname(p), basenameWithoutExtension(p))

export const findEntryBins = (dir: string, names?: readonly Bin[]) =>
  BINS.filter(b => (names ? names.includes(b) : true))
    .map(b => join(dir, b))
    .flatMap(b => [b, `${b}.js`, `${b}.ts`])
    .filter(b => existsSync(b))

const codeSplitPlugin = (): {
  paths: () => { source: string; out: string }[]
  plugin: esbuild.Plugin
} => {
  const codeSplitIdentifier =
    'export const __CODE_SPLIT_SCRIPT_NAME ='
  const found = new Set<{ source: string; out: string }>()

  const fn = async (o: esbuild.OnLoadArgs) => {
    /* c8 ignore next - make sure we dont match any 3rd party files */
    if (!o.path.startsWith(SRC_WORKSPACES)) return
    const source = await readFile(o.path, 'utf8')
    if (source.includes(codeSplitIdentifier)) {
      const out = withoutExtension(
        relative(SRC_WORKSPACES, o.path),
      ).replaceAll(sep, '-')
      found.add({ source: o.path, out })
      return {
        // keep this as a single line because it could affect source maps
        contents:
          `import {resolve} from 'node:path';\n` +
          `${codeSplitIdentifier} resolve(import.meta.dirname, '${toPosix(out)}.js')`,
        loader: 'ts' as esbuild.Loader,
      }
    }
  }

  // All files that will be code split into external scripts
  // export __CODE_SPLIT_SCRIPT_NAME which we change to a path
  // to that external script instead
  return {
    paths: () => [...found],
    plugin: {
      name: 'code-split-plugin',
      setup({ onLoad }) {
        onLoad(
          {
            // this has to be a valid goland regex so to keep it simple
            // just filter on .ts files since that is all we write
            filter: /\.ts$/,
            namespace: 'file',
          },
          fn,
        )
      },
    },
  }
}

type CreateBundleOptions = {
  sourcemap: Exclude<esbuild.BuildOptions['sourcemap'], undefined>
  minify: Exclude<esbuild.BuildOptions['minify'], undefined>
  splitting: Exclude<esbuild.BuildOptions['splitting'], undefined>
  outdir: string
  define: Record<string, string>
}

type BundleOptions = {
  entryPoints: Exclude<esbuild.BuildOptions['entryPoints'], undefined>
  plugins?: esbuild.BuildOptions['plugins']
}

const bundleEntryPoints = async (
  o: CreateBundleOptions & BundleOptions,
) => {
  const { errors, warnings } = await esbuild.build({
    entryPoints: o.entryPoints,
    plugins: o.plugins,
    sourcemap: o.sourcemap,
    minify: o.minify,
    outdir: o.outdir,
    splitting: o.splitting,
    format: 'esm',
    bundle: true,
    platform: 'node',
    target: 'es2022',
    banner: {
      js: `import {createRequire as _vlt_createRequire} from 'node:module';
var require = _vlt_createRequire(import.meta.filename);`,
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env.TAP': 'false',
      ...o.define,
    },
  })

  assert(
    !errors.length && !warnings.length,
    new Error('esbuild error', { cause: { errors, warnings } }),
  )
}

const createBundler =
  (o: CreateBundleOptions) => (b: BundleOptions) =>
    bundleEntryPoints({
      ...o,
      ...b,
    })

export type Options = {
  outdir: string
  bins?: readonly Bin[]
  minify?: boolean
  splitting?: boolean
  sourcemap?: boolean
}

export const bundle = async ({
  outdir,
  bins,
  minify = false,
  splitting = true,
  sourcemap = true,
}: Options) => {
  mkdirSync(outdir, { recursive: true })

  const define = {
    GUI_ASSETS_DIR: 'gui-assets',
    CLI_PACKAGE_JSON: 'cli-package.json',
    REGISTRY_CLIENT_PACKAGE_JSON: 'registry-client-package.json',
    LIVE_RELOAD: false,
  }

  const esbuildBundle = createBundler({
    minify,
    sourcemap,
    splitting,
    outdir,
    define: Object.fromEntries(
      Object.entries(define).map(([k, v]) => [
        `process.env.__VLT_INTERNAL_${k}`,
        // wraps strings in double quotes since the values
        // are replaced inline in the built code
        JSON.stringify(v),
      ]),
    ),
  })

  // assume that cliDir is a member of the workspaces src dir
  const codeSplit = codeSplitPlugin()

  const entryBins = findEntryBins(BINS_DIR, bins)
  assert(entryBins.length, 'no bins found')

  await esbuildBundle({
    entryPoints: entryBins.map(file => ({
      in: file,
      out: basenameWithoutExtension(file),
    })),
    plugins: [codeSplit.plugin],
  })

  // bundle manually code split files determined from the
  // transform souce plugin. these are scripts that are exec'd
  // at runtime by the CLI
  const codeSplitPaths = codeSplit.paths()
  assert(codeSplitPaths.length, 'no code split paths found')
  for (const { source, out } of codeSplit.paths()) {
    await esbuildBundle({
      entryPoints: [{ in: source, out }],
    })
  }

  // copy package jsons that get read at runtime
  cpSync(
    join(SRC_WORKSPACES, 'registry-client/package.json'),
    join(outdir, define.REGISTRY_CLIENT_PACKAGE_JSON),
  )
  cpSync(
    join(SRC_WORKSPACES, 'vlt/package.json'),
    join(outdir, define.CLI_PACKAGE_JSON),
  )

  // copy built gui assets
  cpSync(
    join(SRC_WORKSPACES, 'gui/dist'),
    join(outdir, define.GUI_ASSETS_DIR),
    { recursive: true },
  )

  // yoga.wasm is loaded at runtime by `ink` so we need to copy
  // that file to the build directory
  cpSync(
    createRequire(
      createRequire(join(CLI, 'node_modules')).resolve('ink'),
    ).resolve('yoga-wasm-web/dist/yoga.wasm'),
    join(outdir, 'yoga.wasm'),
  )

  return { outdir }
}
