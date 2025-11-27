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
import { getDependencies } from './dependencies.ts'
import type {
  AddImportersDependenciesMap,
  Dependency,
  RemoveImportersDependenciesMap,
} from './dependencies.ts'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type { DepID } from '@vltpkg/dep-id'
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { load as loadVirtual } from './lockfile/load.ts'
import { getImporterSpecs } from './ideal/get-importer-specs.ts'
import { lockfile } from './index.ts'
import type { Graph } from './index.ts'
import { updatePackageJson } from './reify/update-importers-package-json.ts'

export type InstallOptions = LoadOptions & {
  packageInfo: PackageInfoClient
  cleanInstall?: boolean // Only set by ci command for clean install
  allowScripts: string
}

export const install = async (
  options: InstallOptions,
  add?: AddImportersDependenciesMap,
) => {
  // Validate incompatible options
  if (options.lockfileOnly && options.cleanInstall) {
    throw error(
      'Cannot use --lockfile-only with --clean-install (ci command). Clean install requires filesystem operations.',
    )
  }

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

  if (options.frozenLockfile) {
    // validates no add/remove operations are requested
    if (add?.modifiedDependencies) {
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

    const lockfileGraph = loadVirtual({
      ...options,
      mainManifest,
    })

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

    // Check for spec changes by comparing package.json specs with lockfile edges
    const specChanges: string[] = []
    for (const importer of lockfileGraph.importers) {
      const deps = getDependencies(importer, options)
      for (const [depName, dep] of deps) {
        const edge = importer.edgesOut.get(depName)
        if (edge?.spec) {
          if (edge.spec.toString() !== dep.spec.toString()) {
            const node = lockfileGraph.nodes.get(importer.id)
            /* c8 ignore next */
            const location = node?.location || importer.id
            specChanges.push(
              `  ${location}: ${depName} spec changed from "${edge.spec}" to "${dep.spec}"`,
            )
          }
        }
      }
    }

    if (
      importerSpecs.add.modifiedDependencies ||
      importerSpecs.remove.modifiedDependencies ||
      specChanges.length > 0
    ) {
      const details: string[] = []

      if (specChanges.length > 0) {
        details.push(...specChanges)
      }

      for (const [importerId, deps] of importerSpecs.add) {
        if (deps.size > 0) {
          const node = lockfileGraph.nodes.get(importerId)
          const location = node?.location || importerId
          const depNames = Array.from(deps.keys())
          const depLabelAdd =
            deps.size === 1 ? 'dependency' : 'dependencies'
          details.push(
            `  ${location}: ${deps.size} ${depLabelAdd} to add (${depNames.join(', ')})`,
          )
        }
      }

      for (const [importerId, deps] of importerSpecs.remove) {
        if (deps.size > 0) {
          const node = lockfileGraph.nodes.get(importerId)
          const location = node?.location || importerId
          const depNames = Array.from(deps)
          const depLabelRemove =
            deps.size === 1 ?
              'dependency'
            : /* c8 ignore next */ 'dependencies'
          details.push(
            `  ${location}: ${deps.size} ${depLabelRemove} to remove (${depNames.join(', ')})`,
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
    const remove = Object.assign(new Map<DepID, Set<string>>(), {
      modifiedDependencies: false,
    }) as RemoveImportersDependenciesMap
    const modifiers = GraphModifier.maybeLoad(options)

    let act: Graph | undefined = actualLoad({
      ...options,
      mainManifest,
      loadManifests: true,
      modifiers: undefined, // modifiers should not be used here
    })
    // if the actual graph has no dependencies, it's simpler to ignore it
    // this allows us to check for its availability later on for properly
    // handling situations like resetting edges for refreshing the ideal graph
    if (act.importers.size === act.nodes.size) {
      act = undefined
    }
    const graph = await idealBuild({
      ...options,
      actual: act,
      add,
      mainManifest,
      loadManifests: true,
      modifiers,
      remove,
      remover,
    })

    // If lockfileOnly is enabled, skip reify and only save the lockfile
    if (options.lockfileOnly) {
      // Save only the main lockfile, skip all filesystem operations
      lockfile.save({ graph, modifiers })
      const saveImportersPackageJson =
        /* c8 ignore next */
        add?.modifiedDependencies || remove.modifiedDependencies ?
          updatePackageJson({
            ...options,
            add,
            graph,
            remove,
          })
        : undefined
      saveImportersPackageJson?.()
      return { graph, diff: undefined }
    }

    const { diff, buildQueue } = await reify({
      ...options,
      add,
      actual: act,
      graph,
      loadManifests: true,
      modifiers,
      remove,
      remover,
    })

    return { buildQueue, graph, diff }
  } catch (err) {
    /* c8 ignore next */
    await remover.rollback().catch(() => {})
    // Remove hidden lockfile on failure
    try {
      const hiddenLockfile = resolve(
        options.projectRoot,
        'node_modules/.vlt-lock.json',
      )
      if (existsSync(hiddenLockfile)) {
        rmSync(hiddenLockfile, { force: true })
      }
    } catch {}
    throw err
  }
}
