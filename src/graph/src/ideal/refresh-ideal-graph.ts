import { appendNodes } from './append-nodes.ts'
import {
  compareByHasPeerDeps,
  getNodeOrderedDependencies,
} from './sorting.ts'
import type { PathScurry } from 'path-scurry'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type {
  BuildIdealAddOptions,
  BuildIdealFromGraphOptions,
  BuildIdealRemoveOptions,
  TransientAddMap,
  TransientRemoveMap,
} from './types.ts'
import type { Dependency } from '../dependencies.ts'
import type { GraphModifier } from '../modifiers.ts'
import type { ExtractResult } from '../reify/extract-node.ts'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'

export type RefreshIdealGraphOptions = BuildIdealAddOptions &
  BuildIdealRemoveOptions &
  BuildIdealFromGraphOptions &
  SpecOptions & {
    /**
     * The graph modifiers helper object.
     */
    modifiers?: GraphModifier
    /**
     * A {@link PathScurry} instance based on the `projectRoot` path
     */
    scurry: PathScurry

    /**
     * A {@link PackageInfoClient} instance to read manifest info from.
     */
    packageInfo: PackageInfoClient

    /**
     * The actual graph to compare against for early extraction
     */
    actual?: Graph

    /**
     * A {@link RollbackRemove} instance to handle extraction rollbacks
     */
    remover: RollbackRemove

    /**
     * Dependencies to be added to non-importer nodes when they are placed.
     * Used for nested folder dependencies that are not importers.
     */
    transientAdd?: TransientAddMap

    /**
     * Dependencies to be removed from non-importer nodes when they are placed.
     * Used for nested folder dependencies that are not importers.
     */
    transientRemove?: TransientRemoveMap
  }

/**
 * Returns an ordered list of importer nodes.
 */
const getOrderedImporters = (graph: Graph): Node[] => {
  const orderedImporters = [...graph.importers].sort((a, b) => {
    // mainImporter always comes first
    /* c8 ignore next */
    if (a === graph.mainImporter) return -1
    if (b === graph.mainImporter) return 1

    return compareByHasPeerDeps(
      { manifest: a.manifest },
      { manifest: b.manifest },
    )
  })
  return orderedImporters
}

/**
 * Rebuilds the provided ideal graph.
 */
export const refreshIdealGraph = async ({
  add,
  graph,
  modifiers,
  packageInfo,
  scurry,
  actual,
  remove,
  remover,
  transientAdd,
  transientRemove,
  ...specOptions
}: RefreshIdealGraphOptions) => {
  const seen = new Set<DepID>()
  const extractPromises: Promise<ExtractResult>[] = []
  const seenExtracted = new Set<DepID>()

  // gets an ordered list of importers to ensure deterministic processing
  const orderedImporters = getOrderedImporters(graph)
  const depsPerImporter = new Map<Node, Dependency[]>()
  for (const importer of orderedImporters) {
    const deps = getNodeOrderedDependencies(importer, { add, remove })
    depsPerImporter.set(importer, deps)
  }

  if (
    add.modifiedDependencies ||
    remove.modifiedDependencies ||
    graph.optionsChanged
  ) {
    graph.resetEdges()
  }

  // iterates on the list of dependencies per importer updating
  // the graph using metadata fetch from the registry manifest files
  for (const importer of orderedImporters) {
    modifiers?.tryImporter(importer)

    const addedDeps = add.get(importer.id)

    const deps = depsPerImporter.get(importer)
    /* c8 ignore next */
    if (!deps) continue

    const modifierRefs = modifiers?.tryDependencies(importer, deps)

    // compiled: `await appendNodes(...)` as a call expression never
    // resumes; bind + .then() subscriber, then await. Same as
    // registry-client/src/revalidate.ts.
    const appendP = appendNodes(
      packageInfo,
      graph,
      importer,
      deps,
      scurry,
      specOptions,
      seen,
      addedDeps,
      modifiers,
      modifierRefs,
      extractPromises,
      actual,
      seenExtracted,
      remover,
      transientAdd,
      transientRemove,
    )
    void appendP.then(
      () => {},
      () => {},
    )
    await appendP
  }

  for (const node of graph.nodes.values()) {
    node.setDefaultLocation()
  }

  // Wait for all extraction promises to complete
  if (extractPromises.length > 0) {
    await Promise.all(extractPromises)
  }
}
