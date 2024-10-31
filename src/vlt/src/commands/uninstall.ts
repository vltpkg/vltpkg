import { actual, ideal, reify } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { parseRemoveArgs } from '../parse-add-remove-args.js'
import { type CliCommandFn, type CliCommandUsage } from '../types.js'
import { commandUsage } from '../config/usage.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'uninstall',
    usage: '[package ...]',
    description: `The opposite of \`vlt install\`. Removes deps and updates
                  vlt-lock.json and package.json appropriately.`,
  })

export const command: CliCommandFn = async conf => {
  const monorepo = conf.options.monorepo
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
