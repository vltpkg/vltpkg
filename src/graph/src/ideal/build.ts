import { PackageInfoClient } from '@vltpkg/package-info'
import {
  load as loadActual,
  LoadOptions as LoadActualOptions,
} from '../actual/load.js'
import {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../dependencies.js'
import { Graph } from '../graph.js'
import { load as loadVirtual } from '../lockfile/load.js'
import { buildIdealFromStartingGraph } from './build-ideal-from-starting-graph.js'

export type BuildIdealOptions = LoadActualOptions & {
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
  // Creates the shared instances that are going to be used
  // in both the loader methods and the build graph
  const { packageInfo, packageJson, scurry, monorepo } = options
  const mainManifest =
    options.mainManifest ?? packageJson.read(options.projectRoot)
  const add = options.add ?? new Map()
  const remove = options.remove ?? new Map()

  let graph
  try {
    graph = loadVirtual({
      ...options,
      mainManifest,
      monorepo,
    })
  } catch {
    graph = loadActual({
      ...options,
      mainManifest,
      monorepo,
    })
  }

  return buildIdealFromStartingGraph({
    ...options,
    scurry,
    add,
    graph,
    packageInfo,
    remove,
  })
}
