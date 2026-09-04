import { appendNodes } from './append-nodes.ts'
import {
  compareByHasPeerDeps,
  getNodeOrderedDependencies,
} from './sorting.ts'
import type { PathScurry } from 'path-scurry'
import { baseDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type {
  BuildIdealAddOptions,
  BuildIdealFromGraphOptions,
  BuildIdealRemoveOptions,
  ExplicitAddMap,
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
     * Dependency names that came from an explicit user request, keyed by
     * the id of the node receiving them.
     */
    explicit?: ExplicitAddMap

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
  explicit,
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

  // importer edge spec text as the starting graph had it. a rebuild that
  // only changes the text (`vlt i foo@1.2.3` over a `foo@^1.2.3` edge)
  // produces no node diff, so reify has to be told the lockfile on disk
  // no longer describes the graph
  const specTexts = new Map<string, string>()
  for (const importer of graph.importers) {
    for (const [name, edge] of importer.edgesOut) {
      specTexts.set(`${importer.id}\0${name}`, edge.spec.bareSpec)
    }
  }

  const depsPerImporter = new Map<Node, Dependency[]>()
  for (const importer of orderedImporters) {
    // gets an ordered list of dependencies for this importer
    // while also taking into account additions and removals
    const deps = getNodeOrderedDependencies(importer, { add, remove })
    depsPerImporter.set(importer, deps)
  }

  // removes all edges to start recalculating the graph
  if (
    add.modifiedDependencies ||
    remove.modifiedDependencies ||
    graph.optionsChanged
  ) {
    const locked = new Map<string, DepID>()
    const ambiguous = new Set<string>()
    const record = (key: string, id: DepID) => {
      if (ambiguous.has(key)) return
      const prev = locked.get(key)
      if (prev === undefined) {
        locked.set(key, id)
      } else if (prev !== id) {
        // two peer copies of the same base resolve the name differently;
        // a base-keyed lookup would be a guess, so drop the key
        locked.delete(key)
        ambiguous.add(key)
      }
    }
    for (const edge of graph.edges) {
      if (!edge.to) continue
      record(`${edge.from.id}\0${edge.spec.name}`, edge.to.id)
      // peer-fork rebuilds mint provisional `peer.N` parent ids that miss
      // the canonical `peer.<hash>` keys captured here, so also key by
      // the base id when that is unambiguous across peer copies
      const base = baseDepID(edge.from.id)
      if (base !== edge.from.id) {
        record(`${base}\0${edge.spec.name}`, edge.to.id)
      }
    }
    graph.lockedResolutions = locked
    graph.resetEdges()
  }

  // iterates on the list of dependencies per importer updating
  // the graph using metadata fetch from the registry manifest files
  for (const importer of orderedImporters) {
    modifiers?.tryImporter(importer)

    // gets a ref to the map of dependencies being added to this importer
    const addedDeps = add.get(importer.id)

    const deps = depsPerImporter.get(importer)
    /* c8 ignore next */
    if (!deps) continue

    // gets a ref to the list of modifier functions for this set of deps
    const modifierRefs = modifiers?.tryDependencies(importer, deps)

    // Add new nodes for packages defined in the dependencies list fetching
    // metadata from the registry manifests and updating the graph
    await appendNodes(
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
      explicit,
    )
  }

  // locked resolutions only apply to the rebuild that captured them
  graph.lockedResolutions = undefined

  for (const importer of graph.importers) {
    for (const [name, edge] of importer.edgesOut) {
      if (
        specTexts.get(`${importer.id}\0${name}`) !==
        edge.spec.bareSpec
      ) {
        graph.lockfileStale = true
      }
    }
  }

  // set default node locations, if possible
  for (const node of graph.nodes.values()) {
    node.setDefaultLocation()
  }

  // Wait for all extraction promises to complete
  if (extractPromises.length > 0) {
    await Promise.all(extractPromises)
  }
}
