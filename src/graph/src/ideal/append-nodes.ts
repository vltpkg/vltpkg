import { joinDepIDTuple, joinExtra } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { satisfies } from '@vltpkg/satisfies'
import { longDependencyTypes, normalizeManifest } from '@vltpkg/types'
import type {
  DependencyTypeLong,
  DependencySaveType,
  Manifest,
} from '@vltpkg/types'
import type { PathScurry } from 'path-scurry'
import { fixupAddedNames } from '../fixup-added-names.ts'
import { shorten } from '../dependencies.ts'
import type { Dependency } from '../dependencies.ts'
import type { Graph } from '../graph.ts'
import type { Node } from '../node.ts'
import { removeOptionalSubgraph } from '../remove-optional-subgraph.ts'
import type {
  GraphModifier,
  ModifierActiveEntry,
} from '../modifiers.ts'
import type { ExtractResult } from '../reify/extract-node.ts'
import { extractNode } from '../reify/extract-node.ts'
import type { RollbackRemove } from '@vltpkg/rollback-remove'
import {
  checkPeerEdgesCompatible,
  endPeerPlacement,
  forkPeerContext,
  postPlacementPeerCheck,
  startPeerPlacement,
} from './peers.ts'
import { compareByHasPeerDeps } from './sorting.ts'
import type {
  PeerContext,
  PeerContextEntryInput,
  AppendNodeEntry,
  ProcessPlacementResult,
  TransientAddMap,
  TransientRemoveMap,
} from './types.ts'

type FileTypeInfo = {
  id: DepID
  path: string
  isDirectory: boolean
}

/**
 * Task to reuse an existing node by adding an edge to it.
 */
type ReuseTask = {
  type: DependencySaveType
  spec: Spec
  fromNode: Node
  toNode: Node
}

/**
 * Result of fetching manifests for dependencies.
 */
type FetchResult = {
  placementTasks: NodePlacementTask[]
  reuseTasks: ReuseTask[]
  forkRequest?: {
    peerContext: PeerContext
    entries: PeerContextEntryInput[]
  }
}

/**
 * Only install devDeps for git dependencies and importers
 * Everything else always gets installed
 */
const shouldInstallDepType = (
  node: Node,
  depType: DependencyTypeLong,
) =>
  depType !== 'devDependencies' ||
  node.importer ||
  node.id.startsWith('git')

/**
 * Retrieve the {@link DepID} and location for a `file:` type {@link Node}.
 */
const getFileTypeInfo = (
  spec: Spec,
  fromNode: Node,
  scurry: PathScurry,
): FileTypeInfo | undefined => {
  const f = spec.final
  if (f.type !== 'file') return

  /* c8 ignore start - should be impossible */
  if (!f.file) {
    throw error('no path on file specifier', { spec })
  }
  /* c8 ignore stop */

  // Given that both linked folders and local tarballs (both defined with
  // usage of the `file:` spec prefix) location needs to be relative to their
  // parents, build the expected path and use it for both location and id
  const target = scurry.cwd.resolve(fromNode.location).resolve(f.file)
  const path = target.relativePosix()
  const id = joinDepIDTuple(['file', path])

  return {
    path,
    id,
    isDirectory: !!target.lstatSync()?.isDirectory(),
  }
}

const isStringArray = (a: unknown): a is string[] =>
  Array.isArray(a) && !a.some(b => typeof b !== 'string')

/**
 * Represents a manifest fetch operation with all the context needed.
 */
type ManifestFetchTask = {
  spec: Spec
  type: DependencySaveType
  fromNode: Node
  fileTypeInfo?: FileTypeInfo
  activeModifier?: ModifierActiveEntry
  queryModifier?: string
  edgeOptional: boolean
  manifestPromise: Promise<Manifest | undefined>
  depth: number
  peerContext: PeerContext
}

/**
 * Represents a node placement operation that depends on a resolved manifest.
 */
type NodePlacementTask = {
  fetchTask: ManifestFetchTask
  manifest: Manifest | undefined
  node?: Node
  childDeps?: Dependency[]
  childModifierRefs?: Map<string, ModifierActiveEntry>
  childPeerContext?: PeerContext
}

/**
 * Try to find a compatible resolution for a dependency, checking peer context.
 * If the first resolution candidate is incompatible with the peer context,
 * try other candidates.
 */
const findCompatibleResolution = (
  spec: Spec,
  fromNode: Node,
  graph: Graph,
  peerContext: PeerContext,
  queryModifier?: string,
  _peer?: boolean,
) => {
  const candidates = graph.nodesByName.get(spec.final.name)
  let existingNode = graph.findResolution(
    spec,
    fromNode,
    queryModifier,
  )

  let peerCompatResult =
    existingNode ?
      checkPeerEdgesCompatible(
        existingNode,
        fromNode,
        peerContext,
        graph,
      )
    : { compatible: true }

  // CANDIDATE FALLBACK: If first candidate is peer-incompatible, try others
  if (
    existingNode &&
    !peerCompatResult.compatible &&
    candidates &&
    candidates.size > 1
  ) {
    for (const candidate of candidates) {
      if (candidate === existingNode) continue
      if (candidate.detached) continue
      if (
        !satisfies(
          candidate.id,
          spec.final,
          fromNode.location,
          graph.projectRoot,
          graph.monorepo,
        )
      ) {
        continue
      }

      const compat = checkPeerEdgesCompatible(
        candidate,
        fromNode,
        peerContext,
        graph,
      )
      if (compat.compatible) {
        existingNode = candidate
        peerCompatResult = compat
        break
      }
    }
  }

  return { existingNode, peerCompatResult }
}

/**
 * Fetch manifests for dependencies and create placement tasks.
 *
 * This is Phase 1 of the breadth-first graph building process. For each
 * dependency at the current level:
 * 1. Apply any active modifiers (spec swapping)
 * 2. Try to find an existing node to reuse (with peer compatibility check)
 * 3. If no reusable node, start a manifest fetch (in parallel)
 * 4. Create placement tasks for Phase 2
 *
 * The result is sorted to process non-peer-dependent packages first,
 * ensuring peer dependencies can resolve to already-placed siblings.
 *
 * **Read-only**: This function no longer mutates the graph. It returns
 * tasks that will be applied serially in the BFS loop for deterministic ordering.
 */
const fetchManifestsForDeps = async (
  packageInfo: PackageInfoClient,
  graph: Graph,
  fromNode: Node,
  deps: Dependency[],
  scurry: PathScurry,
  peerContext: PeerContext,
  modifierRefs?: Map<string, ModifierActiveEntry>,
  depth = 0,
): Promise<FetchResult> => {
  const fetchTasks: ManifestFetchTask[] = []
  const placementTasks: NodePlacementTask[] = []
  const reuseTasks: ReuseTask[] = []
  let forkRequest:
    | { peerContext: PeerContext; entries: PeerContextEntryInput[] }
    | undefined

  for (const { spec: originalSpec, type } of deps) {
    let spec = originalSpec
    const fileTypeInfo = getFileTypeInfo(spec, fromNode, scurry)
    const activeModifier = modifierRefs?.get(spec.name)

    // MODIFIER HANDLING: Swap spec if an edge modifier is fully matched
    // Example: `vlt install --override "react:^19"` changes react's spec
    const queryModifier = activeModifier?.modifier.query
    const completeModifier =
      activeModifier &&
      activeModifier.interactiveBreadcrumb.current ===
        activeModifier.modifier.breadcrumb.last
    if (
      queryModifier &&
      completeModifier &&
      'spec' in activeModifier.modifier
    ) {
      spec = activeModifier.modifier.spec
      // bareSpec of '-' means "remove this dependency"
      if (spec.bareSpec === '-') {
        continue
      }
    }

    const peer = type === 'peer' || type === 'peerOptional'

    // NODE REUSE LOGIC with peer compatibility
    const { existingNode, peerCompatResult } =
      findCompatibleResolution(
        spec,
        fromNode,
        graph,
        peerContext,
        queryModifier,
        peer,
      )

    // Store fork request if incompatible peer edges detected (defer actual fork)
    const effectivePeerContext = peerContext
    /* c8 ignore start */
    if (!peerCompatResult.compatible && peerCompatResult.forkEntry) {
      forkRequest = {
        peerContext,
        entries: [peerCompatResult.forkEntry],
      }
      // Note: We don't fork here anymore - the BFS loop will handle it
      // For now, continue with the original context for manifest fetching
      // The fork will be applied before placement in Phase B
    }
    /* c8 ignore stop */

    // defines what nodes are eligible to be reused
    const validExistingNode =
      existingNode &&
      !existingNode.detached &&
      // Regular deps can always reuse.
      // Peer deps can reuse as well if their peer edges are compatible.
      // (Avoids needless cloning like @isaacs/peer-dep-cycle-a@1.0.0·ṗ:*.)
      /* c8 ignore start */
      (!peer || peerCompatResult.compatible) &&
      // Check if existing node's peer edges are compatible with new parent
      peerCompatResult.compatible
    /* c8 ignore stop */

    if (
      validExistingNode ||
      // importers are handled at the ./refresh-ideal-graph.ts top-level
      // so we should just skip whenever we find one
      existingNode?.importer
    ) {
      // Collect reuse task instead of mutating graph immediately
      reuseTasks.push({ type, spec, fromNode, toNode: existingNode })
      continue
    }

    // is the current edge pointint go an optional dependency?
    const edgeOptional =
      type === 'optional' || type === 'peerOptional'

    // Start manifest fetch immediately for parallel processing
    const manifestPromise =
      // the "detached" node state means that it has already been load as
      // part of a graph (either lockfile or actual) and it has valid manifest
      // data so we shortcut the package info manifest fetch here
      existingNode?.detached ?
        Promise.resolve(existingNode.manifest as Manifest | undefined)
        // this is the entry point to fetch calls to retrieve manifests
        // from the build ideal graph point of view
      : packageInfo
          .manifest(spec, { from: scurry.resolve(fromNode.location) })
          .then(manifest => manifest as Manifest | undefined)
          .catch((er: unknown) => {
            // optional deps ignored if inaccessible
            if (edgeOptional || fromNode.optional) {
              return undefined
            }
            throw er
          })

    const fetchTask: ManifestFetchTask = {
      spec,
      type,
      fromNode,
      fileTypeInfo,
      activeModifier,
      queryModifier,
      edgeOptional,
      manifestPromise,
      depth,
      peerContext: effectivePeerContext,
    }

    fetchTasks.push(fetchTask)
  }

  // Create placement tasks from fetch tasks
  for (const fetchTask of fetchTasks) {
    const manifest = await fetchTask.manifestPromise

    placementTasks.push({
      fetchTask,
      manifest,
    })
  }

  // sort placement tasks: non-peer dependencies first, then peer dependencies
  // so that peer dependencies can easily reuse already placed regular
  // dependencies as part of peer context set resolution also makes sure to
  // sort by the manifest name for deterministic order.
  placementTasks.sort(compareByHasPeerDeps)

  return { placementTasks, reuseTasks, forkRequest }
}

/**
 * Process placement tasks and collect child dependencies.
 *
 * This is Phase 2 of the breadth-first graph building process. For each
 * resolved manifest:
 * 1. Handle missing manifests (optional vs required deps)
 * 2. Start peer placement process (collect sibling context)
 * 3. Place the node in the graph with appropriate flags
 * 4. Trigger early extraction if eligible (performance optimization)
 * 5. Collect child dependencies for the next BFS level
 * 6. End peer placement (setup context update functions)
 *
 * Early extraction: When `actual` graph is provided, nodes destined for the
 * vlt store are extracted immediately (in parallel) instead of waiting for
 * the full ideal graph to be built. This significantly improves install time.
 */
const processPlacementTasks = async (
  graph: Graph,
  options: SpecOptions,
  placementTasks: NodePlacementTask[],
  add?: Map<string, Dependency>,
  modifiers?: GraphModifier,
  scurry?: PathScurry,
  packageInfo?: PackageInfoClient,
  extractPromises?: Promise<ExtractResult>[],
  actual?: Graph,
  seenExtracted?: Set<DepID>,
  remover?: RollbackRemove,
  transientAdd?: TransientAddMap,
  transientRemove?: TransientRemoveMap,
): Promise<ProcessPlacementResult> => {
  const childDepsToProcess: ProcessPlacementResult = []

  // Note: placementTasks are already sorted by fetchManifestsForDeps
  // using compareByHasPeerDeps to ensure non-peer deps are processed first.
  // We don't sort again here to preserve that ordering.

  for (const placementTask of placementTasks) {
    const { fetchTask, manifest } = placementTask
    let {
      activeModifier,
      edgeOptional,
      fileTypeInfo,
      fromNode,
      peerContext,
      queryModifier,
      spec,
      type,
    } = fetchTask

    // fix the name in the `add` map when needed. This allows the upcoming
    // reify step to properly update the package.json file dependencies
    // using the correct names retrieved from the manifest data
    const additiveMap =
      fromNode.importer ? add : transientAdd?.get(fromNode.id)
    spec = fixupAddedNames(additiveMap, manifest, options, spec)

    // handles missing manifest resolution
    if (!manifest) {
      if (!edgeOptional && fromNode.isOptional()) {
        // failed resolution of a non-optional dep of an optional node
        // have to clean up the dependents
        removeOptionalSubgraph(graph, fromNode)
        continue
      } else if (edgeOptional) {
        // failed resolution of an optional dep, just ignore it,
        // nothing to prune because we never added it in the first place.
        continue
      } else {
        throw error('failed to resolve dependency', {
          spec,
          from: fromNode.location,
        })
      }
    }

    // start peer deps placement process, populating the peer context with
    // dependency data; adding the parent node deps and this manifest's
    // peer deps references to the current peer context set
    const peerPlacement = startPeerPlacement(
      peerContext,
      manifest,
      fromNode,
      options,
    )
    const peerSetHash = peerPlacement.peerSetHash
    const queuedEntries = peerPlacement.queuedEntries

    // places a new node in the graph representing a newly seen dependency
    const node = graph.placePackage(
      fromNode,
      type,
      spec,
      normalizeManifest(manifest),
      fileTypeInfo?.id,
      joinExtra({ peerSetHash, modifier: queryModifier }),
    )

    /* c8 ignore start - not possible, already ensured manifest */
    if (!node) {
      throw error('failed to place package', {
        from: fromNode.location,
        spec,
      })
    }
    /* c8 ignore stop */

    // update the node modifier tracker
    if (activeModifier) {
      modifiers?.updateActiveEntry(node, activeModifier)
    }

    const eligibleForExtraction =
      type !== 'peer' &&
      type !== 'peerOptional' &&
      remover &&
      extractPromises &&
      actual &&
      scurry &&
      packageInfo &&
      node.inVltStore() &&
      !node.isOptional() &&
      // this fixes an issue with installing `file:pathname` specs
      /* c8 ignore next */ !fileTypeInfo?.isDirectory &&
      !node.importer

    // extract the node if it meets the criteria for early extraction
    if (eligibleForExtraction) {
      /* c8 ignore start */
      if (seenExtracted?.has(node.id)) {
        continue
      }
      /* c8 ignore stop */
      seenExtracted?.add(node.id)
      const actualNode = actual.nodes.get(node.id)
      if (!actualNode?.equals(node)) {
        // extract the node without awaiting - push the promise to the array
        const extractPromise = extractNode(
          node,
          scurry,
          remover,
          options,
          packageInfo,
        )
        extractPromises.push(extractPromise)
      }
    }

    // updates graph node information
    if (fileTypeInfo?.path && fileTypeInfo.isDirectory) {
      node.location = fileTypeInfo.path
    }
    node.setResolved()

    // collect child dependencies for processing in the next level
    const nextPeerDeps = new Map<string, Dependency>()

    // compute deps normally
    const bundleDeps = manifest.bundleDependencies
    const bundled = new Set<string>(
      (
        node.id.startsWith('git') ||
          node.importer ||
          !isStringArray(bundleDeps)
      ) ?
        []
      : bundleDeps,
    )

    // setup next level to process all child dependencies in the manifest
    const nextDeps: Dependency[] = []

    // traverse actual dependency declarations in the manifest
    // creating dependency entries for them
    for (const depTypeName of longDependencyTypes) {
      const depRecord: Record<string, string> | undefined =
        manifest[depTypeName]

      if (depRecord && shouldInstallDepType(node, depTypeName)) {
        // Sort Object.entries for deterministic iteration
        const sortedEntries = Object.entries(depRecord).sort(
          ([a], [b]) => a.localeCompare(b, 'en'),
        )
        for (const [name, bareSpec] of sortedEntries) {
          // might need to skip already placed peer deps here
          if (bundled.has(name)) continue
          const dep = {
            type: shorten(depTypeName, name, manifest),
            spec: Spec.parse(name, bareSpec, {
              ...options,
              registry: spec.registry,
            }),
          }
          if (depTypeName === 'peerDependencies') {
            nextPeerDeps.set(name, dep)
          } else {
            nextDeps.push(dep)
          }
        }
      }
    }

    // Inject transient dependencies for non-importer nodes (nested folders)
    // These are deps that were added from a nested folder context using
    // relative file: specs that should resolve relative to that folder
    const transientDeps = transientAdd?.get(node.id)
    if (transientDeps) {
      for (const [, dep] of transientDeps) {
        if (dep.type === 'peer' || dep.type === 'peerOptional') {
          nextPeerDeps.set(dep.spec.name, dep)
          continue
        }

        // remove the dependency from nextDeps if it already exists
        const index = nextDeps.findIndex(
          d => d.spec.name === dep.spec.name,
        )
        if (index !== -1) {
          nextDeps.splice(index, 1)
        }

        nextDeps.push(dep)
      }
    }

    // Remove transient removals when needed
    const transientRemovals = transientRemove?.get(node.id)
    if (transientRemovals) {
      for (const depName of transientRemovals) {
        const index = nextDeps.findIndex(
          dep => dep.spec.name === depName,
        )
        if (index !== -1) {
          nextDeps.splice(index, 1)
          continue
        }

        if (nextPeerDeps.has(depName)) {
          nextPeerDeps.delete(depName)
        }
      }
    }

    // finish peer placement for this node, resolving satisfied peers
    // to seen nodes from the peer context and adding unsatisfied peers
    // to `nextDeps` so they get processed along regular dependencies
    const updateContext = endPeerPlacement(
      peerContext,
      nextDeps,
      nextPeerDeps,
      graph,
      spec,
      fromNode,
      node,
      type,
      queuedEntries,
    )

    childDepsToProcess.push({
      node,
      deps: nextDeps,
      modifierRefs: modifiers?.tryDependencies(node, nextDeps),
      peerContext,
      updateContext,
    })
  }

  return childDepsToProcess
}

/**
 * Append new nodes in the given `graph` for dependencies specified at `add`
 * and missing dependencies from the `deps` parameter.
 *
 * Uses **breadth-first traversal** (BFS) with **deterministic ordering** to
 * ensure reproducible builds. The algorithm:
 *
 * 1. Process all deps at the current level in parallel
 * 2. After each level, run `postPlacementPeerCheck` to handle peer contexts
 * 3. Collect child deps for the next level
 * 4. Repeat until no more deps to process
 *
 * **Peer Context Isolation**: Each workspace importer gets its own peer context
 * to prevent cross-workspace leakage. Without this, `react@^18` from workspace A
 * could incorrectly satisfy `react@^19` peer deps in workspace B.
 *
 * **Early Extraction**: When `actual` graph is provided, nodes are extracted
 * to the vlt store during graph construction (not after), improving performance.
 */
export const appendNodes = async (
  packageInfo: PackageInfoClient,
  graph: Graph,
  fromNode: Node,
  deps: Dependency[],
  scurry: PathScurry,
  options: SpecOptions,
  seen: Set<DepID>,
  add?: Map<string, Dependency>,
  modifiers?: GraphModifier,
  modifierRefs?: Map<string, ModifierActiveEntry>,
  extractPromises?: Promise<ExtractResult>[],
  actual?: Graph,
  seenExtracted?: Set<DepID>,
  remover?: RollbackRemove,
  transientAdd?: TransientAddMap,
  transientRemove?: TransientRemoveMap,
) => {
  // Cycle detection: skip if already processed
  /* c8 ignore next */
  if (seen.has(fromNode.id)) return
  seen.add(fromNode.id)

  // PEER CONTEXT ISOLATION: Each workspace importer needs its own context
  // to prevent peer targets from one workspace affecting another.
  // The main importer (index 0) uses the initial context; others get fresh ones.
  let initialPeerContext = graph.peerContexts[0]
  /* c8 ignore start - impossible */
  if (!initialPeerContext)
    throw error('no initial peer context found in graph')
  /* c8 ignore stop */
  if (fromNode.importer && fromNode !== graph.mainImporter) {
    // Create isolated peer context for this workspace importer
    const nextPeerContext: PeerContext = new Map()
    nextPeerContext.index = graph.nextPeerContextIndex()
    graph.peerContexts[nextPeerContext.index] = nextPeerContext
    initialPeerContext = nextPeerContext
  }

  // BFS queue: process deps level by level for deterministic builds
  let currentLevelDeps: AppendNodeEntry[] = [
    {
      node: fromNode,
      deps,
      modifierRefs,
      depth: 0,
      peerContext: initialPeerContext,
      /* c8 ignore start */
      updateContext: {
        putEntries: () => undefined,
        resolvePeerDeps: () => {},
      },
      /* c8 ignore stop */
    },
  ]

  // BFS MAIN LOOP: Process level by level until no more deps
  while (currentLevelDeps.length > 0) {
    const nextLevelDeps: AppendNodeEntry[] = []

    // ============================================================
    // PHASE A: PARALLEL FETCH (READ-ONLY)
    // ============================================================
    // Fetch all manifests at this level in parallel without mutating the graph.
    // This phase is read-only to avoid race conditions from network timing.
    const fetchResults = await Promise.all(
      currentLevelDeps.map(
        async ({
          node,
          deps: nodeDeps,
          modifierRefs: nodeModifierRefs,
          peerContext,
          depth,
        }: AppendNodeEntry) => {
          // Cycle prevention: mark as seen when starting to process
          seen.add(node.id)

          // Fetch manifests and collect tasks (no graph mutations)
          const result = await fetchManifestsForDeps(
            packageInfo,
            graph,
            node,
            // Sort by name for deterministic ordering (reproducible builds)
            nodeDeps.sort((a, b) =>
              a.spec.name.localeCompare(b.spec.name, 'en'),
            ),
            scurry,
            peerContext,
            nodeModifierRefs,
            depth,
          )

          return {
            entry: {
              node,
              deps: nodeDeps,
              modifierRefs: nodeModifierRefs,
              peerContext,
              depth,
            },
            result,
          }
        },
      ),
    )

    // ============================================================
    // PHASE B: SERIAL MUTATIONS (DETERMINISTIC ORDER)
    // ============================================================
    // Sort results by stable identifiers to ensure deterministic ordering
    // regardless of which manifest fetch completed first
    const sortedResults = fetchResults.sort((a, b) => {
      // Sort by node ID (DepID-based, stable) and depth
      const keyA = `${a.entry.node.id}::${a.entry.depth}`
      const keyB = `${b.entry.node.id}::${b.entry.depth}`
      return keyA.localeCompare(keyB, 'en')
    })

    // Apply all mutations serially in deterministic order
    const levelResults: ProcessPlacementResult[] = []
    for (const { entry, result } of sortedResults) {
      // Apply reuse edges (from Phase A deferred mutations)
      for (const reuse of result.reuseTasks) {
        graph.addEdge(
          reuse.type,
          reuse.spec,
          reuse.fromNode,
          reuse.toNode,
        )
      }

      // Apply fork if needed (from Phase A deferred fork request)
      if (result.forkRequest) {
        const { peerContext: contextToFork, entries } =
          result.forkRequest
        const forkedContext = forkPeerContext(
          graph,
          contextToFork,
          entries,
        )
        entry.peerContext = forkedContext
        // Update peer context in all placement tasks to use forked context
        for (const task of result.placementTasks) {
          task.fetchTask.peerContext = forkedContext
        }
      }

      // Place nodes and collect child deps
      const placed = await processPlacementTasks(
        graph,
        options,
        result.placementTasks,
        add,
        modifiers,
        scurry,
        packageInfo,
        extractPromises,
        actual,
        seenExtracted,
        remover,
        transientAdd,
        transientRemove,
      )

      levelResults.push(placed)
    }

    // ============================================================
    // PHASE C: POST-PLACEMENT PEER CHECK
    // ============================================================
    // After all nodes at this level are placed, update peer contexts,
    // fork as needed, and resolve peer deps that can be satisfied.
    // This must happen AFTER placement so sibling nodes are available.
    postPlacementPeerCheck(graph, levelResults)

    // ============================================================
    // STEP 3: COLLECT CHILD DEPS FOR NEXT LEVEL
    // ============================================================
    for (const childDepsToProcess of levelResults) {
      for (const childDep of childDepsToProcess) {
        // Skip already-seen nodes (cycle prevention)
        if (!seen.has(childDep.node.id)) {
          /* c8 ignore next */
          const currentDepth = currentLevelDeps[0]?.depth ?? 0
          nextLevelDeps.push({
            ...childDep,
            depth: currentDepth + 1,
          })
        }
      }
    }

    // Advance to next BFS level
    currentLevelDeps = nextLevelDeps
  }
}
