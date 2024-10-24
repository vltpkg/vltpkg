import { PackageJson } from '@vltpkg/package-json'
import { Manifest } from '@vltpkg/types'
import { Monorepo } from '@vltpkg/workspaces'
import type { SpecOptions } from '@vltpkg/spec'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PathScurry } from 'path-scurry'
import { loadEdges } from './load-edges.js'
import { loadNodes } from './load-nodes.js'
import { Graph } from '../graph.js'
import type { LockfileData } from './types.js'

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
}

export const load = (options: LoadOptions): Graph => {
  const { projectRoot } = options
  return loadObject(
    options,
    JSON.parse(
      readFileSync(resolve(projectRoot, 'vlt-lock.json'), {
        encoding: 'utf8',
      }),
    ),
  )
}

export const loadHidden = (options: LoadOptions): Graph => {
  const { projectRoot } = options
  return loadObject(
    options,
    JSON.parse(
      readFileSync(
        resolve(projectRoot, 'node_modules/.vlt-lock.json'),
        { encoding: 'utf8' },
      ),
    ),
  )
}

export const loadObject = (
  options: LoadOptions,
  lockfileData: LockfileData,
) => {
  const { mainManifest, scurry } = options
  const packageJson = options.packageJson ?? new PackageJson()
  const monorepo =
    options.monorepo ??
    Monorepo.maybeLoad(options.projectRoot, { packageJson, scurry })
  const {
    'scope-registries': scopeRegistries,
    registry,
    registries,
    'git-hosts': gitHosts,
    'git-host-archives': gitHostArchives,
  } = lockfileData.options
  const mergedOptions = {
    ...options,
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

  loadNodes(graph, lockfileData.nodes)
  loadEdges(graph, lockfileData.edges, mergedOptions)

  return graph
}
