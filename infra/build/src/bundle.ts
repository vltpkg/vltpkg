import {
  rmSync,
  readFileSync,
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

export const IMPORT_META: Record<
  Capitalize<keyof ImportMeta>,
  `import.meta.${keyof ImportMeta}`
> = {
  Dirname: 'import.meta.dirname',
  Filename: 'import.meta.filename',
  Url: 'import.meta.url',
  Resolve: 'import.meta.resolve',
}

const ident = (pre = '') =>
  [...pre.split(/[.:]/g), randomBytes(3).toString('hex')].join('_')

export type OnLoadPlugin = {
  paths: () => string[]
  plugin: esbuild.Plugin
}

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'))

const readPkg = (p: string) => readJson(join(p, 'package.json'))

const getSrcPath = (p: string) =>
  relative(Paths.SRC, p).replace(join('/dist/esm/'), sep)

const filePluginFilter = (r: string) => ({
  filter: new RegExp(
    join(r).replaceAll(sep, `\\${sep}`).replaceAll('.', '\\.'),
  ),
  namespace: 'file',
})

const createOnLoad = (
  includes: (source: string, path: string) => boolean,
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
      if (includes(source, o.path)) {
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

const metaResolvePlugin = (filter: string): OnLoadPlugin => {
  const parts = IMPORT_META.Resolve.split('.')
  const found = new Set<string>()
  const { plugin } = createOnLoad(
    s => s.includes(IMPORT_META.Resolve),
    (_, s) =>
      j(s)
        .find(j.CallExpression, {
          callee: {
            object: {
              type: 'MetaProperty',
              meta: { name: parts[0] },
              property: { name: parts[1] },
            },
            property: { name: parts[2] },
          },
        })
        .find(j.Literal)
        .forEach(path => {
          const { value } = path.node
          assert(
            typeof value === 'string',
            `${IMPORT_META.Resolve} must be a string`,
          )
          const workspace = readdirSync(Paths.SRC, {
            withFileTypes: true,
          })
            .filter(d => d.isDirectory())
            .find(d =>
              value.startsWith(
                readPkg(join(d.parentPath, d.name)).name,
              ),
            )
          assert(
            workspace,
            `${IMPORT_META.Resolve} can only be used with a workspace in src/`,
          )
          found.add(join(workspace.parentPath, workspace.name))
          path.node.value = workspace.name
        })
        .toSource(),
  )
  return {
    paths: () => [...found],
    plugin: {
      name: 'meta-resolve',
      setup({ onLoad }) {
        onLoad(filePluginFilter(filter), plugin)
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
      /^(?<ws>\s+)(?<ret>return \()(?<load>await import\()(?<path>.*?)(?<end>\)\);?)$/.exec(
        line,
      )?.groups
    assert(m, `load commands code does not match expected: ${line}`)
    const load = isCjs ? 'require(' : m.load
    const pathVar = ident('commandPath')
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

const rewriteBinPlugin = (
  o: Pick<types.BundleFactors, 'format'>,
): esbuild.Plugin => {
  const isCjs = o.format === types.Formats.Cjs
  const { plugin } = createOnLoad(
    s => s.includes('await import('),
    (_, s) =>
      isCjs ? s.replaceAll('await import(', 'void import(') : s,
  )
  return {
    name: 'rewrite-bin-plugin',
    setup({ onLoad }) {
      onLoad(filePluginFilter(`^${Bins.DIR}`), plugin)
    },
  }
}

const bundle = async (o: {
  plugins: esbuild.BuildOptions['plugins']
  sourcemap: esbuild.BuildOptions['sourcemap']
  minify: esbuild.BuildOptions['minify']
  outdir: string
  format: types.Format
  in: string
  out: string
}) => {
  const cjs = o.format === types.Formats.Cjs

  class Globals {
    #ids = new Map<string, string>()
    #items = new Map<string, string>()

    static quote = (v: string) => `"${v}"`

    static var = (name: string, value: string) =>
      `var ${name} = ${value}`

    static import = (name: string | string[], path: string) => {
      const mod = Globals.quote(`node:${path}`)
      const imports =
        Array.isArray(name) ? `{${name.join(', ')}}` : name
      return cjs ?
          Globals.var(imports, `require(${mod})`)
        : `import ${imports} from ${mod}`
    }

    toString() {
      return [...this.#items.values()].join('\n')
    }

    constructor(
      ...args: (
        | false
        | string
        | ((b: Globals) => string)
        | Record<string, (id: string, b: Globals) => string>
      )[]
    ) {
      for (const [k, v] of args.flatMap(arg => {
        if (typeof arg === 'object') {
          return Object.entries(arg).map(([k, v]) => {
            const id = this.#id(k)
            return [id, v(id, this)] as const
          })
        }
        const value =
          typeof arg === 'string' ? arg
          : typeof arg === 'function' ? arg(this)
          : null
        return value ? [[value, value] as const] : []
      })) {
        this.#items.set(k, v)
      }
    }

    #id(key: string) {
      const cached = this.#ids.get(key)
      if (cached) {
        return cached
      }
      const id = ident(`bundle.${key}`)
      this.#ids.set(key, id)
      return id
    }

    get = (key: string) => {
      const value = this.#ids.get(key)
      assert(value)
      return value
    }

    fn = (fn: string, args: string[]) => {
      const id = this.#id(fn)
      const [mod, name] = fn.split('.')
      assert(name && mod)
      this.#items.set(id, Globals.import([`${name} as ${id}`], mod))
      return `${id}(${args.join(', ')})`
    }
  }

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
            cjs ? '__dirname' : IMPORT_META.Dirname,
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
    !cjs &&
      (({ fn, get }) =>
        Globals.var(
          'require',
          fn('module.createRequire', [get(IMPORT_META.Filename)]),
        )),
  )

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
    target: readJson(join(Paths.MONO_ROOT, 'tsconfig.json'))
      .compilerOptions.target,
    // Define global variables that are required for our deps and testing
    // runtime support
    banner: {
      [EXT.slice(1)]: globals.toString(),
    },
    // The import.meta shims are then globally replaced with our newly defined values
    define: Object.values(IMPORT_META).reduce(
      (acc, k) => {
        acc[k] = globals.get(k)
        return acc
      },
      // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter
      {} as Record<`import.meta.${keyof ImportMeta}`, string>,
    ),
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

  const codeSplit = codeSplitPlugin(`^${Paths.SRC}`, p =>
    getSrcPath(p),
  )
  const readPackageJson = readPackageJsonPlugin(
    `^${Paths.SRC}`,
    p => {
      // Map the vlt package.json to the actual package.json used for publishing
      // which will be at the root by resolving an empty string instead of the pkg name.
      const pkg = dirname(getSrcPath(p))
      return pkg === 'vlt' ? '' : pkg
    },
  )
  const metaResolve = metaResolvePlugin(`^${Paths.SRC}`)
  const loadCommands = loadCommandsPlugin(`^${Paths.CLI}`, {
    externalCommands,
    format,
  })
  const nodeImports = nodeImportsPlugin()

  const files: esbuild.Metafile[] = []
  const bundleFiles = async (
    bundles: {
      in: string
      out: string
      plugins?: esbuild.BuildOptions['plugins']
    }[],
  ) => {
    for (const b of bundles) {
      files.push(
        await bundle({
          ...b,
          plugins: [
            readPackageJson.plugin,
            metaResolve.plugin,
            nodeImports,
            ...(b.plugins ?? []),
          ],
          sourcemap,
          format,
          minify,
          outdir,
        }),
      )
    }
  }

  await bundleFiles(
    Bins.PATHS.map(bin => ({
      in: join(Paths.CLI, bin),
      out: basename(bin, extname(bin)),
      plugins: [
        rewriteBinPlugin({ format }),
        codeSplit.plugin,
        loadCommands,
      ],
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
          plugins: [codeSplit.plugin],
        })),
    )
  }

  await bundleFiles(
    codeSplit.paths().map(p => ({
      in: p,
      out: getSrcPath(p).replaceAll(EXT, ''),
    })),
  )

  const createWorkspace = (base: string, source: string) => {
    const pkg = readPkg(source)
    const dest = join(base, basename(source))
    mkdirSync(dest, { recursive: true })
    return { pkg, dest }
  }

  for (const file of readPackageJson.paths()) {
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

  for (const dir of metaResolve.paths()) {
    const { pkg, dest } = createWorkspace(outdir, dir)
    const main = pkg.exports['.']
    assert(typeof main === 'string')
    cpSync(join(dir, main), join(dest), {
      recursive: true,
    })
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
