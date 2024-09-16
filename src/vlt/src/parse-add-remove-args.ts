import { DepID } from '@vltpkg/dep-id'
import {
  AddImportersDependenciesMap,
  Dependency,
  DependencyTypeShort,
  RemoveImportersDependenciesMap,
  asDependency,
} from '@vltpkg/graph'
import { LoadedConfig } from './config/index.js'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { Monorepo } from '@vltpkg/workspaces'

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

/**
 * Get the list of importers that are currently selected
 * in {@link WorkspaceTypes}.
 */
const getImporters = (
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

  // if no references were found, default behavior is to point to project root
  if (!res.size) {
    res.add('file;.')
  }

  return res
}

const getType = (opts: SaveTypes): DependencyTypeShort =>
  opts['save-prod'] ? 'prod'
  : opts['save-dev'] ? 'dev'
  : opts['save-peer'] ?
    opts['save-optional'] ?
      'peerOptional'
    : 'peer'
  : opts['save-optional'] ? 'optional'
  : 'prod'

export const parseAddArgs = (
  config: LoadedConfig,
  monorepo?: Monorepo,
): ParsedAddArgs => {
  const add = new Map()
  const items = config.positionals
  const type = getType(config.values)
  const importers = getImporters(config.values, monorepo)
  const newDependencies = new Map<string, Dependency>()
  const specOptions: SpecOptions = config.options

  // nameless spec definitions will need to use their full
  // stringified spec result instead of their name in order
  // to have an unique key name in the resulting Map
  const getName = (s: Spec): string =>
    s.name === '(unknown)' ? s.spec : s.name

  for (const item of items) {
    const spec = Spec.parseArgs(item, specOptions)
    newDependencies.set(getName(spec), asDependency({ spec, type }))
  }

  for (const importer of importers) {
    add.set(importer, newDependencies)
  }

  return {
    add,
  }
}

export const parseRemoveArgs = (
  config: LoadedConfig,
  monorepo?: Monorepo,
): ParsedRemoveArgs => {
  const remove = new Map()
  const importers = getImporters(config.values, monorepo)

  for (const importer of importers) {
    remove.set(importer, new Set(config.positionals))
  }

  return {
    remove,
  }
}
