import {
  rmSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  cpSync,
} from 'node:fs'
import {
  join,
  relative,
  dirname,
  basename,
  extname,
  resolve,
} from 'node:path'
import * as esbuild from 'esbuild'
import { findPackageJson } from 'package-json-from-dist'
import { builtinModules, createRequire } from 'node:module'
import assert from 'node:assert'
import { Bins, Paths, EXT } from './index.ts'
import type * as types from './types.ts'
import {
  transformSourcePlugin,
  Globals,
  IMPORT_META,
  ident,
  readJson,
  readPkg,
  getSrcPath,
} from './transform-source.ts'

const bundle = async (o: {
  plugins: esbuild.BuildOptions['plugins']
  sourcemap: esbuild.BuildOptions['sourcemap']
  minify: esbuild.BuildOptions['minify']
  outdir: string
  in: string
  out: string
}) => {
  const globals = new Globals(
    // These are globals that are needed to run in all runtimes
    Globals.var('global', 'globalThis'),
    Globals.import('process', 'process'),
    Globals.import(['Buffer'], 'buffer'),
    Globals.import(['setImmediate', 'clearImmediate'], 'timers'),
    // These are to shim import.meta properties
    {
      [IMPORT_META.Dirname]: (id, { fn }) =>
        Globals.var(
          id,
          fn('path.resolve', [
            IMPORT_META.Dirname,
            Globals.quote(
              relative(resolve(o.outdir, dirname(o.out)), o.outdir),
            ),
          ]),
        ),
      [IMPORT_META.Filename]: (id, { fn, get }) =>
        Globals.var(
          id,
          fn('path.resolve', [
            get(IMPORT_META.Dirname),
            Globals.quote(basename(o.out) + EXT),
          ]),
        ),
      [IMPORT_META.Url]: (id, { fn, get }) =>
        Globals.var(
          id,
          `${fn('url.pathToFileURL', [get(IMPORT_META.Filename)])}.toString()`,
        ),
      [IMPORT_META.Resolve]: (id, { fn, get }) => {
        const arg = ident()
        return Globals.var(
          id,
          `(${arg}) => ${fn('url.pathToFileURL', [
            fn('path.resolve', [get(IMPORT_META.Dirname), arg]),
          ])}`,
        )
      },
    },
    ({ fn, get }) =>
      Globals.var(
        'require',
        fn('module.createRequire', [get(IMPORT_META.Filename)]),
      ),
  )

  const { errors, warnings, metafile } = await esbuild.build({
    entryPoints: [{ in: o.in, out: o.out }],
    plugins: o.plugins,
    sourcemap: o.sourcemap,
    minify: o.minify,
    outdir: o.outdir,
    format: 'esm',
    metafile: true,
    bundle: true,
    platform: 'node',
    target: readJson(join(Paths.MONO_ROOT, 'tsconfig.json'))
      .compilerOptions.target,
    // Define global variables that are required for our deps and testing
    // runtime support
    banner: {
      [EXT.slice(1)]: globals.toString(),
    },
    define: {
      'process.env.NODE_ENV': '"production"',
      'process.env._VLT_DEV_LIVE_RELOAD': 'false',
      // The import.meta shims are then globally replaced with our newly defined values
      ...Object.values(IMPORT_META).reduce(
        (acc, k) => {
          acc[k] = globals.get(k)
          return acc
        },
        {} as Record<`import.meta.${keyof ImportMeta}`, string>,
      ),
    },
  })

  assert(
    !errors.length && !warnings.length,
    new Error('esbuild error', { cause: { errors, warnings } }),
  )

  return metafile
}

const createWorkspace = (base: string, source: string) => {
  const pkg = readPkg(source)
  const dest = join(base, basename(source))
  mkdirSync(dest, { recursive: true })
  return { pkg, dest }
}

export default async ({
  outdir,
  minify,
  externalCommands,
  sourcemap,
}: types.BundleFactors & { outdir: string }): Promise<
  esbuild.Metafile & { outdir: string }
> => {
  rmSync(outdir, { recursive: true, force: true })
  mkdirSync(outdir, { recursive: true })

  const transformSource = transformSourcePlugin({
    externalCommands,
  })

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

  const files: esbuild.Metafile[] = []
  const bundleFiles = async (
    bundles: {
      in: string
      out: string
    }[],
  ) => {
    for (const b of bundles) {
      files.push(
        await bundle({
          ...b,
          plugins: [transformSource.plugin, nodeImports],
          sourcemap,
          minify,
          outdir,
        }),
      )
    }
  }

  await bundleFiles(
    Bins.map(bin => ({
      in: join(Paths.CLI, bin),
      out: basename(bin, extname(bin)),
    })),
  )

  if (externalCommands) {
    await bundleFiles(
      readdirSync(Paths.COMMANDS, {
        withFileTypes: true,
      })
        .filter(p => p.isFile() && extname(p.name) === '.js')
        .map(c => ({
          in: join(c.parentPath, c.name),
          out: `commands/${basename(c.name, extname(c.name))}`,
        })),
    )
  }

  await bundleFiles(
    transformSource.paths.codeSplit().map(p => ({
      in: p,
      out: getSrcPath(p).replaceAll(EXT, ''),
    })),
  )

  for (const file of transformSource.paths.readPackageJson()) {
    const { pkg, dest } = createWorkspace(
      outdir,
      dirname(findPackageJson(file)),
    )
    writeFileSync(
      join(dest, 'package.json'),
      JSON.stringify(
        {
          name: pkg.name,
          version: pkg.version,
        },
        null,
        2,
      ),
    )
  }

  for (const dir of transformSource.paths.metaResolve()) {
    const { pkg, dest } = createWorkspace(outdir, dir)
    const main = pkg.exports['.']
    assert(typeof main === 'string')
    cpSync(join(dir, main), join(dest), {
      recursive: true,
    })
  }

  // yoga.wasm is loaded at runtime by `ink` so we need to copy
  // that file to the build directory
  cpSync(
    createRequire(
      createRequire(join(Paths.CLI, 'node_modules')).resolve('ink'),
    ).resolve('yoga-wasm-web/dist/yoga.wasm'),
    join(outdir, 'yoga.wasm'),
  )

  const { inputs, outputs } = files.reduce<esbuild.Metafile>(
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
