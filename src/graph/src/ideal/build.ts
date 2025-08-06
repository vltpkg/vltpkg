import type { PackageInfoClient } from '@vltpkg/package-info'
import { load as loadActual } from '../actual/load.ts'
import type { LoadOptions as LoadActualOptions } from '../actual/load.ts'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
  Dependency,
} from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import { load as loadVirtual } from '../lockfile/load.ts'
import { buildIdealFromStartingGraph } from './build-ideal-from-starting-graph.ts'
import type { DepID } from '@vltpkg/dep-id'
import { graphStep } from '@vltpkg/output'

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
   * A {@link PackageInfoClient} instance to read manifest info from.
   */
  packageInfo: PackageInfoClient
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
      skipLoadingNodesOnModifiersChange: true,
    })
  } catch {
    graph = loadActual({
      ...options,
      mainManifest,
      monorepo,
      skipLoadingNodesOnModifiersChange: true,
    })
  }

  const res = await buildIdealFromStartingGraph({
    ...options,
    scurry,
    add: getMap(options.add),
    graph,
    packageInfo,
    remove: getMap(options.remove),
  })
  done()
  return res
}
