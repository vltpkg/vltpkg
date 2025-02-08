import {
  type RemoveImportersDependenciesMap,
  actual,
  ideal,
  reify,
} from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { type LoadedConfig } from './types.ts'

export type UninstallOptions = {
  conf: LoadedConfig
  remove?: RemoveImportersDependenciesMap
}

export const uninstall = async ({
  remove,
  conf,
}: UninstallOptions) => {
  const mainManifest = conf.options.packageJson.read(
    conf.options.projectRoot,
  )

  const graph = await ideal.build({
    ...conf.options,
    packageInfo: new PackageInfoClient(conf.options),
    remove,
    mainManifest,
    loadManifests: true,
  })
  const act = actual.load({
    ...conf.options,
    mainManifest,
    loadManifests: true,
  })
  await reify({
    ...conf.options,
    packageInfo: new PackageInfoClient(conf.options),
    remove,
    actual: act,
    graph,
    loadManifests: true,
  })
}
