import { joinDepIDTuple } from '@vltpkg/dep-id'
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
}

/**
 * Represents an ongoing append operation for a node and its dependencies.
 */
type AppendNodeEntry = {
  node: Node
  deps: Dependency[]
  modifierRefs?: Map<string, ModifierActiveEntry>
  depth: number
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

    const existingNode = graph.findResolution(
      spec,
      fromNode,
      queryModifier,
    )
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

  return placementTasks
}

/**
 * Process placement tasks and collect child dependencies
 */
const processPlacementTasks = async (
  add: Map<string, Dependency>,
  graph: Graph,
  options: SpecOptions,
  placementTasks: NodePlacementTask[],
  modifiers?: GraphModifier,
): Promise<{
  childDepsToProcess: Omit<AppendNodeEntry, 'depth'>[]
}> => {
  const childDepsToProcess: Omit<AppendNodeEntry, 'depth'>[] = []

  for (const placementTask of placementTasks) {
    const { fetchTask, manifest } = placementTask
    let { spec } = fetchTask
    const type = fetchTask.type
    const fromNode = fetchTask.fromNode
    const fileTypeInfo = fetchTask.fileTypeInfo
    const activeModifier = fetchTask.activeModifier
    const queryModifier = fetchTask.queryModifier
    const edgeOptional = fetchTask.edgeOptional

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

    // places a new node in the graph representing a newly seen dependency
    const node = graph.placePackage(
      fromNode,
      type,
      spec,
      normalizeManifest(manifest),
      fileTypeInfo?.id,
      queryModifier,
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

    // recursively process all child dependencies in the manifest
    const nextDeps: Dependency[] = []

    for (const depTypeName of longDependencyTypes) {
      const depRecord: Record<string, string> | undefined =
        manifest[depTypeName]

      if (depRecord && shouldInstallDepType(node, depTypeName)) {
        for (const [name, bareSpec] of Object.entries(depRecord)) {
          if (bundled.has(name)) continue
          nextDeps.push({
            type: shorten(depTypeName, name, manifest),
            spec: Spec.parse(name, bareSpec, {
              ...options,
              registry: spec.registry,
            }),
          })
        }
      }
    }

    if (nextDeps.length > 0) {
      childDepsToProcess.push({
        node,
        deps: nextDeps,
        modifierRefs: modifiers?.tryDependencies(node, nextDeps),
      })
    }
  }

  return { childDepsToProcess }
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
) => {
  /* c8 ignore next */
  if (seen.has(fromNode.id)) return
  seen.add(fromNode.id)

  // Use a queue for breadth-first processing
  let currentLevelDeps: AppendNodeEntry[] = [
    { node: fromNode, deps, modifierRefs, depth: 0 },
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
          )
        },
      ),
    )

    // Collect all child dependencies for the next level
    for (const { childDepsToProcess } of levelResults) {
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
