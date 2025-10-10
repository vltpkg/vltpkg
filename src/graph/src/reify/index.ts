import { graphStep } from '@vltpkg/output'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import { availableParallelism } from 'node:os'
import { callLimit } from 'promise-call-limit'
import type { DepID } from '@vltpkg/dep-id'
import type { LoadOptions } from '../actual/load.ts'
import { load as loadActual } from '../actual/load.ts'
import type {
  AddImportersDependenciesMap,
  RemoveImportersDependenciesMap,
} from '../dependencies.ts'
import { Diff } from '../diff.ts'
import type { Graph } from '../graph.ts'
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
import { checkNeededBuild } from './check-needed-build.ts'
import { deleteNodes } from './delete-nodes.ts'
import { internalHoist } from './internal-hoist.ts'
import { rollback } from './rollback.ts'
import { updatePackageJson } from './update-importers-package-json.ts'
import { copyFileSync } from 'node:fs'
import { Query } from '@vltpkg/query'
import { SecurityArchive } from '@vltpkg/security-archive'
import type { NodeLike } from '@vltpkg/types'
import { binChmodAll } from './bin-chmod.ts'

const limit = Math.max(availableParallelism() - 1, 1) * 8

/**
 * Filter nodes using a DSS query string
 */
const filterNodesByQuery = async (
  graph: Graph,
  allowScriptsQuery?: string,
): Promise<Set<DepID>> => {
  // shortcut no packages included
  if (
    allowScriptsQuery === ':not(*)' /* c8 ignore next */ ||
    !allowScriptsQuery
  ) {
    return new Set()
  }
  // shortcut all packages included
  if (allowScriptsQuery === '*') {
    return new Set(graph.nodes.keys())
  }
  /* c8 ignore start */
  const securityArchive =
    Query.hasSecuritySelectors(allowScriptsQuery) ?
      await SecurityArchive.start({
        nodes: [...graph.nodes.values()],
      })
    : undefined
  /* c8 ignore stop */

  const edges = graph.edges
  const nodes = new Set<NodeLike>(graph.nodes.values())
  const importers = graph.importers

  const query = new Query({
    edges,
    nodes,
    importers,
    securityArchive,
  })

  const { nodes: resultNodes } = await query.search(
    allowScriptsQuery,
    {
      signal: new AbortController().signal,
    },
  )

  return new Set(resultNodes.map(node => node.id))
}

// - [ ] depid's with peer resolutions
// - [ ] depid shortening

export type ReifyOptions = LoadOptions & {
  add?: AddImportersDependenciesMap
  allowScripts: string
  remove?: RemoveImportersDependenciesMap
  graph: Graph
  actual?: Graph
  packageInfo: PackageInfoClient
  modifiers?: GraphModifier
  remover: RollbackRemove
}

export type ReifyResult = {
  /**
   * The diff object that was used to reify the project.
   */
  diff: Diff
  /**
   * Optional queue of DepIDs that requires building (running lifecycle scripts
   * and binary linking) after the reification is complete.
   */
  buildQueue?: DepID[]
}

/**
 * Make the current project match the supplied graph.
 */
export const reify = async (
  options: ReifyOptions,
): Promise<ReifyResult> => {
  const done = graphStep('reify')

  const { graph, scurry, remover } = options

  const actual =
    options.actual ??
    loadActual({
      ...options,
      loadManifests: true,
    })

  const diff = new Diff(actual, graph)
  const skipOptionalOnly =
    !options.add?.modifiedDependencies && diff.optionalOnly
  const res: ReifyResult = { diff }
  if (!diff.hasChanges() || skipOptionalOnly) {
    // nothing to do, so just return the diff
    done()
    return res
  }

  let success = false
  try {
    const { buildQueue } = await reify_(options, diff, remover)
    remover.confirm()
    success = true
    res.buildQueue = buildQueue
  } finally {
    /* c8 ignore start */
    if (!success) {
      await rollback(remover, diff, scurry).catch(() => {})
    }
    /* c8 ignore stop */
  }

  done()

  return res
}

const reify_ = async (
  options: ReifyOptions,
  diff: Diff,
  remover: RollbackRemove,
): Promise<Omit<ReifyResult, 'diff'>> => {
  const res: Omit<ReifyResult, 'diff'> = {}
  const {
    add,
    remove,
    packageInfo,
    packageJson,
    scurry,
    allowScripts,
  } = options
  const saveImportersPackageJson =
    /* c8 ignore next */
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
    scurry,
    remover,
  )
  if (edgeActions.length) await Promise.all(edgeActions)

  await internalHoist(diff.to, options, remover)

  // looks up all nodes setting buildState = 'needed'
  // on nodes that require building
  checkNeededBuild({ diff })

  // Filter nodes allowed to run scripts if allowScripts query is provided
  const allowScriptsNodes = await filterNodesByQuery(
    diff.to,
    allowScripts,
  )

  // ensure that all added bins are chmod +x
  await binChmodAll(diff.nodes.add, scurry)

  // run install lifecycle scripts and link any binary files
  await build(diff, packageJson, scurry, allowScriptsNodes)

  // set the buildQueue on the result object containing
  // an array with all the ids of nodes that need building
  res.buildQueue = [...diff.nodes.add]
    .filter(node => node.buildState === 'needed')
    .map(node => node.id)

  // if we had to change the actual graph along the way,
  // make sure we do not leave behind any unreachable nodes
  // TODO: add tests to cover this
  /* c8 ignore start */
  if (diff.hadOptionalFailures) {
    for (const node of options.graph.gc().values()) {
      diff.nodes.add.delete(node)
      diff.nodes.delete.add(node)
    }
  }
  /* c8 ignore stop */
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

  // returns the result object
  return res
}
