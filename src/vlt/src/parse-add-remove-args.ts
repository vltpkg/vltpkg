import { DepID } from '@vltpkg/dep-id'
import {
  Dependency,
  DependencyTypeShort,
  asDependency,
} from '@vltpkg/graph'
import { LoadedConfig } from './config/index.js'
import { Spec, SpecOptions } from '@vltpkg/spec'

export type ParsedAddArgs = {
  add: Map<DepID, Map<string, Dependency>>
}

export type ParsedRemoveArgs = {
  remove: Map<DepID, Set<string>>
}

export type SaveTypes = {
  'save-dev'?: boolean
  'save-optional'?: boolean
  'save-peer'?: boolean
  'save-prod'?: boolean
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

export const parseAddArgs = (config: LoadedConfig): ParsedAddArgs => {
  const add = new Map()
  const items = config.positionals
  const type = getType(config.values)
  const newDependencies = new Map<string, Dependency>()
  // TODO: Remove the type casting once the fix from the reify PR has landed
  const specOptions: SpecOptions = config.options as SpecOptions

  // nameless spec definitions will need to use their full
  // stringified spec result instead of their name in order
  // to have an unique key name in the resulting Map
  const getName = (s: Spec): string =>
    s.name === '(unknown)' ? s.spec : s.name

  for (const item of items) {
    const spec = Spec.parseArgs(item, specOptions)
    newDependencies.set(getName(spec), asDependency({ spec, type }))
  }

  // TODO: add support to different importers / workspaces
  add.set('file;.', newDependencies)

  return {
    add,
  }
}

export const parseRemoveArgs = (
  config: LoadedConfig,
): ParsedRemoveArgs => {
  const remove = new Map()

  // TODO: add support to different importers / workspaces
  remove.set('file;.', new Set(config.positionals))

  return {
    remove,
  }
}
