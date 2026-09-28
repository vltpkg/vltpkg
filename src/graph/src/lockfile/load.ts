import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
import { Monorepo } from '@vltpkg/workspaces'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadEdges } from './load-edges.ts'
import { diffLockfileOptions, hasItems } from './options.ts'
import { loadNodes } from './load-nodes.ts'
import { Graph } from '../graph.ts'
import { LOCKFILE_VERSION } from './types.ts'
import type { PathScurry } from 'path-scurry'
import type { NormalizedManifest } from '@vltpkg/types'
import type { SpecOptions } from '@vltpkg/spec'
import type { LockfileData, SpecCache } from './types.ts'
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
  /**
   * Shared intern cache for parsed lockfile specs.
   */
  specCache?: SpecCache
  /**
   * Already-parsed lockfile data. When set, skips the filesystem read.
   */
  lockfileData?: LockfileData
}

const loadLockfile = (projectRoot: string, lockfilePath: string) =>
  JSON.parse(
    readFileSync(resolve(projectRoot, lockfilePath), {
      encoding: 'utf8',
    }),
  ) as LockfileData

export const loadData = (
  projectRoot: string,
  lockfilePath = 'vlt-lock.json',
) => loadLockfile(projectRoot, lockfilePath)

export const load = (options: LoadOptions): Graph => {
  const { projectRoot } = options
  return loadObject(
    options,
    options.lockfileData ??
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
    'default-registry-alias': defaultRegistryAlias,
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
  /* c8 ignore next */
  const lockfileOptions = lockfileData.options ?? {}
  const optionsChanges = diffLockfileOptions(options, lockfileOptions)

  // Optimize options merging - only create new objects when needed
  const mergedOptions = {
    ...options,
    // catalog entries are indirections resolved at parse time: prefer
    // the current config so loading a lockfile (e.g. the hidden
    // lockfile cache) yields the same edge specs as a fresh scan of
    // the project; fall back to the stored values so a standalone
    // lockfile still parses when the config no longer defines them
    catalog: hasItems(options.catalog) ? options.catalog : catalog,
    catalogs:
      hasItems(options.catalogs) ? options.catalogs : catalogs,
    'scoped-registries':
      scopeRegistries ?
        { ...options['scoped-registries'], ...scopeRegistries }
      : options['scoped-registries'],
    registry: registry ?? options.registry,
    'default-registry-alias':
      defaultRegistryAlias ?? options['default-registry-alias'],
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
  graph.optionsChanges = optionsChanges
  graph.optionsChanged = optionsChanges.length > 0
  loadNodes(
    graph,
    lockfileData.nodes,
    mergedOptions,
    options.actual,
    options.throwOnMissingManifest,
  )
  // Skip interning when modifiers are active — they mutate Spec.overridden
  const specCache =
    options.modifiers || !options.specCache ?
      undefined
    : {
        specCache: options.specCache,
        prefix: JSON.stringify([
          lockfileOptions,
          mergedOptions.catalog,
          mergedOptions.catalogs,
        ]),
      }
  loadEdges(graph, lockfileData.edges, mergedOptions, specCache)

  // hydrate missing node-level registry data
  for (const node of graph.nodes.values()) {
    const [firstEdge] = node.edgesIn
    if (firstEdge?.spec.registry) {
      node.registry = firstEdge.spec.registry
    }
  }

  graph.sortNodes()
  return graph
}
