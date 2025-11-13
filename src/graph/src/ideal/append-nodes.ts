import { joinDepIDTuple, joinExtra } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { longDependencyTypes, normalizeManifest } from '@vltpkg/types'
import type {
  DependencyTypeLong,
  DependencySaveType,
  Manifest,
} from '@vltpkg/types'
import type { PathScurry } from 'path-scurry'
import { asDependency, shorten } from '../dependencies.ts'
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
  endPeerPlacement,
  nextPeerContextIndex,
  startPeerPlacement,
} from './peers.ts'
import type { PeerContext } from './peers.ts'

type FileTypeInfo = {
  id: DepID
  path: string
  isDirectory: boolean
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
 * Represents an ongoing append operation for a node and its dependencies.
 */
type AppendNodeEntry = {
  node: Node
  deps: Dependency[]
  modifierRefs?: Map<string, ModifierActiveEntry>
  depth: number
  peerContext: PeerContext
  updateContext: () => PeerContext
}

/**
 * Fetch manifests for dependencies and create placement tasks.
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
): Promise<NodePlacementTask[]> => {
  // Create fetch tasks for all dependencies at this level
  const fetchTasks: ManifestFetchTask[] = []

  for (const { spec: originalSpec, type } of deps) {
    let spec = originalSpec
    const fileTypeInfo = getFileTypeInfo(spec, fromNode, scurry)
    const activeModifier = modifierRefs?.get(spec.name)

    // here is the place we swap specs if a edge modifier was defined
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
      if (spec.bareSpec === '-') {
        continue
      }
    }

    // skip reusing nodes for peer deps since their reusability
    // is handled ahead-of-time during its parent's placement
    const existingNode =
      type !== 'peer' &&
      type !== 'peerOptional' &&
      graph.findResolution(spec, fromNode, queryModifier)
    if (existingNode) {
      graph.addEdge(type, spec, fromNode, existingNode)
      continue
    }

    const edgeOptional =
      type === 'optional' || type === 'peerOptional'

    // Start manifest fetch immediately for parallel processing
    const manifestPromise = packageInfo
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
      peerContext,
    }

    fetchTasks.push(fetchTask)
  }

  // Create placement tasks
  const placementTasks: NodePlacementTask[] = []
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
  placementTasks.sort((a, b) => {
    const aIsPeer =
      (
        a.manifest?.peerDependencies &&
        Object.keys(a.manifest.peerDependencies).length > 0
      ) ?
        1
      : 0
    const bIsPeer =
      (
        b.manifest?.peerDependencies &&
        Object.keys(b.manifest.peerDependencies).length > 0
      ) ?
        1
      : 0

    // regular dependencies first, peer dependencies last
    if (aIsPeer !== bIsPeer) {
      return aIsPeer - bIsPeer
    }

    // if both are in the same group,
    // sort alphabetically by manifest name (fallback to spec.name)
    const aName =
      a.manifest?.name /* c8 ignore next */ || a.fetchTask.spec.name
    const bName = b.manifest?.name || b.fetchTask.spec.name
    return aName.localeCompare(bName, 'en')
  })

  return placementTasks
}

type ProcessPlacementResultEntry = Omit<AppendNodeEntry, 'depth'>
type ProcessPlacementResult = ProcessPlacementResultEntry[]

/**
 * Process placement tasks and collect child dependencies, this is the
 * second step of the appendNodes operation after manifest fetching in
 * which the final graph data structure is actually built.
 */
const processPlacementTasks = async (
  add: Map<string, Dependency>,
  graph: Graph,
  options: SpecOptions,
  placementTasks: NodePlacementTask[],
  modifiers?: GraphModifier,
  scurry?: PathScurry,
  packageInfo?: PackageInfoClient,
  extractPromises?: Promise<ExtractResult>[],
  actual?: Graph,
  seenExtracted?: Set<DepID>,
  remover?: RollbackRemove,
): Promise<ProcessPlacementResult> => {
  const childDepsToProcess: ProcessPlacementResult = []

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

    // Handle nameless dependencies
    if (manifest?.name && spec.name === '(unknown)') {
      const s = add.get(String(spec))
      if (s) {
        // removes the previous, placeholder entry key
        add.delete(String(spec))
        // replaces spec with a version with the correct name
        spec = Spec.parse(manifest.name, spec.bareSpec, options)
        // updates the add map with the fixed up spec
        const n = asDependency({
          ...s,
          spec,
        })
        add.set(manifest.name, n)
      }
    }

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
    const { peerSetHash, queuedEntries } = startPeerPlacement(
      peerContext,
      manifest,
      fromNode,
      options,
    )

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

    // Extract the node if it doesn't exist in the actual graph and we have the necessary parameters
    if (
      remover &&
      extractPromises &&
      actual &&
      scurry &&
      packageInfo &&
      node.inVltStore() &&
      !node.isOptional()
    ) {
      /* c8 ignore start */
      if (seenExtracted?.has(node.id)) {
        continue
      }
      /* c8 ignore stop */
      seenExtracted?.add(node.id)
      const actualNode = actual.nodes.get(node.id)
      if (!actualNode?.equals(node)) {
        // Extract the node without awaiting - push the promise to the array
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

    // Collect child dependencies for processing in the next level
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
    const nextPeerDeps = new Map<string, Dependency>()

    // traverse actual dependency declarations in the manifest
    // creating dependency entries for them
    for (const depTypeName of longDependencyTypes) {
      const depRecord: Record<string, string> | undefined =
        manifest[depTypeName]

      if (depRecord && shouldInstallDepType(node, depTypeName)) {
        for (const [name, bareSpec] of Object.entries(depRecord)) {
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

    // Build peer context for children from this node's resolved dependencies
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
 * It also applies any modifiers that applies to a given node as it processes
 * and builds the graph.
 */
export const appendNodes = async (
  add: Map<string, Dependency>,
  packageInfo: PackageInfoClient,
  graph: Graph,
  fromNode: Node,
  deps: Dependency[],
  scurry: PathScurry,
  options: SpecOptions,
  seen: Set<DepID>,
  modifiers?: GraphModifier,
  modifierRefs?: Map<string, ModifierActiveEntry>,
  extractPromises?: Promise<ExtractResult>[],
  actual?: Graph,
  seenExtracted?: Set<DepID>,
  remover?: RollbackRemove,
) => {
  /* c8 ignore next */
  if (seen.has(fromNode.id)) return
  seen.add(fromNode.id)

  // Use a queue for breadth-first processing
  const initialPeerContext: PeerContext = new Map()
  initialPeerContext.index = nextPeerContextIndex()
  let currentLevelDeps: AppendNodeEntry[] = [
    {
      node: fromNode,
      deps,
      modifierRefs,
      depth: 0,
      peerContext: initialPeerContext,
      /* c8 ignore next */
      updateContext: () => initialPeerContext,
    },
  ]

  while (currentLevelDeps.length > 0) {
    const nextLevelDeps: AppendNodeEntry[] = []

    // Process all nodes at the current level in parallel
    const levelResults = await Promise.all(
      currentLevelDeps.map(
        async ({
          node,
          deps: nodeDeps,
          modifierRefs: nodeModifierRefs,
          depth,
          peerContext,
        }: AppendNodeEntry) => {
          // Mark node as seen when we start processing its dependencies
          seen.add(node.id)

          // Fetch manifests for this node's dependencies
          const placementTasks = await fetchManifestsForDeps(
            packageInfo,
            graph,
            node,
            // Sort dependencies by spec.name for deterministic ordering
            nodeDeps.sort((a, b) =>
              a.spec.name.localeCompare(b.spec.name, 'en'),
            ),
            scurry,
            peerContext,
            nodeModifierRefs,
            depth,
          )

          // Process the placement tasks and get child dependencies
          return await processPlacementTasks(
            add,
            graph,
            options,
            placementTasks,
            modifiers,
            scurry,
            packageInfo,
            extractPromises,
            actual,
            seenExtracted,
            remover,
          )
        },
      ),
    )

    // sort level results for deterministic processing order
    const sortedLevelResults = levelResults.sort(
      (a: ProcessPlacementResult, b: ProcessPlacementResult) => {
        const orderedEntry = ({
          node,
          deps,
        }: ProcessPlacementResultEntry): string => {
          /* c8 ignore start */
          const sortedDeps = deps.sort((depA, depB) => {
            const depAIsPeer =
              depA.type === 'peer' || depA.type === 'peerOptional' ?
                1
              : 0
            const depBIsPeer =
              depB.type === 'peer' || depB.type === 'peerOptional' ?
                1
              : 0
            if (depAIsPeer !== depBIsPeer) {
              return depAIsPeer - depBIsPeer
            }
            return depA.spec.name.localeCompare(depB.spec.name, 'en')
          })
          /* c8 ignore stop */
          const ref = sortedDeps.map(dep => dep.spec.name).join(';')
          return `${node.id}(${ref})`
        }
        const aRef = a.map(orderedEntry).join(',')
        const bRef = b.map(orderedEntry).join(',')
        return aRef.localeCompare(bRef, 'en')
      },
    )

    // Update peer contexts in a sorted manner after processing all nodes
    // at a given level to ensure deterministic behavior when it comes to
    // forking new peer contexts
    for (const childDepsToProcess of sortedLevelResults) {
      for (const childDep of childDepsToProcess) {
        childDep.peerContext = childDep.updateContext()
      }
    }

    // Collect all child dependencies for the next level
    for (const childDepsToProcess of sortedLevelResults) {
      for (const childDep of childDepsToProcess) {
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

    // Move to the next level
    currentLevelDeps = nextLevelDeps
  }
}
