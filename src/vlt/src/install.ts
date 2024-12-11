import {
  type AddImportersDependenciesMap,
  type RemoveImportersDependenciesMap,
  actual,
  ideal,
  reify,
} from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { type LoadedConfig } from './types.js'

export type InstallOptions = {
  conf: LoadedConfig
  add?: AddImportersDependenciesMap
  remove?: RemoveImportersDependenciesMap
}

export const install = async ({ add, conf }: InstallOptions) => {
  const monorepo = conf.options.monorepo
  const mainManifest = conf.options.packageJson.read(
    conf.options.projectRoot,
  )

  const graph = await ideal.build({
    ...conf.options,
    add,
    mainManifest,
    monorepo,
    loadManifests: true,
    packageInfo: new PackageInfoClient(conf.options),
  })
  const act = actual.load({
    ...conf.options,
    mainManifest,
    monorepo,
    loadManifests: true,
  })
  await reify({
    ...conf.options,
    packageInfo: new PackageInfoClient(conf.options),
    add,
    actual: act,
    monorepo,
    graph,
    loadManifests: true,
  })
}
