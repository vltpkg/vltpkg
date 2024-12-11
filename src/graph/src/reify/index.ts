import { type PackageInfoClient } from '@vltpkg/package-info'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { availableParallelism } from 'node:os'
import { callLimit } from 'promise-call-limit'
import {
  load as loadActual,
  type LoadOptions,
} from '../actual/load.js'
import {
  type AddImportersDependenciesMap,
  type RemoveImportersDependenciesMap,
} from '../dependencies.js'
import { Diff } from '../diff.js'
import { type Graph } from '../graph.js'
import { lockfile } from '../index.js'
import {
  lockfileData,
  saveData,
  saveHidden,
} from '../lockfile/save.js'
import { addEdges } from './add-edges.js'
import { addNodes } from './add-nodes.js'
import { build } from './build.js'
import { deleteEdges } from './delete-edges.js'
import { deleteNodes } from './delete-nodes.js'
import { rollback } from './rollback.js'
import { updatePackageJson } from './update-importers-package-json.js'
import { graphStep } from '@vltpkg/output'

const limit = Math.max(availableParallelism() - 1, 1) * 8

// - [ ] depid's with peer resolutions
// - [ ] depid shortening

export type ReifyOptions = LoadOptions & {
  add?: AddImportersDependenciesMap
  remove?: RemoveImportersDependenciesMap
  graph: Graph
  actual?: Graph
  packageInfo: PackageInfoClient
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
}
