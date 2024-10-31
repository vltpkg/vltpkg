import { actual, ideal, reify } from '@vltpkg/graph'
import { PackageInfoClient } from '@vltpkg/package-info'
import { parseAddArgs } from '../parse-add-remove-args.js'
import { type CliCommandUsage, type CliCommandFn } from '../types.js'
import { commandUsage } from '../config/usage.js'

export const usage: CliCommandUsage = () =>
  commandUsage({
    command: 'install',
    usage: '[packages ...]',
    description: `Install the specified packages, updating package.json and
                  vlt-lock.json appropriately.`,
  })

export const command: CliCommandFn = async conf => {
  const monorepo = conf.options.monorepo
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
