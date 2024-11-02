import { actual, ideal, reify } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { LoadedConfig } from '../config/index.js'
import { parseRemoveArgs } from '../parse-add-remove-args.js'
import { CliCommandOptions, CliCommand } from '../types.js'
import { commandUsage } from '../config/usage.js'

export const usage: CliCommand['usage'] = () =>
  commandUsage({
    command: 'uninstall',
    usage: '[package ...]',
    description:
      'Remove the named packages from the dependency graph',
  })

export const command = async (
  conf: LoadedConfig,
  options: CliCommandOptions,
) => {
  const monorepo = options.monorepo
  const { remove } = parseRemoveArgs(conf, monorepo)
  const mainManifest = conf.options.packageJson.read(
    conf.options.projectRoot,
  )

  const graph = await ideal.build({
    ...conf.options,
    packageInfo: new PackageInfoClient(conf.options),
    remove,
    mainManifest,
    monorepo,
    loadManifests: true,
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
    remove,
    actual: act,
    monorepo,
    graph,
    loadManifests: true,
  })
}
