import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { parse as yamlParse } from 'yaml'
import { format as prettierFormat } from 'prettier'

const ROOT = resolve(import.meta.dirname, '..')

const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

const writeJson = async (p, data, { prettier } = {}) =>
  writeFileSync(
    p,
    prettier ?
      await prettierFormat(JSON.stringify(data), { filepath: p })
    : JSON.stringify(data, null, 2) + '\n',
  )

const mergeJson = async (p, fn, opts) =>
  writeJson(p, fn(readJson(p)), opts)

const sortObject = (o, ...args) => {
  const byLocale = (a, b) => a.localeCompare(b, 'en')

  const createByKey = keys => {
    const keyMap = new Map(keys.map((k, i) => [k, i]))
    return (a, b) => {
      const ai = keyMap.get(a)
      const bi = keyMap.get(b)
      return (
        ai !== undefined && bi !== undefined ? ai - bi
        : ai !== undefined ? -1
        : bi !== undefined ? 1
        : undefined
      )
    }
  }

  const byKey =
    Array.isArray(args[0]) ? createByKey(args[0])
    : Array.isArray(args[1]) ? createByKey(args[1])
    : null

  const byCustom = typeof args[0] === 'function' ? args[0] : null

  return Object.fromEntries(
    Object.entries(o).sort(([a], [b]) => {
      if (byCustom) {
        const custom = byCustom(a, b)
        if (Array.isArray(custom)) {
          a = custom[0]
          b = custom[1]
        } else if (typeof custom === 'number') {
          return custom
        }
      }
      if (byKey) {
        const key = byKey(a, b)
        if (typeof key === 'number') {
          return key
        }
      }
      return byLocale(a, b)
    }),
  )
}

const parseWS = path => ({
  isRoot: path === ROOT,
  relDir: `${path == ROOT ? '.' : relative(path, ROOT)}/`,
  path: resolve(path, 'package.json'),
  dir: path,
  pj: readJson(resolve(path, 'package.json')),
})

const root = parseWS(ROOT)
const rootConfig = yamlParse(
  readFileSync(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf8'),
)

const workspaces = [
  root,
  ...readdirSync(resolve(ROOT, rootConfig.packages[0].slice(0, -1)), {
    withFileTypes: true,
  })
    .filter(w => w.isDirectory())
    .map(w => parseWS(resolve(w.parentPath, w.name))),
]

const shouldBeCatalogDevDeps = new Set(
  [
    ...workspaces
      .reduce((acc, { pj }) => {
        for (const k of Object.keys(pj.devDependencies ?? {})) {
          acc.set(k, (acc.get(k) ?? 0) + 1)
        }
        return acc
      }, new Map())
      .entries(),
  ]
    .filter(([, v]) => v > 1)
    .map(([k]) => k),
)

const fixDevDeps = async ws => {
  const { devDependencies, dependencies } = ws.pj

  for (const k of Object.keys(dependencies ?? {})) {
    if (k.startsWith('@vltpkg/')) {
      dependencies[k] = 'workspace:*'
      continue
    }
  }

  for (const k of Object.keys(devDependencies ?? {})) {
    if (
      k.startsWith('@vltpkg/') &&
      !devDependencies[k].startsWith('workspace:')
    ) {
      devDependencies[k] = 'workspace:*'
      continue
    }
    if (shouldBeCatalogDevDeps.has(k)) {
      devDependencies[k] = 'catalog:'
      continue
    }
  }
}

const fixScripts = async ws => {
  Object.assign(
    ws.pj.scripts,
    ws.pj.devDependencies.typedoc ? { typedoc: 'typedoc' } : {},
    ws.pj.devDependencies.prettier ?
      {
        format: `prettier --write . --log-level warn --ignore-path ${ws.relDir}.prettierignore --cache`,
        'format:check': `prettier --check . --ignore-path ${ws.relDir}.prettierignore --cache`,
      }
    : {},
    ws.pj.devDependencies.eslint ?
      {
        lint: 'eslint . --fix',
        'lint:check': 'eslint .',
      }
    : {},
    ws.pj.devDependencies.tap ?
      {
        test: 'tap',
        snap: 'tap',
      }
    : {},
    ws.pj.devDependencies.tshy ?
      {
        prepare: 'tshy',
        pretest: 'npm run prepare',
        presnap: 'npm run prepare',
      }
    : {},
    !ws.pj.private ?
      {
        preversion: 'npm test',
        postversion: 'npm publish',
        prepublishOnly: 'git push origin --follow-tags',
      }
    : {},
  )
  ws.pj.scripts = sortObject(ws.pj.scripts, (a, b) => {
    const aName = a.replace(/^(pre|post)/, '')
    const bName = b.replace(/^(pre|post)/, '')
    if (aName === bName) {
      return (
        a.startsWith('pre') || b.startsWith('post') ? -1
        : a.startsWith('post') || b.startsWith('pre') ? 1
        : 0
      )
    }
    return [aName, bName]
  })
}

const fixTools = async ws => {
  if (ws.pj.tshy) {
    ws.pj.tshy = sortObject(
      {
        ...ws.pj.tshy,
        selfLink: false,
        dialects: ['esm'],
        exports: sortObject(
          {
            ...ws.pj.tshy.exports,
            './package.json': './package.json',
            '.': './src/index.ts',
          },
          ['./package.json', '.'],
        ),
      },
      ['selfLink', 'dialects'],
    )
    await mergeJson(resolve(ws.dir, 'tsconfig.json'), d =>
      sortObject({
        ...d,
        extends: `${ws.relDir}tsconfig.json`,
      }),
    )
  }
  if (ws.pj.devDependencies.tap) {
    ws.pj.tap = sortObject(
      {
        ...ws.pj.tap,
        extends: `${ws.relDir}tap-config.yaml`,
      },
      ['extends'],
    )
  }
  if (ws.pj.devDependencies.prettier) {
    ws.pj.prettier = `${ws.relDir}.prettierrc.json`
  }
  if (ws.pj.devDependencies.typedoc && !ws.isRoot) {
    await mergeJson(
      resolve(ws.dir, 'typedoc.json'),
      d =>
        sortObject({
          ...d,
          entryPoints: ['./src/**/*.+(ts|tsx|mts|cts)'],
          extends: [`${ws.relDir}typedoc.base.json`],
          tsconfig: './.tshy/esm.json',
        }),
      { prettier: true },
    )
  }
}

const fixPackage = async ws => {
  await fixDevDeps(ws)
  await fixScripts(ws)
  await fixTools(ws)
  return sortObject(ws.pj, [
    'name',
    'description',
    'version',
    'tshy',
    'bin',
    'dependencies',
    'devDependencies',
    'scripts',
    'tap',
    'prettier',
    'main',
    'types',
    'type',
    'private',
  ])
}

for (const ws of workspaces) {
  await writeJson(ws.path, await fixPackage(ws))
}
