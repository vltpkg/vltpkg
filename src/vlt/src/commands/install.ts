import { actual, ideal, reify } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { LoadedConfig } from '../config/index.js'
import { parseAddArgs } from '../parse-add-remove-args.js'
import { CliCommandOptions, CliCommand } from '../types.js'
import { commandUsage } from '../config/usage.js'

export const usage: CliCommand['usage'] = () =>
  commandUsage({
    command: 'install',
    usage: '[package ...]',
    description: `Install the specified package, updating dependencies appropriately`,
  })

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
