import type { PackageInfoClient } from '@vltpkg/package-info'
import type { LoadOptions } from './actual/load.ts'
import { load as actualLoad } from './actual/load.ts'
import type { RemoveImportersDependenciesMap } from './dependencies.ts'
import { GraphModifier } from './modifiers.ts'
import { build as idealBuild } from './ideal/build.ts'
import { reify } from './reify/index.ts'
import { lockfile } from './index.ts'
import { updatePackageJson } from './reify/update-importers-package-json.ts'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

export type UninstallOptions = LoadOptions & {
  packageInfo: PackageInfoClient
  allowScripts: string
}

export const uninstall = async (
  options: UninstallOptions,
  remove?: RemoveImportersDependenciesMap,
) => {
  const mainManifest = options.packageJson.read(options.projectRoot)
  const modifiers = GraphModifier.maybeLoad(options)
  const remover = new RollbackRemove()

  try {
    const graph = await idealBuild({
      ...options,
      remove,
      mainManifest,
      loadManifests: true,
      remover,
    })
    const act = actualLoad({
      ...options,
      mainManifest,
      loadManifests: true,
    })

    // If lockfileOnly is enabled, skip reify and only save the lockfile
    if (options.lockfileOnly) {
      // Save only the main lockfile, skip all filesystem operations
      lockfile.save({ graph, modifiers })
      const saveImportersPackageJson =
        /* c8 ignore next */
        remove?.modifiedDependencies ?
          updatePackageJson({
            ...options,
            remove,
            graph,
          })
        : undefined
      saveImportersPackageJson?.()
      return { graph, diff: undefined }
    }

    const diff = await reify({
      ...options,
      remove,
      actual: act,
      graph,
      loadManifests: true,
      remover,
    })

    return { graph, diff }
    /* c8 ignore start */
  } catch (err) {
    await remover.rollback().catch(() => {})
    // Remove hidden lockfile on failure
    const hiddenLockfile = resolve(
      options.projectRoot,
      'node_modules/.vlt-lock.json',
    )
    if (existsSync(hiddenLockfile)) {
      rmSync(hiddenLockfile, { force: true })
    }
    throw err
  }
  /* c8 ignore stop */
}
