import { actual, ideal, reify } from '@vltpkg/graph'
import type { AddImportersDependenciesMap } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadedConfig } from './types.ts'

export type InstallOptions = {
  conf: LoadedConfig
  add?: AddImportersDependenciesMap
}

export const install = async ({ add, conf }: InstallOptions) => {
  const mainManifest = conf.options.packageJson.read(
    conf.options.projectRoot,
  )

  const graph = await ideal.build({
    ...conf.options,
    add,
    mainManifest,
    loadManifests: true,
    packageInfo: new PackageInfoClient(conf.options),
  })
  const act = actual.load({
    ...conf.options,
    mainManifest,
    loadManifests: true,
  })
  await reify({
    ...conf.options,
    packageInfo: new PackageInfoClient(conf.options),
    add,
    actual: act,
    graph,
    loadManifests: true,
  })

  return { graph }
}
