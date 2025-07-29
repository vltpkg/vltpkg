import { load as actualLoad } from './actual/load.ts'
import { build as idealBuild } from './ideal/build.ts'
import { reify } from './reify/index.ts'
import { GraphModifier } from './modifiers.ts'
import { init } from '@vltpkg/init'
import { asError } from '@vltpkg/types'
import type { NormalizedManifest } from '@vltpkg/types'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadOptions } from './actual/load.ts'
import type { AddImportersDependenciesMap } from './dependencies.ts'

export type InstallOptions = LoadOptions & {
  packageInfo: PackageInfoClient
}

export const install = async (
  options: InstallOptions,
  add?: AddImportersDependenciesMap,
) => {
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
    modifiers: undefined, // modifiers should not be used here
  })
  const diff = await reify({
    ...options,
    add,
    actual: act,
    graph,
    loadManifests: true,
    modifiers,
  })

  return { graph, diff }
}
