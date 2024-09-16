import { actual, ideal, reify } from '@vltpkg/graph'
import { PackageJson } from '@vltpkg/package-json'
import { PathScurry } from 'path-scurry'
import { parseRemoveArgs } from '../parse-add-remove-args.js'
import { LoadedConfig } from '../config/index.js'
import { CliCommandOptions } from '../types.js'

export const usage = `vlt uninstall [package ...]
Remove the named packages from the dependency graph`

export const command = async (
  conf: LoadedConfig,
  options: CliCommandOptions,
) => {
  const { projectRoot } = conf.options
  const monorepo = options.monorepo
  const packageJson = options.packageJson ?? new PackageJson()
  const scurry = options.scurry ?? new PathScurry(projectRoot)
  const { remove } = parseRemoveArgs(conf, monorepo)
  const mainManifest = packageJson.read(projectRoot)

  const graph = await ideal.build({
    ...conf.options,
    remove,
    packageJson,
    projectRoot,
    mainManifest,
    monorepo,
    scurry,
    loadManifests: true,
  })
  const act = actual.load({
    ...conf.options,
    packageJson,
    projectRoot,
    mainManifest,
    monorepo,
    scurry,
    loadManifests: true,
  })
  await reify({
    ...conf.options,
    remove,
    actual: act,
    packageJson,
    projectRoot,
    monorepo,
    scurry,
    graph,
    loadManifests: true,
  })
}
