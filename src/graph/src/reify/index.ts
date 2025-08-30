import { graphStep } from '@vltpkg/output'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { availableParallelism } from 'node:os'
import { callLimit } from 'promise-call-limit'
import type { LoadOptions } from '../actual/load.ts'
import { load as loadActual } from '../actual/load.ts'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../dependencies.ts'
import { Diff } from '../diff.ts'
import type { Graph } from '../graph.ts'
import { lockfile } from '../index.ts'
import type { GraphModifier } from '../modifiers.ts'
import {
  lockfileData,
  saveData,
  saveHidden,
} from '../lockfile/save.ts'
import { addEdges } from './add-edges.ts'
import { addNodes } from './add-nodes.ts'
import { build } from './build.ts'
import { deleteEdges } from './delete-edges.ts'
import { deleteNodes } from './delete-nodes.ts'
import { internalHoist } from './internal-hoist.ts'
import { rollback } from './rollback.ts'
import { updatePackageJson } from './update-importers-package-json.ts'
import { copyFileSync } from 'node:fs'

const limit = Math.max(availableParallelism() - 1, 1) * 8

// - [ ] depid's with peer resolutions
// - [ ] depid shortening

export type ReifyOptions = LoadOptions & {
  add?: AddImportersDependenciesMap
  remove?: RemoveImportersDependenciesMap
  graph: Graph
  actual?: Graph
  packageInfo: PackageInfoClient
  modifiers?: GraphModifier
}

/**
 * Make the current project match the supplied graph.
 */
export const reify = async (options: ReifyOptions) => {
  const done = graphStep('reify')

  const { graph, scurry } = options

  const actual =
    options.actual ??
    loadActual({
      ...options,
      loadManifests: true,
    })

  const diff = new Diff(actual, graph)
  const skipOptionalOnly =
    options.add?.modifiedDependencies && diff.optionalOnly()
  if (!diff.hasChanges() || skipOptionalOnly) {
    // nothing to do, so just return the diff
    done()
    return diff
  }

  const remover = new RollbackRemove()
  let success = false
  try {
    await reify_(options, diff, remover)
    remover.confirm()
    success = true
  } finally {
    /* c8 ignore start */
    if (!success) {
      await rollback(remover, diff, scurry).catch(() => {})
    }
    /* c8 ignore stop */
  }

  done()

  return diff
}

const reify_ = async (
  options: ReifyOptions,
  diff: Diff,
  remover: RollbackRemove,
) => {
  const { add, remove, packageInfo, packageJson, scurry } = options
  const saveImportersPackageJson =
    add?.modifiedDependencies || remove?.modifiedDependencies ?
      updatePackageJson({
        add,
        remove,
        graph: options.graph,
        packageJson,
      })
    : undefined

  // before anything else happens, grab the ideal tree as it was resolved
  // so that we can store it in the lockfile. We do this here so that
  // any failed/removed optional deps are not reflected in the lockfile
  // data as it is saved.
  const lfData = lockfileData(options)
  const actions: (() => Promise<unknown>)[] = addNodes(
    diff,
    scurry,
    remover,
    options,
    packageInfo,
  ).concat(deleteEdges(diff, scurry, remover))

  // need to wait, so that the nodes exist to link to
  if (actions.length) await callLimit(actions, { limit })

  // create all node_modules symlinks, and link bins to nm/.bin
  const edgeActions: Promise<unknown>[] = addEdges(
    diff,
    packageJson,
    scurry,
    remover,
  )
  if (edgeActions.length) await Promise.all(edgeActions)

  await internalHoist(diff.to, options, remover)

  // run lifecycles and chmod bins
  await build(diff, packageJson, scurry)

  // save the lockfile
  lockfile.save(options)

  // if we had to change the actual graph along the way,
  // make sure we do not leave behind any unreachable nodes
  if (diff.hadOptionalFailures) {
    for (const node of options.graph.gc().values()) {
      diff.nodes.add.delete(node)
      diff.nodes.delete.add(node)
    }
  }
  saveHidden(options)

  // delete garbage from the store.
  const rmActions: Promise<unknown>[] = deleteNodes(
    diff,
    remover,
    scurry,
  )
  if (rmActions.length) await Promise.all(rmActions)

  // updates package.json files if anything was added / removed
  saveImportersPackageJson?.()

  // write the ideal graph data to the lockfile
  saveData(lfData, scurry.resolve('vlt-lock.json'), false)

  // update the store config reference if a config file was used
  if (scurry.lstatSync('vlt.json')) {
    copyFileSync(
      scurry.resolve('vlt.json'),
      scurry.resolve('node_modules/.vlt/vlt.json'),
    )
  }
}
