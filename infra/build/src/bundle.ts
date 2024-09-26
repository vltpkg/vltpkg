import {
  rmSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
} from 'node:fs'
import {
  join,
  relative,
  dirname,
  basename,
  sep,
  posix,
  extname,
} from 'node:path'
import { readFile } from 'node:fs/promises'
import * as esbuild from 'esbuild'
import j from 'jscodeshift'
import { findPackageJson } from 'package-json-from-dist'
import { builtinModules } from 'node:module'
import assert from 'node:assert'
import { Paths } from './index.js'
import { randomBytes } from 'node:crypto'
import * as types from './types.js'

const randIdent = () => `_${randomBytes(6).toString('hex')}`

type OnLoadPlugin = {
  paths: () => string[]
  plugin: esbuild.Plugin
}

const getSrcPath = (p: string) =>
  relative(Paths.SRC, p).replace(join('/dist/esm/'), sep)

const filePluginFilter = (r: string) => ({
  filter: new RegExp(
    join(r).replaceAll(sep, `\\${sep}`).replaceAll('.', '\\.'),
  ),
  namespace: 'file',
})

const createOnLoad = (
  includes: (source: string) => boolean,
  fn: (path: string, source: string) => string,
): {
  paths: () => string[]
  plugin: (
    o: esbuild.OnLoadArgs,
  ) => Promise<esbuild.OnLoadResult | undefined>
} => {
  const found: string[] = []
  return {
    paths: () => found,
    plugin: async o => {
      const source = await readFile(o.path, 'utf8')
      if (includes(source)) {
        found.push(o.path)
        return { contents: fn(o.path, source) }
      }
    },
  }
}

// All files that will be code split into external scripts
// export __CODE_SPLIT_SCRIPT_NAME which we change to a path
// to that external script instead
const CODE_SPLIT_SCRIPT = {
  file: (path: string) =>
    readFileSync(
      join(Paths.BUILD_ROOT, './src/bundle-code-split.js'),
      'utf8',
    ).replaceAll('{{PATH}}', path),
  name: '__CODE_SPLIT_SCRIPT_NAME',
}
const codeSplitPlugin = (
  filter: string,
  transform: (path: string) => string,
): OnLoadPlugin => {
  const { paths, plugin } = createOnLoad(
    s => s.includes(`export const ${CODE_SPLIT_SCRIPT.name}`),
    p =>
      CODE_SPLIT_SCRIPT.file(transform(p).replaceAll(sep, posix.sep)),
  )
  return {
    paths,
    plugin: {
      name: 'code-split-plugin',
      setup({ onLoad }) {
        onLoad(filePluginFilter(filter), plugin)
      },
    },
  }
}

// This package is used to read package json files from the correct
// directory. When we bundle those package.json files will be in different
// places so this plugin will rewrite the package and its function calls
// to read from the correct places.
const READ_PACKAGE_JSON = {
  file: readFileSync(
    join(Paths.BUILD_ROOT, './src/bundle-package-json.js'),
  ),
  name: 'package-json-from-dist',
  exports: ['loadPackageJson', 'findPackageJson'],
}
const readPackageJsonPlugin = (
  filter: string,
  transform: (path: string) => string,
): OnLoadPlugin => {
  const { paths, plugin } = createOnLoad(
    s => s.includes(READ_PACKAGE_JSON.name),
    (p, s) =>
      READ_PACKAGE_JSON.exports
        .reduce(
          (ast, name) =>
            ast
              .find(j.CallExpression, { callee: { name } })
              .replaceWith(() =>
                j.callExpression(j.identifier(name), [
                  j.identifier(
                    JSON.stringify(
                      transform(p).replaceAll(sep, posix.sep),
                    ),
                  ),
                ]),
              ),
          j(s),
        )
        .toSource(),
  )
  return {
    paths,
    plugin: {
      name: 'read-package-json',
      setup({ onLoad }) {
        onLoad(filePluginFilter(filter), plugin)
        onLoad(
          filePluginFilter(
            `/node_modules/${READ_PACKAGE_JSON.name}/dist/esm/index.js`,
          ),
          () => ({ contents: READ_PACKAGE_JSON.file }),
        )
      },
    },
  }
}

const loadCommandsPlugin = (
  filter: string,
  o: Pick<types.BundleOptions, 'externalCommands' | 'format'>,
): OnLoadPlugin => {
  const isCjs = o.format === types.Formats.Cjs
  const isExt = o.externalCommands
  const replaceCommand = (line: string) => {
    const m =
      /^(?<ws>\s+)(?<ret>return )(?<load>await import\()(?<path>.*?)(?<end>\);?)$/.exec(
        line,
      )?.groups
    assert(m, `load commands code does not match expected`)
    const load = isCjs ? 'require(' : m.load
    const id = randIdent()
    const path = isExt ? id : m.path
    const prefix = isExt ? `${m.ws}const ${id} = ${m.path}\n` : ''
    return [prefix, m.ws, m.ret, load, path, m.end].join('')
  }
  const COMMENT = '/* LOAD COMMANDS '
  const { paths, plugin } = createOnLoad(
    s => s.includes(COMMENT),
    (_, s) => {
      let insideBlock = false
      return s
        .split('\n')
        .map(l => {
          const start = new RegExp(`${COMMENT}(START|STOP) `).exec(l)
          if (start?.[1]) {
            insideBlock = start[1] === 'START'
            return null
          }
          return insideBlock ? replaceCommand(l) : l
        })
        .filter(l => l !== null)
        .join('\n')
    },
  )
  return {
    paths,
    plugin: {
      name: 'load-commands-plugin',
      setup({ onLoad }) {
        onLoad(filePluginFilter(filter), plugin)
      },
    },
  }
}

const nodeImportsPlugin = (): esbuild.Plugin => ({
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
      return undefined
    })
  },
})

const buildFile = async (
  o: Pick<
    esbuild.BuildOptions,
    'entryPoints' | 'plugins' | 'sourcemap' | 'minify' | 'outdir'
  > & { format: types.Format },
) => {
  const rand = randIdent()
  const createGlobal = (id: string, path: string) => {
    if (o.format === types.Formats.Cjs) {
      return `const ${id} = require('${path}')`
    }
    return `import ${id} from '${path}'`
  }
  const { errors, warnings, metafile } = await esbuild.build({
    entryPoints: o.entryPoints,
    plugins: o.plugins,
    sourcemap: o.sourcemap,
    minify: o.minify,
    outdir: o.outdir,
    format: o.format,
    metafile: true,
    bundle: true,
    platform: 'node',
    target: 'es2022',
    ...(o.format === types.Formats.Cjs ?
      {
        inject: [
          join(Paths.BUILD_ROOT, './src/bundle-import-meta.js'),
        ],
      }
    : {}),
    // Define global variables that are required for our deps and testing
    // runtime support
    banner: {
      js: [
        createGlobal('process', 'node:process'),
        createGlobal('{Buffer}', 'node:buffer'),
        createGlobal(`{setImmediate,clearImmediate}`, 'node:timers'),
        ...(o.format === types.Formats.Esm ?
          [
            createGlobal(
              `{createRequire as createRequire${rand}}`,
              'node:module',
            ),
            `const require = createRequire${rand}(import.meta.filename)`,
          ]
        : []),
        'const global = globalThis',
      ].join('\n'),
    },
  })

  assert(
    !errors.length && !warnings.length,
    new Error('esbuild error', { cause: { errors, warnings } }),
  )

  return metafile
}

export const getBundleOptions = (o: types.BundleFactors) => {
  if (o.runtime === types.Runtimes.Bun) {
    // HACK: this is a hack to get bun to compile to benchmark
    // cold start CLI performance but we can't actually use it until
    // fs.opendirSync is implemented in bun (or removed from our code)
    // https://github.com/oven-sh/bun/issues/6546
    return {
      transform: (s: string) =>
        s.replaceAll(
          /import\s*{\s*opendirSync\s*(as \w+)?,/g,
          'import {',
        ),
    }
  }
  return true
}

export default async ({
  outdir,
  minify,
  format,
  runtime,
  externalCommands,
  sourcemap,
}: types.BundleOptions): Promise<
  esbuild.Metafile & { outdir: string }
> => {
  rmSync(outdir, { recursive: true, force: true })
  mkdirSync(outdir, { recursive: true })

  const buildFileWithOptions = (
    o: Pick<esbuild.BuildOptions, 'entryPoints' | 'plugins'>,
  ) =>
    buildFile({
      entryPoints: o.entryPoints,
      plugins: o.plugins,
      sourcemap,
      format,
      minify,
      outdir,
    })

  const codeSplit = codeSplitPlugin(`^${Paths.SRC}`, p =>
    getSrcPath(p),
  )
  const readPackageJson = readPackageJsonPlugin(`^${Paths.SRC}`, p =>
    dirname(getSrcPath(p)),
  )
  const loadCommands = loadCommandsPlugin(`^${Paths.CLI}`, {
    externalCommands,
    format,
  })
  const nodeImports = nodeImportsPlugin()

  const commands = readdirSync(join(Paths.CLI, 'dist/esm/commands'), {
    withFileTypes: true,
  }).filter(p => p.isFile() && extname(p.name) === '.js')

  const buildBins = await buildFileWithOptions({
    entryPoints: Paths.BINS.map(bin => ({
      in: join(Paths.CLI, bin),
      out: basename(bin, '.js'),
    })),
    plugins: [
      codeSplit.plugin,
      readPackageJson.plugin,
      loadCommands.plugin,
      nodeImports,
    ],
  })

  const buildCommands =
    externalCommands ?
      await buildFileWithOptions({
        entryPoints: commands.map(c => ({
          in: join(c.parentPath, c.name),
          out: `commands/${basename(c.name, '.js')}`,
        })),
        plugins: [
          codeSplit.plugin,
          readPackageJson.plugin,
          nodeImports,
        ],
      })
    : null

  const chunks = codeSplit.paths()
  assert(chunks.length, `no external entry points were found`)

  const buildExternals = await Promise.all(
    chunks.map(p =>
      buildFileWithOptions({
        entryPoints: [
          {
            in: p,
            out: getSrcPath(p).replace(/\.js$/, ''),
          },
        ],
        plugins: [readPackageJson.plugin, nodeImports],
      }),
    ),
  )

  const packageJsons = readPackageJson.paths()
  assert(packageJsons.length, `no package.json references were found`)

  for (const file of packageJsons) {
    const pkgFile = findPackageJson(file)
    const to = join(
      outdir,
      basename(dirname(pkgFile)),
      'package.json',
    )
    mkdirSync(dirname(to), { recursive: true })
    const pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
    writeFileSync(
      to,
      JSON.stringify({ name: pkg.name, version: pkg.version }),
    )
  }

  const res = [buildBins, buildCommands, ...buildExternals]
    .filter(v => v !== null)
    .reduce<esbuild.Metafile>(
      (a, m) => ({
        inputs: { ...a.inputs, ...m.inputs },
        outputs: { ...a.outputs, ...m.outputs },
      }),
      { inputs: {}, outputs: {} },
    )

  const runtimeOpts = getBundleOptions({
    format,
    runtime,
    externalCommands,
    minify,
    sourcemap,
  })

  for (const f of Object.keys(res.outputs).filter(
    b => extname(b) === '.js',
  )) {
    const contents = readFileSync(f, 'utf8')
    writeFileSync(
      f,
      runtimeOpts === true ? contents : (
        runtimeOpts.transform(contents)
      ),
    )
    writeFileSync(
      join(outdir, 'package.json'),
      JSON.stringify({
        type: format === types.Formats.Cjs ? 'commonjs' : 'module',
      }),
    )
  }

  return { ...res, outdir }
}
