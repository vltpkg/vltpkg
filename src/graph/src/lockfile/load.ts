import { error } from '@vltpkg/error-cause'
import { PackageJson } from '@vltpkg/package-json'
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
    'scope-registries': scopeRegistries,
    registry,
    registries,
    'git-hosts': gitHosts,
    'git-host-archives': gitHostArchives,
    /* c8 ignore next */
  } = lockfileData.options ?? {}

  // Optimize options merging - only create new objects when needed
  const mergedOptions = {
    ...options,
    catalog,
    catalogs,
    'scope-registries':
      scopeRegistries ?
        { ...options['scope-registries'], ...scopeRegistries }
      : options['scope-registries'],
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
