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
} from './dependencies.ts'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import type { DepID } from '@vltpkg/dep-id'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { graphStep } from '@vltpkg/output'
import {
  isUnfilteredInstall,
  removeHiddenLockfile,
  removeInstallState,
  saveInstallState,
  unchangedInstallState,
} from './install-state.ts'
import type { Diff } from './diff.ts'
import { load as loadVirtual, loadData } from './lockfile/load.ts'
import { formatOptionsChange } from './lockfile/format-options-change.ts'
import type { SpecCache } from './lockfile/types.ts'
import { getImporterSpecs } from './ideal/get-importer-specs.ts'
import { lockfile } from './index.ts'
import type { Graph } from './index.ts'
import { updatePackageJson } from './reify/update-importers-package-json.ts'
import { Monorepo } from '@vltpkg/workspaces'

export type InstallOptions = LoadOptions & {
  packageInfo: PackageInfoClient
  cleanInstall?: boolean // Only set by ci command for clean install
  allowScripts: string
  saveExact?: boolean
  savePrefix?: string
}

export type InstallResult = {
  /**
   * The resulting graph structure at the end of an install. Absent when
   * the install short-circuited because there was nothing to do, since
   * then no graph was ever loaded.
   */
  graph?: Graph
  /**
   * The diff between the actual and ideal graphs, if one was computed.
   */
  diff?: Diff
  /**
   * Nodes that still need building (lifecycle scripts, bin linking).
   */
  buildQueue?: DepID[]
  /**
   * Number of nodes in the installed graph. Set when there is no `graph`
   * to count, so that reporting still has the number.
   */
  nodeCount?: number
}

export const install = async (
  options: InstallOptions,
  add?: AddImportersDependenciesMap,
): Promise<InstallResult> => {
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

  // Load an unfiltered monorepo to ensure all workspace importers are
  // included in the graph. This is necessary because the options.monorepo
  // may be filtered by -w/--workspace flags, which would cause nodes/edges
  // from other workspaces to be lost during graph construction.
  const fullMonorepo = Monorepo.maybeLoad(options.projectRoot, {
    packageJson: options.packageJson,
    scurry: options.scurry,
  })

  const specCache: SpecCache = new Map()
  const lockfileData =
    options.frozenLockfile ? loadData(options.projectRoot) : undefined
  // loaded before the frozen check so that the lockfile options compare
  // against a config that includes them, and so that the check knows
  // which dependency specs the modifiers govern
  const modifiers = GraphModifier.maybeLoad(options)

  // Not just the `modifiedDependencies` flag: an embedder can hand us a
  // populated add map without it, and adding a dependency must never take
  // the fast path.
  const hasAdds =
    !!add &&
    (add.modifiedDependencies ||
      [...add.values()].some(deps => deps.size > 0))

  // A `-w`/`--workspace` filtered install only targets a subset of the
  // project, so it neither takes the fast path nor gets to claim that the
  // whole tree is in sync afterwards.
  const unfiltered = isUnfilteredInstall(
    options.monorepo,
    fullMonorepo,
  )
  const installStateOptions = {
    ...options,
    modifiers,
    monorepo: fullMonorepo,
  }

  // Nothing-to-do fast path. An install that left the tree in sync
  // recorded a fingerprint of everything cheap to read that could
  // invalidate it; while that still matches, loading the actual graph off
  // the filesystem and rebuilding the ideal graph can only conclude that
  // there is nothing to change, so skip both.
  //
  // Deliberately excluded:
  // - an add, which has a package.json to write either way
  // - `--lockfile-only`, which writes the lockfile without a node_modules
  // - `ci` / `--clean-install`, which must delete and rebuild the tree
  // - `--frozen-lockfile` / `--expect-lockfile`, whose validation has its
  //   own error messages and must still run
  if (
    unfiltered &&
    !hasAdds &&
    !options.lockfileOnly &&
    !options.cleanInstall &&
    !options.frozenLockfile &&
    !options.expectLockfile
  ) {
    const state = unchangedInstallState(installStateOptions)
    if (state) {
      // walk the reporter through the steps a regular no-op install
      // takes, so that the human view looks the same as it always did
      graphStep('build')()
      graphStep('actual')()
      graphStep('reify')()
      return {
        buildQueue: state.buildQueue,
        nodeCount: state.nodeCount,
      }
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
      modifiers,
      monorepo: fullMonorepo,
      specCache,
      lockfileData,
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
      modifiers,
    })

    // Check for spec changes by comparing package.json specs with lockfile edges
    const specChanges: string[] = []
    for (const importer of lockfileGraph.importers) {
      const deps = getDependencies(importer, options)
      for (const [depName, dep] of deps) {
        // the edge text of a governed dependency is the modifier value,
        // never the manifest range; a change to it is an options change
        if (modifiers?.targetsImporterEdge(importer, dep.spec))
          continue
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
      specChanges.length > 0 ||
      lockfileGraph.optionsChanged
    ) {
      const details: string[] = []

      if (lockfileGraph.optionsChanged) {
        details.push('  Configuration options have changed:')
        for (const change of lockfileGraph.optionsChanges) {
          details.push(`    ${formatOptionsChange(change)}`)
        }
      }

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
    })
    let act: Graph | undefined = actualLoad({
      ...options,
      mainManifest,
      loadManifests: true,
      modifiers: undefined, // modifiers should not be used here
      monorepo: fullMonorepo,
      specCache,
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
      monorepo: fullMonorepo,
      specCache,
      lockfileData,
    })

    // If lockfileOnly is enabled, skip reify and only save the lockfile
    if (options.lockfileOnly) {
      // Save only the main lockfile, skip all filesystem operations.
      // Spread `options` so that spec-level config (registry,
      // scoped-registries, git-hosts, catalogs, etc.) round-trips
      // through the lockfile - otherwise subsequent installs lose
      // the configured registry and rewrite node/edge DepIDs back
      // to the default npm registry. (See vltpkg/vltpkg#1580.)
      // normalise importer edge specs before saving, so the lockfile
      // carries the same value package.json gets
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
      lockfile.save({ ...options, graph, modifiers })
      saveImportersPackageJson?.()
      // the lockfile may now describe a tree that node_modules does not,
      // so nothing recorded before this can be trusted
      removeInstallState(options.projectRoot)
      // nothing is extracted or moved on this path, so nothing should be
      // parked; confirm anyway so an early return can never leave
      // `.VLT.DELETE.*` behind
      remover.confirm()
      return { graph, diff: undefined }
    }

    const { diff, buildQueue, pendingBuilds } = await reify({
      ...options,
      add,
      actual: act,
      graph,
      loadManifests: true,
      modifiers,
      remove,
      remover,
    })

    // reify has written everything it is going to write, and the tree now
    // matches the project: record that, so the next install can skip all
    // of the above. The build queue recorded is every node still needing
    // one, which is what an install with nothing to do reports.
    if (unfiltered) {
      saveInstallState(
        { ...installStateOptions, graph },
        pendingBuilds,
      )
    }

    return { buildQueue, graph, diff }
  } catch (err) {
    /* c8 ignore next */
    await remover.rollback().catch(() => {})
    // Remove hidden lockfile and the recorded install state on failure
    removeHiddenLockfile(options.projectRoot)
    throw err
  }
}
