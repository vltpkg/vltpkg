import { PackageJson } from '@vltpkg/package-json'
import { Monorepo } from '@vltpkg/workspaces'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEdges } from './load-edges.ts'
import { loadNodes } from './load-nodes.ts'
import { Graph } from '../graph.ts'
import type { PathScurry } from 'path-scurry'
import type { Manifest } from '@vltpkg/types'
import type { SpecOptions } from '@vltpkg/spec'
import type { LockfileData } from './types.ts'
import type { GraphModifier } from '../modifiers.ts'

export type LoadOptions = SpecOptions & {
  /**
   * The project root dirname.
   */
  projectRoot: string
  /**
   * The project root manifest.
   */
  mainManifest: Manifest
  /**
   * The graph modifiers helper object.
   */
  modifiers?: GraphModifier
  /**
   * A {@link Monorepo} object, for managing workspaces
   */
  monorepo?: Monorepo
  /**
   * A {@link PackageJson} object, for sharing manifest caches
   */
  packageJson?: PackageJson
  /**
   * A {@link PathScurry} object, for use in globs
   */
  scurry?: PathScurry
  /**
   * Load only importers into the graph if the modifiers have changed.
   */
  skipLoadingNodesOnModifiersChange?: boolean
}

const loadLockfile = (projectRoot: string, lockfilePath: string) =>
  JSON.parse(
    readFileSync(resolve(projectRoot, lockfilePath), {
      encoding: 'utf8',
    }),
  ) as LockfileData

export const load = (options: LoadOptions): Graph => {
  const { projectRoot } = options
  return loadObject(
    options,
    loadLockfile(projectRoot, 'vlt-lock.json'),
  )
}

export const loadHidden = (options: LoadOptions): Graph => {
  const { projectRoot } = options
  return loadObject(
    options,
    loadLockfile(projectRoot, 'node_modules/.vlt-lock.json'),
  )
}

export const loadObject = (
  options: LoadOptions,
  lockfileData: Omit<LockfileData, 'options'> &
    Partial<Pick<LockfileData, 'options'>>,
) => {
  const {
    mainManifest,
    modifiers,
    scurry,
    skipLoadingNodesOnModifiersChange,
  } = options
  const packageJson = options.packageJson ?? new PackageJson()
  const monorepo =
    options.monorepo ??
    Monorepo.maybeLoad(options.projectRoot, { packageJson, scurry })
  const {
    catalog = {},
    catalogs = {},
    modifiers: modifiersLockfileConfig,
    'scope-registries': scopeRegistries,
    registry,
    registries,
    'git-hosts': gitHosts,
    'git-host-archives': gitHostArchives,
  } = lockfileData.options ?? {}
  const mergedOptions = {
    ...options,
    catalog,
    catalogs,
    'scope-registries': {
      ...options['scope-registries'],
      ...scopeRegistries,
    },
    registry: registry ?? options.registry,
    registries: {
      ...options.registries,
      ...registries,
    },
    'git-hosts': {
      ...options['git-hosts'],
      ...gitHosts,
    },
    'git-host-archives': {
      ...options['git-host-archives'],
      ...gitHostArchives,
    },
  }
  const graph = new Graph({
    ...mergedOptions,
    mainManifest,
    monorepo,
  })

  // When using the skipLoadingNodesOnModifiersChange option, we should skip loading
  // dependencies in case the modifiers have changed since we'll need to
  // recalculate the graph - useful for refreshing an ideal graph when
  // modifiers are swapped.
  const lockfileModifiers = JSON.stringify(
    modifiersLockfileConfig ?? {},
  )
  const optionsModifiers = JSON.stringify(modifiers?.config)
  const modifiersChanged = lockfileModifiers !== optionsModifiers
  const shouldLoadDependencies = !(
    skipLoadingNodesOnModifiersChange && modifiersChanged
  )
  if (shouldLoadDependencies) {
    loadNodes(graph, lockfileData.nodes)
    loadEdges(graph, lockfileData.edges, mergedOptions)
  }

  return graph
}
