import {
  rmSync,
  mkdirSync,
  writeFileSync,
  cpSync,
  readFileSync,
} from 'node:fs'
import {
  join,
  relative,
  dirname,
  sep,
  basename,
  extname,
} from 'node:path'
import { readFile } from 'node:fs/promises'
import * as esbuild from 'esbuild'
import { builtinModules, createRequire } from 'node:module'
import assert from 'node:assert'
import { Bins, Paths } from './index.ts'
import type * as types from './types.ts'

const stripExtension = (p: string) =>
  join(dirname(p), basename(p, extname(p)))

const escapeRegExpPath = (r: string) =>
  new RegExp(
    join(r).replaceAll(sep, `\\${sep}`).replaceAll('.', '\\.'),
  )

const nodeImports: esbuild.Plugin = {
  name: 'node-imports',
  setup({ onResolve }) {
    onResolve({ filter: /()/, namespace: 'file' }, args => {
      if (
        builtinModules.includes(args.path) &&
        !args.path.startsWith('node:')
      ) {
        return {
          path: `node:${args.path}`,
          external: true,
        }
      }
    })
  },
}

const codeSplitPlugin = (): {
  paths: () => { source: string; out: string }[]
  plugin: esbuild.Plugin
} => {
  const codeSplitIdentifier =
    'export const __CODE_SPLIT_SCRIPT_NAME ='
  const found = new Set<{ source: string; out: string }>()

  const fn = async (o: esbuild.OnLoadArgs) => {
    const source = await readFile(o.path, 'utf8')
    if (source.includes(codeSplitIdentifier)) {
      const out = stripExtension(
        relative(Paths.SRC, o.path),
      ).replaceAll(sep, '-')
      found.add({ source: o.path, out })
      return {
        // keep this as a single line because it could affect source maps
        contents: `import {resolve} from 'node:path';${codeSplitIdentifier} resolve(import.meta.dirname, '${out}.js')`,
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
            filter: escapeRegExpPath(`^${Paths.SRC}`),
            namespace: 'file',
          },
          fn,
        )
      },
    },
  }
}

type CreateBundleOptions = {
  plugins: Exclude<esbuild.BuildOptions['plugins'], undefined>
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

const esbuildBuild = async (
  o: CreateBundleOptions & BundleOptions,
) => {
  const { errors, warnings, metafile } = await esbuild.build({
    entryPoints: o.entryPoints,
    plugins: o.plugins,
    sourcemap: o.sourcemap,
    minify: o.minify,
    outdir: o.outdir,
    splitting: o.splitting,
    format: 'esm',
    metafile: true,
    bundle: true,
    platform: 'node',
    target: JSON.parse(
      readFileSync(join(Paths.MONO_ROOT, 'tsconfig.json'), 'utf8'),
    ).compilerOptions.target,
    banner: {
      js: `var global = globalThis;
import {Buffer} from "node:buffer";
import {setImmediate, clearImmediate} from "node:timers";
import {createRequire as _vlt_createRequire} from 'node:module';
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

  return metafile
}

const createBundler = (o: CreateBundleOptions) => {
  const bundles: esbuild.Metafile[] = []
  return {
    bundle: async (b: BundleOptions) => {
      bundles.push(
        await esbuildBuild({
          ...o,
          ...b,
          plugins: [...o.plugins, ...(b.plugins ?? [])],
        }),
      )
    },
    getBundles: () => bundles,
  }
}

export default async ({
  outdir,
  minify,
  splitting,
  sourcemap,
}: types.BundleFactors & { outdir: string }): Promise<
  esbuild.Metafile & { outdir: string }
> => {
  rmSync(outdir, { recursive: true, force: true })
  mkdirSync(outdir, { recursive: true })

  const define = {
    GUI_ASSETS_DIR: 'gui-assets',
    CLI_PACKAGE_JSON: 'cli-package.json',
    REGISTRY_CLIENT_PACKAGE_JSON: 'registry-client-package.json',
    LIVE_RELOAD: false,
  }

  const { bundle, getBundles } = createBundler({
    minify,
    sourcemap,
    splitting,
    outdir,
    plugins: [nodeImports],
    define: Object.fromEntries(
      Object.entries(define).map(([k, v]) => [
        `process.env.__VLT_INTERNAL_${k}`,
        // wraps strings in double quotes since the values
        // are replaced inline in the built code
        JSON.stringify(v),
      ]),
    ),
  })

  const codeSplit = codeSplitPlugin()

  await bundle({
    entryPoints: Bins.map(bin => ({
      in: join(Paths.CLI, bin),
      out: basename(bin, extname(bin)),
    })),
    plugins: [nodeImports, codeSplit.plugin],
  })

  // bundle manually code split files determined from the
  // transform souce plugin. these are scripts that are exec'd
  // at runtime by the CLI
  for (const { source, out } of codeSplit.paths()) {
    await bundle({
      entryPoints: [{ in: source, out }],
    })
  }

  // copy package jsons that get read at runtime
  cpSync(
    join(Paths.MONO_ROOT, 'src/registry-client/package.json'),
    join(outdir, define.REGISTRY_CLIENT_PACKAGE_JSON),
  )
  cpSync(
    join(Paths.MONO_ROOT, 'src/vlt/package.json'),
    join(outdir, define.CLI_PACKAGE_JSON),
  )

  // copy built gui assets
  cpSync(
    join(Paths.MONO_ROOT, 'src/gui/dist'),
    join(outdir, define.GUI_ASSETS_DIR),
    { recursive: true },
  )

  // yoga.wasm is loaded at runtime by `ink` so we need to copy
  // that file to the build directory
  cpSync(
    createRequire(
      createRequire(join(Paths.CLI, 'node_modules')).resolve('ink'),
    ).resolve('yoga-wasm-web/dist/yoga.wasm'),
    join(outdir, 'yoga.wasm'),
  )

  const { inputs, outputs } = getBundles().reduce<esbuild.Metafile>(
    (a, m) => ({
      inputs: { ...a.inputs, ...m.inputs },
      outputs: { ...a.outputs, ...m.outputs },
    }),
    { inputs: {}, outputs: {} },
  )

  writeFileSync(
    join(outdir, 'package.json'),
    JSON.stringify({
      type: 'module',
    }),
  )

  return { inputs, outputs, outdir }
}
