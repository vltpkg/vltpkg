import { error } from '@vltpkg/error-cause'
import { appendNodes } from './append-nodes.ts'
import { resolveSaveType } from '../resolve-save-type.ts'
import type { PathScurry } from 'path-scurry'
import type { DepID } from '@vltpkg/dep-id'
import type { PackageInfoClient } from '@vltpkg/package-info'
import type { SpecOptions } from '@vltpkg/spec'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import type {
  BuildIdealAddOptions,
  BuildIdealFromGraphOptions,
  PeerContext,
} from './types.ts'
import type { GraphModifier } from '../modifiers.ts'
import type { ExtractResult } from '../reify/extract-node.ts'
import type { Graph } from '../graph.ts'

export type AddNodesOptions = BuildIdealAddOptions &
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
  }

/**
 * Add new nodes in the given `graph` for dependencies specified at `add`.
 */
export const addNodes = async ({
  add,
  graph,
  modifiers,
  packageInfo,
  scurry,
  actual,
  remover,
  ...specOptions
}: AddNodesOptions) => {
  const seen = new Set<DepID>()
  const extractPromises: Promise<ExtractResult>[] = []
  const seenExtracted = new Set<DepID>()

  // iterates on the list of dependencies per importer updating
  // the graph using metadata fetch from the registry manifest files
  for (const [depID, dependencies] of add) {
    const importer = graph.nodes.get(depID)
    if (!importer) {
      throw error('Could not find importer', { found: depID })
    }
    modifiers?.tryImporter(importer)

    // Removes any edges and nodes that are currently part of the
    // graph but are also in the list of dependencies to be installed
    const deps = [...dependencies.values()]
    for (const dep of deps) {
      const { spec } = dep
      const existingEdge = importer.edgesOut.get(spec.name)
      dep.type = resolveSaveType(importer, spec.name, dep.type)
      const node = existingEdge?.to
      if (node) graph.removeNode(node)
    }

    // starts the top-level peer context set for this install
    const initialPeerContext: PeerContext = new Map()
    initialPeerContext.index = nextPeerContextIndex()

    // Add new nodes for packages defined in the dependencies list fetching
    // metadata from the registry manifests and updating the graph
    await appendNodes(
      dependencies,
      packageInfo,
      graph,
      importer,
      deps,
      scurry,
      specOptions,
      seen,
      modifiers,
      modifiers?.tryDependencies(importer, deps),
      extractPromises,
      actual,
      seenExtracted,
      remover,
    )
  }

  // Wait for all extraction promises to complete
  if (extractPromises.length > 0) {
    await Promise.all(extractPromises)
  }
}

/**
 * Global index to assign unique ids used to track peer context sets.
 */
let peerContextIndex = 0
/**
 * Retrieve the next unique index for a peer context set.
 */
export const nextPeerContextIndex = () => peerContextIndex++
