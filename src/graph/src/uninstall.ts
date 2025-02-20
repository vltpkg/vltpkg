import type { PackageInfoClientOptions } from '@vltpkg/package-info'
import { PackageInfoClient } from '@vltpkg/package-info'
import type { PackageJson } from '@vltpkg/package-json'
import type { LoadOptions } from './actual/load.ts'
import { load as actualLoad } from './actual/load.ts'
import type { RemoveImportersDependenciesMap } from './dependencies.ts'
import { build as idealBuild } from './ideal/build.ts'
import { reify } from './reify/index.ts'

export type UninstallOptions = PackageInfoClientOptions &
  LoadOptions & {
    projectRoot: string
    packageJson: PackageJson
  }

export const uninstall = async (
  options: UninstallOptions,
  remove?: RemoveImportersDependenciesMap,
) => {
  const mainManifest = options.packageJson.read(options.projectRoot)

  const graph = await idealBuild({
    ...options,
    packageInfo: new PackageInfoClient(options),
    remove,
    mainManifest,
    loadManifests: true,
  })
  const act = actualLoad({
    ...options,
    mainManifest,
    loadManifests: true,
  })
  const diff = await reify({
    ...options,
    packageInfo: new PackageInfoClient(options),
    remove,
    actual: act,
    graph,
    loadManifests: true,
  })

  return { graph, diff }
}
