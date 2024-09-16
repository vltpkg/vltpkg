import { PackageInfoClient } from '@vltpkg/package-info'
import { PackageJson } from '@vltpkg/package-json'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Monorepo } from '@vltpkg/workspaces'
import { PathScurry } from 'path-scurry'
import { load as loadActual, LoadOptions } from '../actual/load.js'
import { Diff } from '../diff.js'
import { Graph } from '../graph.js'
import { lockfile } from '../index.js'
import { addEdges } from './add-edges.js'
import { addNodes } from './add-nodes.js'
import { chmodBins } from './chmod-bins.js'
import { deleteEdges } from './delete-edges.js'
import { deleteNodes } from './delete-nodes.js'
import { lifecycleAdds } from './lifecycle-adds.js'
import { lifecycleImporters } from './lifecycle-importers.js'
import { rollback } from './rollback.js'

// - [ ] depid's with peer resolutions
// - [ ] ensure that failures for optional deps don't reify the dep,
// - [ ] do get removed from actual graph, but stay in main lockfile.
// - [ ] depid shortening

export type ReifyOptions = LoadOptions & {
  graph: Graph
  actual?: Graph
  packageInfo?: PackageInfoClient
}

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
      projectRoot,
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
  projectRoot: string,
  packageInfo: PackageInfoClient,
  diff: Diff,
  remover: RollbackRemove,
  scurry: PathScurry,
  packageJson: PackageJson,
) => {
  // XXX: almost certainly will need to throttle this
  const promises = addNodes(
    diff,
    scurry,
    remover,
    options,
    packageInfo,
  ).concat(deleteEdges(diff, scurry, remover))

  // need to wait, so that the nodes exist to link to
  if (promises.length) await Promise.all(promises)

  // create all node_modules symlinks, and link bins to nm/.bin
  const edgePromises = addEdges(diff, packageJson, scurry, remover)
  if (edgePromises.length) await Promise.all(edgePromises)

  await lifecycleAdds(diff, packageJson, projectRoot)
  await lifecycleImporters(diff, packageJson, projectRoot)

  const chmodPromises = chmodBins(diff, packageJson, scurry)
  if (chmodPromises.length) await Promise.all(chmodPromises)

  // save the lockfile
  lockfile.save(options)
  // TODO: save a hidden lockfile at node_modules/.vlt-lock.json,
  // because we've updated the actual tree.

  // TODO: update deps if anything was added/removed via argument

  // delete garbage from the store.
  const rmPromises = deleteNodes(diff, remover, scurry)
  if (rmPromises.length) await Promise.all(rmPromises)
}
