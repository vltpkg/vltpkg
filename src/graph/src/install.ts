import type { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadOptions } from './actual/load.ts'
import { load as actualLoad } from './actual/load.ts'
import type { AddImportersDependenciesMap } from './dependencies.ts'
import { build as idealBuild } from './ideal/build.ts'
import { reify } from './reify/index.ts'
import { GraphModifier } from './modifiers.ts'

export type InstallOptions = LoadOptions & {
  packageInfo: PackageInfoClient
}

export const install = async (
  options: InstallOptions,
  add?: AddImportersDependenciesMap,
) => {
  const mainManifest = options.packageJson.read(options.projectRoot)
  const modifiers = GraphModifier.maybeLoad(options)

  const graph = await idealBuild({
    ...options,
    add,
    mainManifest,
    loadManifests: true,
    modifiers,
  })
  const act = actualLoad({
    ...options,
    mainManifest,
    loadManifests: true,
  })
  const diff = await reify({
    ...options,
    add,
    actual: act,
    graph,
    loadManifests: true,
  })

  return { graph, diff }
}
