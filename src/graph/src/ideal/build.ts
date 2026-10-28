import { error } from '@vltpkg/error-cause'
import { graphStep } from '@vltpkg/output'
import { load as loadActual } from '../actual/load.ts'
import { load as loadVirtual } from '../lockfile/load.ts'
import { buildIdealFromStartingGraph } from './build-ideal-from-starting-graph.ts'
import { prefetchResolve } from './prefetch-resolve.ts'
import { isPathSecurityError } from '../path-security-error.ts'
import { gitPinned } from '../git-pin.ts'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadOptions as LoadActualOptions } from '../actual/load.ts'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
  Dependency,
} from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import { baseDepID, hydrate, splitDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest } from '@vltpkg/types'
import type { RollbackRemove } from '@vltpkg/rollback-remove'

const getMap = <T extends Map<any, any>>(m?: T) =>
  m ?? (new Map() as T)

export type BuildIdealOptions = LoadActualOptions & {
  /**
   * An actual graph
   */
  actual?: Graph
  /**
   * A `Map` in which keys are {@link DepID} linking to another `Map` in which
   * keys are the dependency names and values are {@link Dependency}. This
   * structure represents dependencies that need to be added to the importer
   * represented by {@link DepID}.
   */
  add?: AddImportersDependenciesMap
  /**
   * A `Map` object representing nodes to be removed from the ideal graph.
   * Each {@link DepID} key represents an importer node and the `Set` of
   * dependency names to be removed from its dependency list.
   */
  remove?: RemoveImportersDependenciesMap
  /**
   * A {@link RollbackRemove} instance to handle extraction rollbacks
   */
  remover: RollbackRemove
  /**
   * A {@link PackageInfoClient} instance to read manifest info from.
   */
  packageInfo: PackageInfoClient
}

/**
 * Validates that a file dependency node exists in the graph after
 * a successful graph build. This helps providing an actionable error
 * message in case the current working directory is a linked nested
 * folder that hasn't yet been added as a dependency to an importer
 * in the project.
 */
const validateFileDepNode = (graph: Graph, id: DepID) => {
  const [type, path] = splitDepID(id)
  if (type === 'file' && !graph.nodes.get(id)) {
    throw error(
      'The current working dir is not a dependency of this project',
      { path },
    )
  }
}

/**
 * Git rows locked to a ref, not a commit (older lockfiles): re-resolved
 * up front. One that resolves is dropped, and the build places it from
 * that manifest, pinned; one that can't (offline, ref gone) is kept.
 */
const repinGitRows = async (
  graph: Graph,
  packageInfo: PackageInfoClient,
  options: SpecOptions,
) => {
  const unpinned = [...graph.nodes.values()].filter(
    n => n.id.startsWith('git~') && !gitPinned(n),
  )
  const names = new Map(unpinned.map(n => [baseDepID(n.id), n.name]))
  const repin = new Map<DepID, Manifest>()
  await Promise.all(
    [...names].map(async ([base, name]) => {
      // hydrate() memoizes ignoring options
      const spec = Spec.parse(
        name,
        hydrate(base, name, options).bareSpec,
        options,
      )
      try {
        repin.set(
          base,
          (await packageInfo.manifest(spec)) as Manifest,
        )
      } catch (er) {
        if (isPathSecurityError(er)) throw er
        // eslint-disable-next-line no-console
        console.error(
          `warning: ${spec}: not locked to a commit, kept as is (${(er as Error).message})`,
        )
      }
    }),
  )
  // a kept row with no manifest (no node_modules) would be fetched
  // again by the rebuild: pin the others on a later install
  if (unpinned.some(n => !n.manifest && !repin.has(baseDepID(n.id))))
    return
  for (const node of unpinned) {
    if (!repin.has(baseDepID(node.id))) continue
    graph.removeNode(node, undefined, true)
    graph.lockfileStale = true
  }
  if (repin.size) graph.repin = repin
}

/**
 * Builds an ideal {@link Graph} representing the dependencies that
 * should be present in order to fulfill the requirements defined
 * by the `package.json` and `vlt-lock.json` files using either the
 * virtual or actual graph as a starting point. Also add / remove any
 * dependencies listed in the `add` and `remove` properties.
 */
export const build = async (
  options: BuildIdealOptions,
): Promise<Graph> => {
  const done = graphStep('build')

  // Creates the shared instances that are going to be used
  // in both the loader methods and the build graph
  const { packageInfo, packageJson, scurry, monorepo } = options
  const mainManifest =
    options.mainManifest ?? packageJson.read(options.projectRoot)
  let graph
  try {
    graph = loadVirtual({
      ...options,
      mainManifest,
      monorepo,
    })
  } catch (err) {
    // a path-safety verdict must not be silently rebuilt away
    if (isPathSecurityError(err)) throw err
    // Check if this is a lockfile version mismatch
    const cause = (
      err as Error & {
        cause?: { code?: string; found?: number; wanted?: number }
      }
    ).cause
    if (cause?.code === 'ELOCKFILEVERSION') {
      // If lockfile is from a different vlt version, hard fail
      if (
        typeof cause.found === 'number' &&
        typeof cause.wanted === 'number'
      ) {
        throw err
      }
      // TODO: add warning to CLI layer via @vltpkg/output when available
    }
    graph = loadActual({
      ...options,
      mainManifest,
      monorepo,
    })
  }

  // frozen: git rows locked to a ref are taken as they are
  if (!options.frozenLockfile && !options.expectLockfile) {
    await repinGitRows(graph, packageInfo, options)
  }

  // Start resolving the importers' dependencies server-side, one request
  // to the default registry. manifest() picks the answers up as they land,
  // and nothing reads them once the ideal graph is built.
  const releaseResolve = prefetchResolve(graph, packageInfo, options)

  let res
  try {
    res = await buildIdealFromStartingGraph({
      ...options,
      scurry,
      add: getMap(options.add),
      graph,
      packageInfo,
      remove: getMap(options.remove),
      actual: options.actual,
      rebuild: !!graph.repin,
    })
  } finally {
    releaseResolve()
  }
  done()

  // when adding or removing a new dependency from a file dep,
  // validate the receiver node was present in the graph
  if (options.add) {
    for (const [addKey, value] of options.add.entries()) {
      if (value.size) validateFileDepNode(res, addKey)
    }
  }
  if (options.remove) {
    for (const [removeKey, value] of options.remove.entries()) {
      if (value.size) validateFileDepNode(res, removeKey)
    }
  }

  return res
}
