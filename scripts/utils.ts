import assert from 'node:assert'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const ROOT = resolve(import.meta.dirname, '..')

export const CatalogDepTypes = [
  'dependencies',
  'devDependencies',
] as const

export type CatalogDepType = (typeof CatalogDepTypes)[number]

export type Workspace = {
  dir: string
  pkgPath: string
  pj: PackageJson
}

export type WorkspaceConfig = {
  workspaces: string[]
  catalog: Record<string, string>
}

export type PackageJson = {
  name: string
  version: string
  scripts?: Record<string, unknown>
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
  tap?: Record<string, unknown>
  prettier?: string
  license?: string
  engines?: Record<string, string>
  repository?: {
    type: string
    url: string
    directory?: string
  }
  files?: string[]
  publishConfig?: {
    directory?: string
  }
  [key: string]: unknown
}

/**
 * Update this config to make consistent-package-json and find-catalogable-deps
 * ignore packages or workspaces from needing to be cataloged.
 */
const catalogConfig: {
  workspaces: {
    name: string
    type?: CatalogDepType
  }[]
  packages: {
    name: string
    workspace?: {
      name: string
      type?: CatalogDepType
    }[]
  }[]
} = {
  workspaces: [
    { name: '@vltpkg/docs', type: 'dependencies' },
    { name: '@vltpkg/gui', type: 'dependencies' },
    { name: '@vltpkg/smoke-test', type: 'dependencies' },
  ],
  packages: [
    { name: '@types/react' },
    { name: '@types/react-dom' },
    { name: 'esbuild' },
  ],
}

export const ignoreCatalog = {
  workspaces: ({
    name,
    type,
  }: {
    name: string
    type: CatalogDepType
  }) =>
    catalogConfig.workspaces.some(
      w =>
        w.name === name && (w.type === undefined || w.type === type),
    ),
  packages: ({
    name,
    ws,
    type,
  }: {
    name: string
    ws: string
    type: CatalogDepType
  }) =>
    catalogConfig.packages.some(
      p =>
        p.name === name &&
        (p.workspace === undefined ||
          p.workspace.some(
            w =>
              w.name === ws &&
              (w.type === undefined || w.type === type),
          )),
    ),
}

export const getWorkspaceConfig = (): WorkspaceConfig => {
  const { catalog, workspaces } = JSON.parse(
    readFileSync(resolve(ROOT, 'vlt.json'), 'utf8'),
  ) as { catalog: Record<string, string>; workspaces: string[] }
  assert(catalog, 'catalog is required')
  assert(workspaces, 'workspaces is required')
  return { catalog, workspaces }
}

export const readPkgJson = (path: string) =>
  JSON.parse(
    readFileSync(resolve(path, 'package.json'), 'utf8'),
  ) as PackageJson

export const getWorkspace = (dir: string) => ({
  dir,
  pkgPath: resolve(dir, 'package.json'),
  pj: readPkgJson(dir),
})

export const getWorkspaces = (): Workspace[] =>
  [
    ROOT,
    ...getWorkspaceConfig().workspaces.flatMap(p =>
      readdirSync(resolve(ROOT, p.replaceAll('*', '')), {
        withFileTypes: true,
      })
        .filter(w => w.isDirectory())
        .filter(w =>
          existsSync(resolve(w.parentPath, w.name, 'package.json')),
        )
        .map(w => resolve(w.parentPath, w.name)),
    ),
  ].map(getWorkspace)
