import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Monorepo } from '@vltpkg/workspaces'
import { availableParallelism } from 'node:os'
import { PathScurry } from 'path-scurry'
import { updatePackageJson } from './update-importers-package-json.js'
import { callLimit } from 'promise-call-limit'
import { load as loadActual, LoadOptions } from '../actual/load.js'
import { Diff } from '../diff.js'
import { Graph } from '../graph.js'
import {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../dependencies.js'
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

const limit = Math.max(availableParallelism() - 1, 1) * 8

// - [ ] depid's with peer resolutions
// - [ ] ensure that failures for optional deps don't reify the dep,
// - [ ] do get removed from actual graph, but stay in main lockfile.
// - [ ] depid shortening

export type ReifyOptions = LoadOptions & {
  add?: AddImportersDependenciesMap
  remove?: RemoveImportersDependenciesMap
  graph: Graph
  actual?: Graph
  packageInfo?: PackageInfoClient
}

// const start = performance.now()

/**
 * Make the current project match the supplied graph.
 */
export const reify = async (options: ReifyOptions) => {
  const {
    projectRoot,
    graph,
    scurry = new PathScurry(projectRoot),
    packageJson = new PackageJson(),
    monorepo = Monorepo.maybeLoad(projectRoot, options),
  } = options

  /* c8 ignore start - have to override in tests to use mocks */
  const packageInfo =
    options.packageInfo ??
    new PackageInfoClient({
      ...options,
      monorepo,
      packageJson,
    })
  /* c8 ignore stop */

  const actual =
    options.actual ??
    loadActual({
      ...options,
      loadManifests: true,
      scurry,
      packageJson,
      monorepo,
    })

  const diff = new Diff(actual, graph)
  const remover = new RollbackRemove()
  let success = false
  try {
    await reify_(
      options,
      packageInfo,
      diff,
      remover,
      scurry,
      packageJson,
    )
    remover.confirm()
    success = true
  } finally {
    if (!success) {
      /* c8 ignore next */
      await rollback(remover, diff, scurry).catch(() => {})
    }
  }
}

const reify_ = async (
  options: ReifyOptions,
  packageInfo: PackageInfoClient,
  diff: Diff,
  remover: RollbackRemove,
  scurry: PathScurry,
  packageJson: PackageJson,
) => {
  const saveImportersPackageJson = updatePackageJson({
    add: options.add,
    remove: options.remove,
    graph: options.graph,
    packageJson,
  })

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
  saveImportersPackageJson()

  // write the ideal graph data to the lockfile
  saveData(lfData, scurry.resolve('vlt-lock.json'), false)
}
