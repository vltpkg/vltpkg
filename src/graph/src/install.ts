import { load as actualLoad } from './actual/load.ts'
import { build as idealBuild } from './ideal/build.ts'
import { reify } from './reify/index.ts'
import { GraphModifier } from './modifiers.ts'
import { init } from '@vltpkg/init'
import { error } from '@vltpkg/error-cause'
import type { NormalizedManifest } from '@vltpkg/types'
import { asError } from '@vltpkg/types'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadOptions } from './actual/load.ts'
import type { AddImportersDependenciesMap } from './dependencies.ts'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export type InstallOptions = LoadOptions & {
  packageInfo: PackageInfoClient
}

export const install = async (
  options: InstallOptions,
  add?: AddImportersDependenciesMap,
) => {
  // Handle expect-lockfile option (ci behavior)
  if (options.expectLockfile) {
    const lockfilePath = resolve(options.projectRoot, 'vlt-lock.json')
    if (!existsSync(lockfilePath)) {
      throw error(
        'vlt-lock.json file is required when using --expect-lockfile or ci command',
        {
          path: lockfilePath,
        },
      )
    }

    // Delete node_modules directory for clean install (like npm ci)
    const nodeModulesPath = resolve(
      options.projectRoot,
      'node_modules',
    )
    if (existsSync(nodeModulesPath)) {
      const remover = new RollbackRemove()
      await remover.rm(nodeModulesPath)
      remover.confirm()
    }
  }

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

  const act = actualLoad({
    ...options,
    mainManifest,
    loadManifests: true,
    modifiers: undefined, // modifiers should not be used here
  })
  const graph = await idealBuild({
    ...options,
    actual: act,
    add,
    mainManifest,
    loadManifests: true,
    modifiers,
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
