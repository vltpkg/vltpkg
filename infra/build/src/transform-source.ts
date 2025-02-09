import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, dirname, sep, posix } from 'node:path'
import { readFile } from 'node:fs/promises'
import type * as esbuild from 'esbuild'
import j from 'jscodeshift'
import assert from 'node:assert'
import { Paths } from './index.ts'
import { randomBytes } from 'node:crypto'
import type * as types from './types.ts'
import { EOL } from 'node:os'

export const ident = (pre = '') =>
  [...pre.split(/[.:]/g), randomBytes(3).toString('hex')].join('_')

export const readJson = (p: string) =>
  JSON.parse(readFileSync(p, 'utf8'))

export const readPkg = (p: string) =>
  readJson(join(p, 'package.json'))

export const getSrcPath = (p: string) =>
  relative(Paths.SRC, p).replace(join('/dist/esm/'), sep)

const escapeRegExpPath = (r: string) =>
  new RegExp(
    join(r).replaceAll(sep, `\\${sep}`).replaceAll('.', '\\.'),
  )

export const IMPORT_META: Record<
  Capitalize<keyof ImportMeta>,
  `import.meta.${keyof ImportMeta}`
> = {
  Dirname: 'import.meta.dirname',
  Filename: 'import.meta.filename',
  Url: 'import.meta.url',
  Resolve: 'import.meta.resolve',
}

const READ_PACKAGE_JSON = {
  file: readFileSync(
    join(Paths.BUILD_ROOT, './src/bundle-package-json.js'),
  ),
  name: 'package-json-from-dist',
  exports: ['loadPackageJson', 'findPackageJson'],
}

const CODE_SPLIT_SCRIPT = {
  file: (path: string) =>
    readFileSync(
      join(Paths.BUILD_ROOT, './src/bundle-code-split.js'),
      'utf8',
    ).replaceAll('{{PATH}}', path),
  name: '__CODE_SPLIT_SCRIPT_NAME',
}

const EXTERNAL_COMMANDS = {
  comment: '/* LOAD COMMANDS ',
  replaceCommand: (
    line: string,
    {
      externalCommands,
    }: Pick<types.BundleFactors, 'externalCommands'>,
  ) => {
    const m =
      /^(?<ws>\s+)(?<ret>return \()(?<load>await import\()(?<path>.*?)(?<end>\)\);?)$/.exec(
        line,
      )?.groups
    assert(m, `load commands code does not match expected: ${line}`)
    const load = m.load
    const pathVar = ident('commandPath')
    const path = externalCommands ? pathVar : m.path
    const prefix =
      externalCommands ? `${m.ws}const ${pathVar} = ${m.path}\n` : ''
    return [prefix, m.ws, m.ret, load, path, m.end].join('')
  },
}

export const transformSourcePlugin = ({
  externalCommands,
}: Pick<types.BundleFactors, 'externalCommands'>): {
  paths: {
    codeSplit: () => string[]
    readPackageJson: () => string[]
    metaResolve: () => string[]
  }
  plugin: esbuild.Plugin
} => {
  const found = {
    codeSplit: new Set<string>(),
    readPackageJson: new Set<string>(),
    metaResolve: new Set<string>(),
  }

  return {
    paths: {
      codeSplit: () => [...found.codeSplit],
      readPackageJson: () => [...found.readPackageJson],
      metaResolve: () => [...found.metaResolve],
    },
    plugin: {
      name: 'transform-source-plugin',
      setup({ onLoad }) {
        onLoad(
          {
            filter: escapeRegExpPath(
              `/node_modules/${READ_PACKAGE_JSON.name}/dist/esm/index.js`,
            ),
            namespace: 'file',
          },
          () => ({ contents: READ_PACKAGE_JSON.file }),
        )
        onLoad(
          {
            filter: escapeRegExpPath(`^${Paths.SRC}`),
            namespace: 'file',
          },
          async o => {
            let source = await readFile(o.path, 'utf8')

            // All files that will be code split into external scripts
            // export __CODE_SPLIT_SCRIPT_NAME which we change to a path
            // to that external script instead
            if (
              source.includes(
                `export const ${CODE_SPLIT_SCRIPT.name}`,
              )
            ) {
              found.codeSplit.add(o.path)
              source = CODE_SPLIT_SCRIPT.file(
                getSrcPath(o.path).replaceAll(sep, posix.sep),
              )
            }

            // This package is used to read package json files from the correct
            // directory. When we bundle those package.json files will be in different
            // places so this plugin will rewrite the package and its function calls
            // to read from the correct places.
            if (source.includes(READ_PACKAGE_JSON.name)) {
              found.readPackageJson.add(o.path)
              const dir = dirname(getSrcPath(o.path)).replaceAll(
                sep,
                posix.sep,
              )
              source = READ_PACKAGE_JSON.exports
                .reduce(
                  (ast, name) =>
                    ast
                      .find(j.CallExpression, {
                        callee: { name },
                      })
                      .replaceWith(() =>
                        j.callExpression(j.identifier(name), [
                          j.identifier(
                            // Map the vlt package.json to the actual package.json used for publishing
                            // which will be at the root by resolving an empty string instead of the pkg name.
                            JSON.stringify(dir === 'vlt' ? '' : dir),
                          ),
                        ]),
                      ),
                  j(source),
                )
                .toSource()
            }

            // Calls to import.meta.resolve are rewritten to the workspace directory
            if (source.includes(IMPORT_META.Resolve)) {
              source = j(source)
                .find(j.CallExpression, {
                  callee: {
                    object: {
                      type: 'MetaProperty',
                      meta: { name: 'import' },
                      property: { name: 'meta' },
                    },
                    property: { name: 'resolve' },
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
                  found.metaResolve.add(
                    join(workspace.parentPath, workspace.name),
                  )
                  path.node.value = workspace.name
                })
                .toSource()
            }

            if (source.includes(EXTERNAL_COMMANDS.comment)) {
              let insideBlock = false
              source = source
                .split(EOL)
                .map(l => {
                  const start = new RegExp(
                    `${EXTERNAL_COMMANDS.comment}(START|STOP) `,
                  ).exec(l)
                  if (start?.[1]) {
                    insideBlock = start[1] === 'START'
                    return null
                  }
                  return insideBlock ?
                      EXTERNAL_COMMANDS.replaceCommand(l, {
                        externalCommands,
                      })
                    : l
                })
                .filter(l => l !== null)
                .join(EOL)
            }

            return { contents: source }
          },
        )
      },
    },
  }
}

export class Globals {
  #ids = new Map<string, string>()
  #items = new Map<string, string>()

  static quote = (v: string) => `"${v}"`

  static var = (name: string, value: string) =>
    `var ${name} = ${value}`

  static import = (name: string | string[], path: string) => {
    const mod = Globals.quote(`node:${path}`)
    const imports =
      Array.isArray(name) ? `{${name.join(', ')}}` : name
    return `import ${imports} from ${mod}`
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
