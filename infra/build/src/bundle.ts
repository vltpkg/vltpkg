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
  resolve,
} from 'node:path'
import { readFile } from 'node:fs/promises'
import * as esbuild from 'esbuild'
import j from 'jscodeshift'
import { findPackageJson } from 'package-json-from-dist'
import { builtinModules } from 'node:module'
import assert from 'node:assert'
import { Bins, Paths } from './index.js'
import { randomBytes } from 'node:crypto'
import * as types from './types.js'

const EXT = '.js'

const randIdent = () => `_${randomBytes(6).toString('hex')}`

export type OnLoadPlugin = {
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
  paths: OnLoadPlugin['paths']
  plugin: (
    o: esbuild.OnLoadArgs,
  ) => Promise<esbuild.OnLoadResult | undefined>
} => {
  const found = new Set<string>()
  return {
    paths: () => [...found],
    plugin: async o => {
      const source = await readFile(o.path, 'utf8')
      if (includes(source)) {
        found.add(o.path)
        return { contents: fn(o.path, source) }
      }
    },
  }
}

// All files that will be code split into external scripts
// export __CODE_SPLIT_SCRIPT_NAME which we change to a path
// to that external script instead
const codeSplitPlugin = (
  filter: string,
  transform: (path: string) => string,
): OnLoadPlugin => {
  const CODE_SPLIT_SCRIPT = {
    file: (path: string) =>
      readFileSync(
        join(Paths.BUILD_ROOT, './src/bundle-code-split.js'),
        'utf8',
      ).replaceAll('{{PATH}}', path),
    name: '__CODE_SPLIT_SCRIPT_NAME',
  }
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

const readPackageJsonPlugin = (
  filter: string,
  transform: (path: string) => string,
): OnLoadPlugin => {
  const READ_PACKAGE_JSON = {
    file: readFileSync(
      join(Paths.BUILD_ROOT, './src/bundle-package-json.js'),
    ),
    name: 'package-json-from-dist',
    exports: ['loadPackageJson', 'findPackageJson'],
  }
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
  o: Pick<types.BundleFactors, 'externalCommands' | 'format'>,
): esbuild.Plugin => {
  const COMMENT = '/* LOAD COMMANDS '
  const isCjs = o.format === types.Formats.Cjs
  const isExt = o.externalCommands
  const replaceCommand = (line: string) => {
    const m =
      /^(?<ws>\s+)(?<ret>return )(?<load>await import\()(?<path>.*?)(?<end>\);?)$/.exec(
        line,
      )?.groups
    assert(m, `load commands code does not match expected`)
    const load = isCjs ? 'require(' : m.load
    const pathVar = `__commandPath${randIdent()}`
    const path = isExt ? pathVar : m.path
    const prefix =
      isExt ? `${m.ws}const ${pathVar} = ${m.path}\n` : ''
    return [prefix, m.ws, m.ret, load, path, m.end].join('')
  }
  const { plugin } = createOnLoad(
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
    name: 'load-commands-plugin',
    setup({ onLoad }) {
      onLoad(filePluginFilter(filter), plugin)
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
    })
  },
})

const bundle = async (o: {
  plugins: esbuild.BuildOptions['plugins']
  sourcemap: esbuild.BuildOptions['sourcemap']
  minify: esbuild.BuildOptions['minify']
  outdir: string
  format: types.Format
  in: string
  out: string
}) => {
  const id = (() => {
    const i = randIdent()
    return (p: string) => `${p}${i}`
  })()
  const cjs = o.format === types.Formats.Cjs
  const define = {
    url: id('__bundleUrl'),
    dirname: id('__bundleDirname'),
    filename: id('__bundleFilename'),
  }

  const createImport = (
    name: string | string[],
    path: string,
    map: (n: string) => string = (n: string) => n,
  ) => {
    const names =
      Array.isArray(name) ?
        `{${name.map(map).join(', ')}}`
      : map(name)
    const parts =
      cjs ? ['var', '= require(', ')'] : ['import', 'from', '']
    return `${parts[0]} ${names} ${parts[1]}${JSON.stringify(path)}${parts[2]}`
  }

  const createUniqImport = (name: string | string[], path: string) =>
    createImport(
      name,
      path,
      n => `${n} ${cjs ? ':' : ' as'} ${id(n)}`,
    )

  const createGlobal = (
    name: string,
    value: string | [string, string],
    args?: string[],
  ) => {
    const [pre, post] = Array.isArray(value) ? value : [value, '']
    return `var ${name} = ${pre}${args ? `(${args.join(', ')})` : ''}${post}`
  }

  const createUniqGlobal = (
    name: string,
    value: string | [string, string],
    args?: string[],
  ) => {
    const [pre, post] = Array.isArray(value) ? value : [value, '']
    return createGlobal(name, [id(pre), post], args)
  }

  const { errors, warnings, metafile } = await esbuild.build({
    entryPoints: [{ in: o.in, out: o.out }],
    plugins: o.plugins,
    sourcemap: o.sourcemap,
    minify: o.minify,
    outdir: o.outdir,
    format: o.format,
    metafile: true,
    bundle: true,
    platform: 'node',
    target: JSON.parse(
      readFileSync(join(Paths.MONO_ROOT, 'tsconfig.json'), 'utf8'),
    ).compilerOptions.target,
    // Define global variables that are required for our deps and testing
    // runtime support
    banner: {
      [EXT.slice(1)]: [
        createImport('process', 'node:process'),
        createImport(['Buffer'], 'node:buffer'),
        createImport(
          ['setImmediate', 'clearImmediate'],
          'node:timers',
        ),
        createUniqImport(['resolve'], 'node:path'),
        createUniqImport(['pathToFileURL'], 'node:url'),
        createUniqImport(['createRequire'], 'node:module'),
        createGlobal('global', 'globalThis'),
        createUniqGlobal(define.dirname, 'resolve', [
          cjs ? '__dirname' : 'import.meta.dirname',
          JSON.stringify(
            relative(resolve(o.outdir, dirname(o.out)), o.outdir),
          ),
        ]),
        createUniqGlobal(define.filename, 'resolve', [
          define.dirname,
          JSON.stringify(`${basename(o.out)}${EXT}`),
        ]),
        createUniqGlobal(
          define.url,
          ['pathToFileURL', '.toString()'],
          [define.filename],
        ),
        !cjs ?
          createUniqGlobal('require', 'createRequire', [
            define.filename,
          ])
        : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
    define: Object.entries(define).reduce((acc, [k, v]) => {
      ;(acc as any)[`import.meta.${k}`] = v
      return acc
    }, {}),
  })

  assert(
    !errors.length && !warnings.length,
    new Error('esbuild error', { cause: { errors, warnings } }),
  )

  return metafile
}

export default async ({
  outdir,
  minify,
  format,
  externalCommands,
  sourcemap,
}: types.BundleFactors & { outdir: string }): Promise<
  esbuild.Metafile & { outdir: string }
> => {
  rmSync(outdir, { recursive: true, force: true })
  mkdirSync(outdir, { recursive: true })

  const files: esbuild.Metafile[] = []
  const bundleFiles = async (
    bundles: {
      in: string
      out: string
      plugins: esbuild.BuildOptions['plugins']
    }[],
  ) => {
    for (const b of bundles) {
      files.push(
        await bundle({
          ...b,
          sourcemap,
          format,
          minify,
          outdir,
        }),
      )
    }
  }

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

  await bundleFiles(
    Bins.PATHS.map(bin => ({
      in: join(Paths.CLI, bin),
      out: basename(bin, extname(bin)),
      plugins: [
        codeSplit.plugin,
        readPackageJson.plugin,
        loadCommands,
        nodeImports,
      ],
    })),
  )

  if (externalCommands) {
    await bundleFiles(
      readdirSync(join(Paths.CLI, 'dist/esm/commands'), {
        withFileTypes: true,
      })
        .filter(p => p.isFile() && extname(p.name) === '.js')
        .map(c => ({
          in: join(c.parentPath, c.name),
          out: `commands/${basename(c.name, extname(c.name))}`,
          plugins: [
            codeSplit.plugin,
            readPackageJson.plugin,
            nodeImports,
          ],
        })),
    )
  }

  await bundleFiles(
    codeSplit.paths().map(p => ({
      in: p,
      out: getSrcPath(p).replaceAll(EXT, ''),
      plugins: [readPackageJson.plugin, nodeImports],
    })),
  )

  for (const file of readPackageJson.paths()) {
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
      type: format === types.Formats.Cjs ? 'commonjs' : 'module',
    }),
  )

  return { inputs, outputs, outdir }
}
