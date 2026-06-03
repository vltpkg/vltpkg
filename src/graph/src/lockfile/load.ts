import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import {
  defaultGitHostArchives,
  defaultGitHosts,
  defaultJsrRegistries,
  defaultRegistries,
  defaultRegistry,
  defaultScopeRegistries,
} from '@vltpkg/spec'
import { isRecordStringString } from '@vltpkg/types'
import { Monorepo } from '@vltpkg/workspaces'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEdges } from './load-edges.ts'
import { loadNodes } from './load-nodes.ts'
import { Graph } from '../graph.ts'
import { LOCKFILE_VERSION } from './types.ts'
import type { PathScurry } from 'path-scurry'
import type { NormalizedManifest } from '@vltpkg/types'
import type { SpecOptions } from '@vltpkg/spec'
import type { LockfileData } from './types.ts'
import type { GraphModifier } from '../modifiers.ts'

export type LoadOptions = SpecOptions & {
  /**
   * An optional {@link Graph} object to hydrate extra data from.
   */
  actual?: Graph
  /**
   * The project root dirname.
   */
  projectRoot: string
  /**
   * The project root manifest.
   */
  mainManifest: NormalizedManifest
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
   * Whether to throw an error if a manifest is missing when loading nodes.
   */
  throwOnMissingManifest?: boolean
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
  // Ensure that missing manifests throw an error when loading hidden lockfiles
  options.throwOnMissingManifest = true
  return loadObject(
    options,
    loadLockfile(projectRoot, 'node_modules/.vlt-lock.json'),
  )
}

/**
 * Removes entries from `items` that match the corresponding
 * entry in `defaultItems`, returning only non-default values.
 */
const removeDefaultItems = (
  defaultItems: Record<string, string>,
  items: Record<string, string>,
) => {
  const res: Record<string, string> = {}
  for (const [key, value] of Object.entries(items)) {
    if (!defaultItems[key] || defaultItems[key] !== value) {
      res[key] = value
    }
  }
  return res
}

/**
 * Builds a normalized options object from the current runtime config
 * using the same cleaning logic as `lockfile/save.ts` so that it can
 * be compared directly against the options stored in a lockfile.
 */
const buildCurrentOptions = (
  options: LoadOptions,
): LockfileData['options'] => {
  const hasItems = (o: Record<string, unknown> | undefined) =>
    o && Object.keys(o).length > 0

  const cleanModifiers =
    (
      options.modifiers &&
      isRecordStringString(options.modifiers.config)
    ) ?
      options.modifiers.config
    : undefined

  const cleanRegistries =
    isRecordStringString(options.registries) ?
      removeDefaultItems(defaultRegistries, options.registries)
    : undefined

  const cleanScopeRegistries =
    isRecordStringString(options['scoped-registries']) ?
      removeDefaultItems(
        defaultScopeRegistries,
        options['scoped-registries'],
      )
    : undefined

  const cleanJsrRegistries =
    isRecordStringString(options['jsr-registries']) ?
      removeDefaultItems(
        defaultJsrRegistries,
        options['jsr-registries'],
      )
    : undefined

  const cleanGitHosts =
    isRecordStringString(options['git-hosts']) ?
      removeDefaultItems(defaultGitHosts, options['git-hosts'])
    : undefined

  const cleanGitHostArchives =
    isRecordStringString(options['git-host-archives']) ?
      removeDefaultItems(
        defaultGitHostArchives,
        options['git-host-archives'],
      )
    : undefined

  return {
    ...(hasItems(cleanModifiers) ?
      { modifiers: cleanModifiers }
    : {}),
    ...(hasItems(options.catalog) ?
      { catalog: options.catalog }
    : {}),
    ...(hasItems(options.catalogs) ?
      { catalogs: options.catalogs }
    : {}),
    ...(hasItems(cleanScopeRegistries) ?
      { 'scoped-registries': cleanScopeRegistries }
    : undefined),
    ...(hasItems(cleanJsrRegistries) ?
      { 'jsr-registries': cleanJsrRegistries }
    : undefined),
    ...((
      options.registry !== undefined &&
      options.registry !== defaultRegistry
    ) ?
      { registry: options.registry }
    : undefined),
    ...(hasItems(cleanRegistries) ?
      { registries: cleanRegistries }
    : undefined),
    ...(hasItems(cleanGitHosts) ?
      { 'git-hosts': cleanGitHosts }
    : undefined),
    ...(hasItems(cleanGitHostArchives) ?
      { 'git-host-archives': cleanGitHostArchives }
    : undefined),
  }
}

export const loadObject = (
  options: LoadOptions,
  lockfileData: Omit<LockfileData, 'options' | 'lockfileVersion'> &
    Partial<Pick<LockfileData, 'options' | 'lockfileVersion'>>,
) => {
  const version = lockfileData.lockfileVersion
  // Lockfile version is required, likely a corrupted lockfile if missing
  if (version == null) {
    throw error('Missing lockfile version', {
      code: 'ELOCKFILEVERSION',
      found: version,
      wanted: LOCKFILE_VERSION,
    })
  }
  // Lockfile version must match current version
  if (version !== LOCKFILE_VERSION) {
    throw error(
      `Unsupported lockfile version.

  Run: \`vlt update\` to start a new, supported lockfile.`,
      {
        code: 'ELOCKFILEVERSION',
        found: version,
        wanted: LOCKFILE_VERSION,
      },
    )
  }

  const { mainManifest, scurry } = options
  const packageJson = options.packageJson ?? new PackageJson()
  const monorepo =
    options.monorepo ??
    Monorepo.maybeLoad(options.projectRoot, { packageJson, scurry })
  const {
    catalog = {},
    catalogs = {},
    'scoped-registries': scopedRegistriesOption,
    registry,
    registries,
    'git-hosts': gitHosts,
    'git-host-archives': gitHostArchives,
    /* c8 ignore next */
  } = lockfileData.options ?? {}
  // backwards-compat: legacy lockfiles wrote this field as `scope-registries`
  const scopeRegistries =
    scopedRegistriesOption ??
    (
      lockfileData.options as {
        'scope-registries'?: Record<string, string>
      }
    )['scope-registries']

  // Detect whether the current config options differ from those
  // stored in the lockfile.  When they do the ideal builder must
  // reset edges and rebuild the graph.
  const currentOptions = buildCurrentOptions(options)
  /* c8 ignore next */
  const lockfileOptions = lockfileData.options ?? {}
  const optionsChanged =
    JSON.stringify(currentOptions) !== JSON.stringify(lockfileOptions)

  // Optimize options merging - only create new objects when needed
  const mergedOptions = {
    ...options,
    catalog,
    catalogs,
    'scoped-registries':
      scopeRegistries ?
        { ...options['scoped-registries'], ...scopeRegistries }
      : options['scoped-registries'],
    registry: registry ?? options.registry,
    registries:
      registries ?
        { ...options.registries, ...registries }
      : options.registries,
    'git-hosts':
      gitHosts ?
        { ...options['git-hosts'], ...gitHosts }
      : options['git-hosts'],
    'git-host-archives':
      gitHostArchives ?
        { ...options['git-host-archives'], ...gitHostArchives }
      : options['git-host-archives'],
  }
  const graph = new Graph({
    ...mergedOptions,
    mainManifest,
    monorepo,
  })
  graph.optionsChanged = optionsChanged
  loadNodes(
    graph,
    lockfileData.nodes,
    mergedOptions,
    options.actual,
    options.throwOnMissingManifest,
  )
  loadEdges(graph, lockfileData.edges, mergedOptions)

  // hydrate missing node-level registry data
  for (const node of graph.nodes.values()) {
    const [firstEdge] = node.edgesIn
    if (firstEdge?.spec.registry) {
      node.registry = firstEdge.spec.registry
    }
  }

  return graph
}
