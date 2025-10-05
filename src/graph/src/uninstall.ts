import type { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadOptions } from './actual/load.ts'
import { load as actualLoad } from './actual/load.ts'
import type { RemoveImportersDependenciesMap } from './dependencies.ts'
import { GraphModifier } from './modifiers.ts'
import { build as idealBuild } from './ideal/build.ts'
import { reify } from './reify/index.ts'
import { lockfile } from './index.ts'
import { updatePackageJson } from './reify/update-importers-package-json.ts'

export type UninstallOptions = LoadOptions & {
  packageInfo: PackageInfoClient
  allowScripts: string
}

export const uninstall = async (
  options: UninstallOptions,
  remove?: RemoveImportersDependenciesMap,
) => {
  const mainManifest = options.packageJson.read(options.projectRoot)
  const modifiers = GraphModifier.maybeLoad(options)

  const graph = await idealBuild({
    ...options,
    remove,
    mainManifest,
    loadManifests: true,
  })
  const act = actualLoad({
    ...options,
    mainManifest,
    loadManifests: true,
  })

  // If lockfileOnly is enabled, skip reify and only save the lockfile
  if (options.lockfileOnly) {
    // Save only the main lockfile, skip all filesystem operations
    lockfile.save({ graph, modifiers })
    const saveImportersPackageJson =
      /* c8 ignore next */
      remove?.modifiedDependencies ?
        updatePackageJson({
          ...options,
          remove,
          graph,
        })
      : undefined
    saveImportersPackageJson?.()
    return { graph, diff: undefined }
  }

  const diff = await reify({
    ...options,
    remove,
    actual: act,
    graph,
    loadManifests: true,
  })

  return { graph, diff }
}
