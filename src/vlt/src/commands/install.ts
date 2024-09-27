import { actual, ideal, reify } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { LoadedConfig } from '../config/index.js'
import { parseAddArgs } from '../parse-add-remove-args.js'
import { CliCommandOptions } from '../types.js'

export const usage = `vlt install [package ...]
Install the specified package, updating dependencies appropriately`

export const command = async (
  conf: LoadedConfig,
  options: CliCommandOptions,
) => {
  const monorepo = options.monorepo
  const { add } = parseAddArgs(conf, monorepo)
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
