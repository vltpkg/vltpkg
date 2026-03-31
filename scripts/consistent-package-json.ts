#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { readFileSync, copyFileSync, writeFileSync } from 'node:fs'
import { relative, resolve, basename, join, dirname } from 'node:path'
import { readFile } from 'node:fs/promises'
import { resolveConfig, format } from 'prettier'
import {
  ROOT,
  getWorkspaces,
  getWorkspaceConfig,
  ignoreCatalog,
  CatalogDepTypes,
} from './utils.ts'
import type {
  WorkspaceConfig,
  Workspace as WorkspaceBase,
} from './utils.ts'

const NODE_ENGINES = '>=22.22.0'

type Workspace = WorkspaceBase & {
  isRoot: boolean
  relDir: string
  dirName: string
}

const isStandardTypeScriptWorkspace = (ws: Workspace) =>
  ws.dirName.startsWith('src/')

const writeJson = async (p: string, data: unknown) =>
  writeFormatted(p, JSON.stringify(data, null, 2) + '\n')

const mergeJson = async (p: string, fn: (o: object) => unknown) =>
  writeJson(p, fn(JSON.parse(readFileSync(p, 'utf8')) as object))

const writeFormatted = async (p: string, str: unknown) =>
  writeFileSync(
    p,
    await format(
      typeof str === 'string' ? str : (
        JSON.stringify(str, null, 2) + '\n'
      ),
      {
        ...(await resolveConfig(p)),
        filepath: p,
      },
    ),
  )

const sortObject = (
  o: Record<string, unknown>,
  ...args: unknown[]
) => {
  const byLocale = (a: string, b: string) => a.localeCompare(b, 'en')

  const createByKey = (keys: string[]) => {
    const keyMap = new Map(keys.map((k, i) => [k, i]))
    return (a: string, b: string) => {
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
    Array.isArray(args[0]) ? createByKey(args[0] as string[])
    : Array.isArray(args[1]) ? createByKey(args[1] as string[])
    : null

  const byCustom =
    typeof args[0] === 'function' ?
      (args[0] as (a: string, b: string) => number | [string, string])
    : null

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

const fixCatalogs = async (
  ws: Workspace,
  config: WorkspaceConfig,
) => {
  for (const type of CatalogDepTypes) {
    if (ignoreCatalog.workspaces({ name: ws.pj.name, type })) {
      continue
    }

    for (const name of Object.keys(ws.pj[type] ?? {})) {
      if (ignoreCatalog.packages({ name, ws: ws.pj.name, type })) {
        continue
      }

      if (config.catalog[name]) {
        ws.pj[type] ??= {}
        ws.pj[type][name] = 'catalog:'
      }
    }
  }
}

const fixScripts = async (ws: Workspace) => {
  const scripts: Record<string, string> = {
    ...(ws.pj.scripts ?? {}),
    ...(!ws.isRoot && ws.pj.devDependencies?.typescript ?
      {
        typecheck: 'tsc --noEmit',
      }
    : {}),
    ...(ws.pj.devDependencies?.prettier ?
      {
        format: `prettier --write . --log-level warn --ignore-path ${ws.relDir}.prettierignore --cache`,
        'format:check': `prettier --check . --ignore-path ${ws.relDir}.prettierignore --cache`,
      }
    : {}),
    ...(ws.pj.devDependencies?.eslint ?
      {
        lint: 'eslint . --fix',
        'lint:check': 'eslint .',
      }
    : {}),
    ...(ws.pj.devDependencies?.tap ?
      {
        test: 'tap',
        snap: 'tap',
      }
    : ws.pj.devDependencies?.vitest ?
      {
        test: 'vitest --no-watch',
        snap: 'vitest --no-watch -u',
      }
    : {}),
    ...(isStandardTypeScriptWorkspace(ws) ?
      {
        prepack:
          'tsc -p tsconfig.publish.json && ../../scripts/update-dist-exports.ts',
      }
    : {}),
    ...(ws.pj.dependencies?.astro ?
      {
        typecheck: 'astro check',
      }
    : {}),
  }
  // always run typecheck after tests
  if (scripts.typecheck) {
    scripts.posttest = scripts.typecheck
  }
  ws.pj.scripts = sortObject(scripts, (a: string, b: string) => {
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

const fixTools = async (ws: Workspace) => {
  if (isStandardTypeScriptWorkspace(ws)) {
    await mergeJson(resolve(ws.dir, 'tsconfig.json'), d =>
      sortObject({
        ...d,
        extends: `${ws.relDir}tsconfig.json`,
      }),
    )
    await writeFormatted(resolve(ws.dir, 'tsconfig.publish.json'), {
      extends: `${ws.relDir}tsconfig.json`,
      include: [
        'src/**/*.ts',
        'src/**/*.mts',
        'src/**/*.tsx',
        'src/**/*.json',
      ],
      exclude: ['src/package.json'],
      compilerOptions: {
        outDir: 'dist',
        rootDir: 'src',
        module: 'nodenext',
        moduleResolution: 'nodenext',
        sourceMap: false,
        declarationMap: false,
        inlineSources: false,
      },
    })
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

const fixLicense = async (ws: Workspace) => {
  const licenseFile = join(ws.dir, 'LICENSE')
  const license = await readFile(licenseFile, 'utf8').catch(() => '')

  const containsVlt = () => {
    if (!/Copyright (.*)? vlt technology,? Inc\./i.test(license)) {
      throw new Error(
        `${ws.pj.name} license should contain vlt company name`,
      )
    }
  }
  const containsText = (text: string) => {
    if (!license.includes(text)) {
      throw new Error(
        `${ws.pj.name} license should contain '${text}'`,
      )
    }
  }

  switch (ws.pj.name) {
    // Make sure MIT/ISC forks have the correct licenses
    case '@vltpkg/dot-prop': {
      ws.pj.license = 'MIT'
      containsText(`${ws.pj.license} License`)
      containsVlt()
      break
    }
    case '@vltpkg/git':
    case '@vltpkg/promise-spawn':
    case '@vltpkg/which': {
      ws.pj.license = 'ISC'
      containsText(`${ws.pj.license} License`)
      containsVlt()
      break
    }
    case '@vltpkg/cmd-shim': {
      // cmd-shim has a custom license so dont copy from root
      // but make sure it has the company name and attributions.
      ws.pj.license = 'BSD-2-Clause-Patent'
      containsText(`ISC License`)
      containsText(`patent license`)
      containsVlt()
      break
    }
    default: {
      ws.pj.license = 'BSD-2-Clause-Patent'
      copyFileSync(join(ROOT, 'LICENSE'), licenseFile)
    }
  }
}

const PLATFORM_PACKAGE_RE = /^cli-(darwin|linux|win32)-(arm64|x64)$/

const fixCliVariants = async (ws: Workspace) => {
  if (basename(dirname(ws.dir)) !== 'infra') {
    return
  }

  const workspaceBasename = basename(ws.dir)
  if (!workspaceBasename.startsWith('cli')) {
    return
  }

  // Platform-specific binary packages have their own structure:
  // they don't use infra-build, prepack, or publishConfig.
  if (PLATFORM_PACKAGE_RE.test(workspaceBasename)) {
    const match = PLATFORM_PACKAGE_RE.exec(workspaceBasename)!
    const os = match[1]!
    const cpu = match[2]!
    ws.pj.name = `@vltpkg/vlt-${os}-${cpu}`
    ws.pj.preferUnplugged = true
    return
  }

  const isDefaultCli = workspaceBasename === 'cli'

  ws.pj.devDependencies = {
    '@vltpkg/infra-build': 'workspace:*',
  }
  ws.pj.scripts = {
    prepack: 'vlt-build-prepack',
  }
  ws.pj.publishConfig = {
    directory: './.build-publish',
  }

  if (workspaceBasename === 'cli-js' || isDefaultCli) {
    ws.pj.name = isDefaultCli ? 'vlt' : '@vltpkg/cli-js'
    if (isDefaultCli) {
      delete ws.pj.private
    }
  }

  ws.pj.description = 'The vlt CLI'
  const readmeContent = readFileSync(
    resolve(ws.dir, 'README.md'),
    'utf8',
  )
  const parts = readmeContent.split(/(```[\s\S]*?```)/g)
  const processedContent = parts
    .map((part, i) => {
      if (i % 2 === 0) {
        return part
          .replaceAll(/`vlt`( \(.*\))?/g, '`vlt`')
          .replaceAll(/^# .*$/gm, `# ${ws.pj.name}`)
      }
      return part
    })
    .join('')
  await writeFormatted(resolve(ws.dir, 'README.md'), processedContent)
}

const fixEngines = async (ws: Workspace) => {
  if (ws.isRoot) {
    delete ws.pj.engines
    return
  }
  ws.pj.engines ??= {}
  ws.pj.engines.node =
    ws.pj.name === '@vltpkg/docs' ? '22.x' : NODE_ENGINES
}

const fixPackage = async (ws: Workspace, config: WorkspaceConfig) => {
  const relDirToWorkspace = relative(ROOT, ws.dir)
  ws.pj.repository = {
    type: 'git',
    url: 'git+https://github.com/vltpkg/vltpkg.git',
    ...(relDirToWorkspace ? { directory: relDirToWorkspace } : {}),
  }

  ws.pj.author =
    'vlt technology inc. <support@vlt.sh> (http://vlt.sh)'

  await fixEngines(ws)
  await fixCatalogs(ws, config)
  await fixScripts(ws)
  await fixTools(ws)
  await fixLicense(ws)
  await fixCliVariants(ws)
  return sortObject(ws.pj, [
    'name',
    'description',
    'version',
    'private',
    'repository',
    'author',
    'bin',
    'dependencies',
    'optionalDependencies',
    'peerDependencies',
    'peerDependenciesMeta',
    'devDependencies',
    'license',
    'engines',
    'packageManager',
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
  const config = getWorkspaceConfig()
  const workspaces = getWorkspaces().map(({ dir, pkgPath, pj }) => ({
    dir,
    dirName: dir == ROOT ? '.' : relative(ROOT, dir),
    pj,
    pkgPath,
    isRoot: dir === ROOT,
    relDir: `${dir == ROOT ? '.' : relative(dir, ROOT)}/`,
  }))
  for (const ws of workspaces) {
    await writeJson(ws.pkgPath, await fixPackage(ws, config))
  }
}

await main()
