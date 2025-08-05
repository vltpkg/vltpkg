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
import type {
  AddImportersDependenciesMap,
  Dependency,
} from './dependencies.ts'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type { DepID } from '@vltpkg/dep-id'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { load as loadVirtual } from './lockfile/load.ts'
import { getImporterSpecs } from './ideal/get-importer-specs.ts'
import { Monorepo } from '@vltpkg/workspaces'

export type InstallOptions = LoadOptions & {
  packageInfo: PackageInfoClient
  cleanInstall?: boolean // Only set by ci command for clean install
}

export const install = async (
  options: InstallOptions,
  add?: AddImportersDependenciesMap,
) => {
  // Check for lockfile when expect-lockfile or frozen-lockfile is set
  if (options.expectLockfile || options.frozenLockfile) {
    const lockfilePath = resolve(options.projectRoot, 'vlt-lock.json')
    if (!existsSync(lockfilePath)) {
      throw error(
        'vlt-lock.json file is required when using --expect-lockfile, --frozen-lockfile, or ci command',
        {
          path: lockfilePath,
        },
      )
    }
  }

  // Load manifest first to have it available for validation and later use
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

  // Additional validation for frozen-lockfile
  if (options.frozenLockfile) {
    // Prevent any modifications when frozen
    if (add && add.size > 0) {
      const dependencies: string[] = []
      for (const [, deps] of add) {
        for (const [name] of deps) {
          dependencies.push(name)
        }
      }
      throw error(
        'Cannot add dependencies when using --frozen-lockfile',
        { found: dependencies.join(', ') },
      )
    }

    // Load lockfile and check if it's synchronized
    const monorepo =
      options.monorepo ??
      Monorepo.maybeLoad(options.projectRoot, {
        packageJson: options.packageJson,
        scurry: options.scurry,
      })

    const lockfileGraph = loadVirtual({
      ...options,
      mainManifest,
      monorepo,
      skipLoadingNodesOnModifiersChange: false,
    })

    // Compare lockfile with package.json manifests
    const emptyAdd = Object.assign(
      new Map<DepID, Map<string, Dependency>>(),
      { modifiedDependencies: false },
    )
    const emptyRemove = Object.assign(new Map<DepID, Set<string>>(), {
      modifiedDependencies: false,
    })
    const importerSpecs = getImporterSpecs({
      graph: lockfileGraph,
      add: emptyAdd,
      remove: emptyRemove,
      ...options,
    })

    // Check for any modifications
    if (
      importerSpecs.add.modifiedDependencies ||
      importerSpecs.remove.modifiedDependencies
    ) {
      // Collect details about what's out of sync
      const details: string[] = []

      for (const [importerId, deps] of importerSpecs.add) {
        if (deps.size > 0) {
          const node = lockfileGraph.nodes.get(importerId)
          const location = node?.location || importerId
          const depNames = Array.from(deps.keys())
          details.push(
            `  ${location}: ${deps.size} dependencies to add (${depNames.join(', ')})`,
          )
        }
      }

      for (const [importerId, deps] of importerSpecs.remove) {
        if (deps.size > 0) {
          const node = lockfileGraph.nodes.get(importerId)
          const location = node?.location || importerId
          const depNames = Array.from(deps)
          details.push(
            `  ${location}: ${deps.size} dependencies to remove (${depNames.join(', ')})`,
          )
        }
      }

      const lockfilePath = resolve(
        options.projectRoot,
        'vlt-lock.json',
      )
      throw error(
        'Lockfile is out of sync with package.json. Run "vlt install" to update.\n' +
          details.join('\n'),
        {
          path: lockfilePath,
        },
      )
    }
  }

  // Delete node_modules directory for clean install (only for ci command)
  const remover = new RollbackRemove()
  if (options.cleanInstall) {
    const nodeModulesPath = resolve(
      options.projectRoot,
      'node_modules',
    )
    if (existsSync(nodeModulesPath)) {
      await remover.rm(nodeModulesPath)
      remover.confirm()
    }
  }

  try {
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
  } catch (err) {
    await remover.rollback()
    throw err
  }
}
