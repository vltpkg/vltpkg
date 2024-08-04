import { Graph } from '../graph.js'
import {
  LoadOptions as LoadActualOptions,
  load as loadActual,
} from '../actual/load.js'
import { load as loadVirtual } from '../lockfile/load.js'
import { buildIdealFromStartingGraph } from './build-ideal-from-starting-graph.js'
import {
  BuildIdealAddOptions,
  BuildIdealRemoveOptions,
} from './types.js'
import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import { Monorepo } from '@vltpkg/workspaces'

export type BuildIdealOptions = LoadActualOptions & {
  add?: BuildIdealAddOptions['add']
  remove?: BuildIdealRemoveOptions['remove']
  /**
   * A {@link PackageInfoClient} instance to read manifest info from.
   */
  packageInfo?: PackageInfoClient
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
  const packageJson = options.packageJson ?? new PackageJson()
  const mainManifest = packageJson.read(options.projectRoot)
  const scurry = options.scurry ?? new PathScurry(options.projectRoot)
  const monorepo =
    options.monorepo ??
    Monorepo.maybeLoad(options.projectRoot, { packageJson, scurry })
  const packageInfo =
    options.packageInfo ??
    new PackageInfoClient({ ...options, packageJson })
  const add = options.add ?? new Map()
  const remove = options.remove ?? new Map()

  let graph
  try {
    graph = loadVirtual({
      ...options,
      mainManifest,
      monorepo,
      packageJson,
      scurry,
    })
  } catch (err) {
    graph = loadActual({
      ...options,
      mainManifest,
      monorepo,
      packageJson,
      scurry,
    })
  }

  return buildIdealFromStartingGraph({
    ...options,
    add,
    graph,
    packageInfo,
    remove,
  })
}
