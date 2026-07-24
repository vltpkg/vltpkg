import { asDependency } from '@vltpkg/graph'
import { joinDepIDTuple, splitDepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import { isAbsolute, relative, resolve } from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { DepID } from '@vltpkg/dep-id'
import type {
  AddImportersDependenciesMap,
  Dependency,
  RemoveImportersDependenciesMap,
} from '@vltpkg/graph'
import type { SpecOptions } from '@vltpkg/spec'
import type { DependencySaveType } from '@vltpkg/types'
import type { Monorepo } from '@vltpkg/workspaces'
import type { LoadedConfig } from './config/index.ts'

export type ParsedAddArgs = {
  add: AddImportersDependenciesMap
}

export type ParsedRemoveArgs = {
  remove: RemoveImportersDependenciesMap
}

export type SaveTypes = {
  'save-dev'?: boolean
  'save-optional'?: boolean
  'save-peer'?: boolean
  'save-prod'?: boolean
}

export type WorkspaceTypes = {
  workspace?: string[]
  'workspace-group'?: string[]
}

const rootDepID = joinDepIDTuple(['file', '.'])

/**
 * Compute a DepID for the current working directory relative to the project
 * root. Returns the root DepID if cwd is the project root, otherwise returns
 * the computed DepID.
 */
const getCwdDepID = (scurry: PathScurry): DepID => {
  const cwd = process.cwd()
  const relPath = scurry.relativePosix(cwd)
  // If cwd is the project root or outside it, return root DepID
  if (!relPath || relPath.startsWith('..')) {
    return rootDepID
  }
  // Return a DepID for the nested folder (posix-style path)
  return joinDepIDTuple(['file', relPath.split('\\').join('/')])
}

/**
 * Get the list of importers that are currently selected
 * in {@link WorkspaceTypes}.
 */
const getWorkspaceImporters = (
  opts: WorkspaceTypes,
  monorepo?: Monorepo,
): Set<DepID> => {
  const res = new Set<DepID>()

  // collects DepID references to any selected workspace
  if (monorepo) {
    for (const ws of monorepo.filter(opts)) {
      res.add(ws.id)
    }
  }

  return res
}

const getType = (opts: SaveTypes): DependencySaveType =>
  opts['save-prod'] ? 'prod'
  : opts['save-dev'] ? 'dev'
  : opts['save-peer'] ?
    opts['save-optional'] ?
      'peerOptional'
    : 'peer'
  : opts['save-optional'] ? 'optional'
  : 'implicit'

class AddImportersDependenciesMapImpl
  extends Map
  implements AddImportersDependenciesMap
{
  modifiedDependencies = false
}

class RemoveImportersDependenciesMapImpl
  extends Map
  implements RemoveImportersDependenciesMap
{
  modifiedDependencies = false
}

/**
 * Rebase a file: spec's relative path from process.cwd() to the
 * importer's location. CLI positional args are relative to cwd,
 * but the graph resolver resolves file: paths relative to the
 * importer node's location. When these differ (e.g. `-w` flag),
 * the path must be rebased.
 *
 * Also detects when the target path is a workspace and converts
 * the spec to `workspace:*`.
 */
const rebaseFileSpec = (
  spec: Spec,
  importerPath: string,
  scurryCwd: string,
  specOptions: SpecOptions,
  monorepo?: Monorepo,
): Spec => {
  if (spec.type !== 'file' || !spec.file || isAbsolute(spec.file)) {
    return spec
  }

  const targetAbs = resolve(process.cwd(), spec.file)

  if (monorepo) {
    for (const ws of monorepo.values()) {
      if (ws.fullpath === targetAbs) {
        return Spec.parse(ws.name, 'workspace:*', specOptions)
      }
    }
  }

  const importerAbs = resolve(scurryCwd, importerPath)
  const rebasedPath = relative(importerAbs, targetAbs)
    .split('\\')
    .join('/')

  if (rebasedPath === spec.file) return spec

  return Spec.parseArgs(rebasedPath, specOptions)
}

/**
 * Parses the positional arguments into {@link AddImportersDependenciesMap}.
 */
export const parseAddArgs = (
  config: LoadedConfig,
  scurry: PathScurry,
  monorepo?: Monorepo,
): ParsedAddArgs => {
  const add: AddImportersDependenciesMap =
    new AddImportersDependenciesMapImpl()
  const items = config.positionals
  const type = getType(config.values)
  const importers = getWorkspaceImporters(config.values, monorepo)
  const specOptions: SpecOptions = config.options

  // nameless spec definitions will need to use their full
  // stringified spec result instead of their name in order
  // to have an unique key name in the resulting Map
  const getName = (s: Spec): string =>
    s.name === '(unknown)' ? s.spec : s.name

  // parses each positional argument into a Spec and
  // adds it to the new dependencies Map
  const parsedItems: { spec: Spec; type: DependencySaveType }[] = []
  let hasFileSpecs = false
  for (const item of items) {
    const spec = Spec.parseArgs(item, specOptions)
    parsedItems.push({ spec, type })
    if (spec.type === 'file') hasFileSpecs = true
    add.modifiedDependencies = true
  }

  // assigns the new dependencies to each selected workspace importer
  // file: specs need per-importer rebasing since CLI paths are relative
  // to process.cwd() but get resolved relative to the importer's location
  if (hasFileSpecs && importers.size) {
    const scurryCwd = scurry.cwd.fullpath()
    for (const importer of importers) {
      const [, importerPath] = splitDepID(importer)
      const importerDeps = new Map<string, Dependency>()
      for (const { spec, type: depType } of parsedItems) {
        const rebased = rebaseFileSpec(
          spec,
          importerPath,
          scurryCwd,
          specOptions,
          monorepo,
        )
        importerDeps.set(
          getName(rebased),
          asDependency({ spec: rebased, type: depType }),
        )
      }
      add.set(importer, importerDeps)
    }
  } else {
    const newDependencies = new Map<string, Dependency>()
    for (const { spec, type: depType } of parsedItems) {
      newDependencies.set(
        getName(spec),
        asDependency({ spec, type: depType }),
      )
    }

    for (const importer of importers) {
      add.set(importer, newDependencies)
    }

    // if no workspaces were selected, default to the cwd importer which
    // can be either the root or a nested folder in case the user is installing
    // from a subfolder that is also a file: type dependency
    if (!importers.size) {
      const cwdDepID = getCwdDepID(scurry)
      add.set(cwdDepID, newDependencies)
    }
  }

  return {
    add,
  }
}

/**
 * Parses the positional arguments into {@link RemoveImportersDependenciesMap}.
 */
export const parseRemoveArgs = (
  config: LoadedConfig,
  scurry: PathScurry,
  monorepo?: Monorepo,
): ParsedRemoveArgs => {
  const remove: RemoveImportersDependenciesMap =
    new RemoveImportersDependenciesMapImpl()
  const importers = getWorkspaceImporters(config.values, monorepo)

  for (const importer of importers) {
    remove.set(importer, new Set(config.positionals))
    remove.modifiedDependencies = true
  }

  // if no workspaces were selected, default to the cwd importer
  if (!importers.size) {
    const cwdDepID = getCwdDepID(scurry)
    remove.set(cwdDepID, new Set(config.positionals))
    remove.modifiedDependencies = true
  }

  return {
    remove,
  }
}
