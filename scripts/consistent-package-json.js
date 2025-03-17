import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from 'node:fs'
import { relative, resolve, basename, dirname, join } from 'node:path'
import { gt, satisfies, validRange } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import minVersion from 'semver/ranges/min-version.js'
import {
  ROOT,
  getConfig,
  configPath,
  getWorkspaces,
  writeYaml,
  format,
  writeJson,
} from './utils.js'

const parseRangeFromSpec = spec => {
  let range = validRange(spec) ? spec : null
  if (!range) {
    try {
      range = Spec.parseArgs(spec).subspec.semver
    } catch {}
  }
  return range ? minVersion(range).version : null
}

const skipCatalog = ({ name, spec, from, type }) => {
  // An fake example so I don't have to remember what to type next time
  if (
    type === 'dependencies' &&
    name === 'DEP_THAT_NEEDS_A_SPECIAL_VERSION' &&
    spec.startsWith('^SOME_MAJOR_VERSION') &&
    from === '@vltpkg/SOME_WORKSPACE'
  ) {
    return true
  }
  // prod deps for docs should not be cataloged since it is
  // not shipped as part of the CLI
  if (from === '@vltpkg/docs' && type === 'dependencies') {
    return true
  }
  // prod deps for the gui should not be cataloged since it
  // is bundled separately and then included in the CLI
  if (from === '@vltpkg/gui' && type === 'dependencies') {
    return true
  }
  return false
}

const isInternal = name => name.startsWith('@vltpkg/')

const writeFormatted = async (p, str) =>
  writeFileSync(p, await format(str, p))

const readJson = f => JSON.parse(readFileSync(f, 'utf8'))

const mergeJson = (p, fn, opts) => writeJson(p, fn(readJson(p)), opts)

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
  relDirToWorkspace: relative(ROOT, path),
  path: resolve(path, 'package.json'),
  dir: path,
  workspaceDir: basename(dirname(path)),
  workspaceBasename: basename(path),
  pj: readJson(resolve(path, 'package.json')),
})

const getCatalogDeps = (workspaces, catalog = {}) => {
  const acc = new Map()

  for (const type of ['dependencies', 'devDependencies']) {
    for (const { pj } of workspaces) {
      for (const name of Object.keys(pj[type] ?? {})) {
        const rawSpec = pj[type][name]
        const spec = rawSpec === 'catalog:' ? catalog[name] : rawSpec
        const version = parseRangeFromSpec(spec)
        // type is not used currently but is kept here to make it
        // easier to separate catalogs by prod vs dev since that is
        // a somewhat common usecase.
        const depInfo = { spec, type, from: pj.name }
        const versions = acc.get(name) ?? []
        if (!skipCatalog({ ...depInfo, name })) {
          versions.push({ ...depInfo, version })
        }
        acc.set(name, versions)
      }
    }
  }

  // For our use case we never want to catalog our own internal deps
  // because those should use `workspace:`. And we only catalog other
  // deps if there is more than one version of it in our graph
  for (const [k, v] of acc.entries()) {
    if (v.length <= 1 || isInternal(k)) {
      acc.delete(k)
    }
  }

  const problems = []

  for (const [name, versions] of acc.entries()) {
    const [lowest] = versions
      .filter(v => !!v.version)
      .sort((a, b) => gt(a.version, b.version))

    if (lowest) {
      catalog[name] = lowest.spec
      for (const v of versions) {
        if (!satisfies(v.version, lowest.spec)) {
          problems.push({ name, found: v, wanted: lowest })
        }
      }
    }
  }

  if (problems.length) {
    const msg = problems.map(
      p =>
        `'${p.name}@${p.found.spec}' in '${p.found.from}' does not ` +
        `satisfy the lowest spec '${p.wanted.spec}' in '${p.wanted.from}'`,
    )
    throw new Error(
      `Catalog problems were found. Either update all the versions` +
        `to be compatible or explicitly skip by adding to \`${skipCatalog.name}\` in this file.` +
        `\n  ${msg.join('\n  ')}`,
    )
  }

  return Object.fromEntries(
    Object.entries(catalog).sort(([a], [b]) =>
      a.localeCompare(b, 'en'),
    ),
  )
}

const fixDeps = async (ws, { catalog }) => {
  // All internal deps used `workspace:` protocol
  const internalDep = (name, deps) => {
    if (isInternal(name)) {
      deps[name] = 'workspace:*'
      return true
    }
  }
  // Set a dep to use the `catalog:` protocol if it
  // is used in multiple places
  const catalogDep = (name, deps, type) => {
    if (
      name in catalog &&
      !skipCatalog({
        name,
        spec: deps[name],
        type,
        from: ws.pj.name,
      })
    ) {
      deps[name] = 'catalog:'
      return true
    }
  }

  for (const type of ['dependencies', 'devDependencies']) {
    const deps = ws.pj[type] ?? {}
    for (const name of Object.keys(deps)) {
      if (internalDep(name, deps, type)) {
        continue
      }
      if (catalogDep(name, deps, type)) {
        continue
      }
    }
    if (ws.pj[type]) {
      ws.pj[type] = sortObject(ws.pj[type])
    }
  }
}

const fixScripts = async ws => {
  const scripts = Object.assign(
    ws.pj.scripts ?? {},
    !ws.isRoot && ws.pj.devDependencies?.typescript ?
      {
        typecheck: 'tsc --noEmit',
      }
    : {},
    // prettier
    ws.pj.devDependencies?.prettier ?
      {
        format: `prettier --write . --log-level warn --ignore-path ${ws.relDir}.prettierignore --cache`,
        'format:check': `prettier --check . --ignore-path ${ws.relDir}.prettierignore --cache`,
      }
    : {},
    // eslint
    ws.pj.devDependencies?.eslint ?
      {
        lint: 'eslint . --fix',
        'lint:check': 'eslint .',
      }
    : {},
    // testing
    ws.pj.devDependencies?.tap ?
      {
        test: 'tap',
        snap: 'tap',
      }
    : ws.pj.devDependencies?.vitest ?
      {
        test: 'vitest',
        snap: 'vitest --no-watch -u',
      }
    : {},
    // typescript/tshy
    ws.pj.devDependencies?.tshy ?
      {
        prepack: 'tshy',
      }
    : {},
    // docs workspace
    ws.pj.dependencies?.astro ?
      {
        typecheck: 'astro check',
      }
    : {},
  )
  // always run typecheck after tests
  if (scripts.typecheck) {
    scripts.posttest = scripts.typecheck
  }
  ws.pj.scripts = sortObject(scripts, (a, b) => {
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
    ws.pj.files = ['dist']
    ws.pj.tshy = sortObject(
      {
        ...ws.pj.tshy,
        selfLink: false,
        liveDev: true,
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
      ['selfLink', 'liveDev', 'dialects'],
    )
    mergeJson(resolve(ws.dir, 'tsconfig.json'), d =>
      sortObject({
        ...d,
        extends: `${ws.relDir}tsconfig.json`,
      }),
    )
  }
  if (ws.pj.devDependencies?.tap) {
    ws.pj.tap = sortObject(
      {
        ...ws.pj.tap,
        extends: `${ws.relDir}tap-config.yaml`,
      },
      ['extends'],
    )
  }
  if (ws.pj.devDependencies?.prettier) {
    ws.pj.prettier = `${ws.relDir}.prettierrc.js`
  }
  if (ws.pj.devDependencies?.typedoc) {
    await writeFormatted(
      resolve(ws.dir, 'typedoc.mjs'),
      [
        `import config from '${ws.relDir}www/docs/typedoc.workspace.mjs'`,
        `export default config(import.meta.dirname)`,
      ].join('\n'),
    )
  }
}

const fixLicense = ws => {
  const defaultLicense = 'BSD-2-Clause-Patent'
  let license = null
  switch (ws.pj.name) {
    case '@vltpkg/dot-prop':
      license = 'MIT'
      break
    case '@vltpkg/git':
    case '@vltpkg/promise-spawn':
    case '@vltpkg/which':
      license = 'ISC'
      break
    default:
      license = defaultLicense
  }
  ws.pj.license = license
  if (license === defaultLicense) {
    copyFileSync(join(ROOT, 'LICENSE'), join(ws.dir, 'LICENSE'))
  } else {
    if (!existsSync(join(ws.dir, 'LICENSE'))) {
      throw new Error(`${ws.pj.name} must have a license`)
    }
    const contents = readFileSync(join(ws.dir, 'LICENSE'), 'utf8')
    if (!contents.includes('Copyright (c) vlt technology, Inc.')) {
      throw new Error(`${ws.pj.name} should contain vlt company name`)
    }
    if (!contents.includes(`${license} License`)) {
      throw new Error(`${ws.pj.name} should contain ${license}`)
    }
  }
}

const fixCliVariants = async ws => {
  if (ws.workspaceDir !== 'infra') {
    return
  }
  if (!ws.workspaceBasename.startsWith('cli')) {
    return
  }

  ws.pj.devDependencies = {
    '@vltpkg/infra-build': 'workspace:*',
  }
  ws.pj.scripts = {
    prepack: 'vlt-build-prepack',
  }
  ws.pj.publishConfig = {
    directory: './.build-publish',
  }

  let descriptionExtra = ''

  switch (ws.workspaceBasename) {
    case 'cli-bundled':
      ws.pj.name = '@vltpkg/cli-bundled'
      // Bundled variant of the CLI is not published but still exists
      // for testing since the bundled JS is an intermediary step of
      // the compiled variant.
      ws.pj.private = true
      break
    case 'cli-compiled':
      ws.pj.name = `vlt`
      ws.pj.engines = undefined
      break
    default: {
      const [platform, arch] = ws.workspaceBasename
        .split('-')
        .splice(1)
      descriptionExtra += ` (${platform}-${arch})`
      ws.pj.name = `@vltpkg/cli-${platform}-${arch}`
      ws.pj.engines = undefined
      break
    }
  }

  ws.pj.description = `The vlt CLI${descriptionExtra}`
  await writeFormatted(
    resolve(ws.dir, 'README.md'),
    readFileSync(resolve(ws.dir, 'README.md'), 'utf8')
      .replaceAll(/`vlt`( \(.*\))?/g, `\`vlt\`${descriptionExtra}`)
      .replaceAll(/^# .*$/gm, `# ${ws.pj.name}`),
  )
}

const fixPackage = async (ws, opts) => {
  ws.pj.engines =
    ws.isRoot ? { node: '>=22', pnpm: '9' } : { node: '>=22' }
  ws.pj.repository = {
    type: 'git',
    url: 'git+https://github.com/vltpkg/vltpkg.git',
    ...(ws.relDirToWorkspace ?
      { directory: ws.relDirToWorkspace }
    : {}),
  }
  await fixDeps(ws, opts)
  await fixScripts(ws, opts)
  await fixTools(ws, opts)
  await fixLicense(ws, opts)
  await fixCliVariants(ws, opts)
  return sortObject(ws.pj, [
    'name',
    'description',
    'version',
    'private',
    'repository',
    'tshy',
    'bin',
    'dependencies',
    'devDependencies',
    'license',
    'engines',
    'scripts',
    'tap',
    'prettier',
    'main',
    'module',
    'types',
    'type',
    'exports',
    'files',
    'os',
    'cpu',
    'keywords',
    'pnpm',
    'publishConfig',
  ])
}

const main = async () => {
  const rootConfig = getConfig()
  const workspaces = getWorkspaces().map(parseWS)
  const catalog = getCatalogDeps(workspaces, rootConfig.catalog)
  for (const ws of workspaces) {
    writeJson(ws.path, await fixPackage(ws, { catalog }))
  }
  await writeYaml(configPath, { ...rootConfig, catalog })
}

export default main

if (import.meta.filename === process.argv?.[1]) {
  main()
}
