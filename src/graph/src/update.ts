import { load as actualLoad } from './actual/load.ts'
import { buildIdealFromStartingGraph } from './ideal/build-ideal-from-starting-graph.ts'
import { reify } from './reify/index.ts'
import { GraphModifier } from './modifiers.ts'
import { init } from '@vltpkg/init'
import { asError } from '@vltpkg/types'
import type { NormalizedManifest } from '@vltpkg/types'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadOptions } from './actual/load.ts'
import { Graph } from './graph.ts'

export type UpdateOptions = LoadOptions & {
  packageInfo: PackageInfoClient
}

export const update = async (options: UpdateOptions) => {
  let mainManifest: NormalizedManifest | undefined = undefined
  try {
    mainManifest = options.packageJson.read(options.projectRoot)
  } catch (err) {
    if (asError(err).message === 'Could not read package.json file') {
      await init({ cwd: options.projectRoot })
      mainManifest = options.packageJson.read(options.projectRoot, {
        reload: true,
      })
    } else {
      throw err
    }
  }

  const modifiers = GraphModifier.maybeLoad(options)

  const graph = await buildIdealFromStartingGraph({
    ...options,
    add: Object.assign(new Map(), { modifiedDependencies: false }),
    remove: Object.assign(new Map(), { modifiedDependencies: false }),
    graph: new Graph({ ...options, mainManifest }),
    modifiers,
  })

  const act = actualLoad({
    ...options,
    mainManifest,
    loadManifests: true,
  })

  const diff = await reify({
    ...options,
    actual: act,
    graph,
    loadManifests: true,
    modifiers,
  })

  return { graph, diff }
}
