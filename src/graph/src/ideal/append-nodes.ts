import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { PackageInfoClient } from '@vltpkg/package-info'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import { longDependencyTypes, normalizeManifest } from '@vltpkg/types'
import type { DependencyTypeLong, Manifest } from '@vltpkg/types'
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
): Promise<void> => {
  /* c8 ignore next */
  if (seen.has(fromNode.id)) return
  seen.add(fromNode.id)

  const manifests = deps.map(async ({ spec, type }) => {
    // see if there's a satisfying node in the graph currently
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
        return
      }
    }

    const existingNode = graph.findResolution(
      spec,
      fromNode,
      queryModifier,
    )
    if (existingNode) {
      graph.addEdge(type, spec, fromNode, existingNode)
      return
    }

    const edgeOptional =
      type === 'optional' || type === 'peerOptional'
    return packageInfo
      .manifest(spec, { from: scurry.resolve(fromNode.location) })
      .catch((er: unknown) => {
        // optional deps ignored if inaccessible
        if (edgeOptional || fromNode.optional) {
          return undefined
        }
        throw er
      })
      .then(mani => ({
        activeModifier,
        edgeOptional,
        mani,
        queryModifier,
        spec,
        type,
      }))
  })
  const manifestsResults = await Promise.all(manifests)
  type ManifestResult = Exclude<
    (typeof manifestsResults)[number],
    undefined
  >
  const sortedManifests = manifestsResults
    .filter((m): m is ManifestResult => !!m)
    .sort((a, b) => {
      /* c8 ignore start */
      const nameA = a.mani?.name
      const nameB = b.mani?.name
      if (nameA === undefined && nameB === undefined) return 0
      /* c8 ignore end */
      if (nameA === undefined) return 1
      if (nameB === undefined) return -1
      return nameA.localeCompare(nameB, 'en')
    })
  for (const {
    activeModifier,
    edgeOptional,
    mani,
    queryModifier,
    spec: originalSpec,
    type,
  } of sortedManifests) {
    let spec = originalSpec
    const fileTypeInfo = getFileTypeInfo(spec, fromNode, scurry)
    // when an user is adding a nameless dependency, e.g: `github:foo/bar`,
    // `file:./foo/bar`, we need to update the `add` option value to set the
    // correct name once we have it, so that it can properly be stored in
    // the `package.json` file at the end of reify.
    if (mani?.name && spec.name === '(unknown)') {
      const s = add.get(String(spec))
      if (s) {
        // removes the previous, placeholder entry key
        add.delete(String(spec))
        // replaces spec with a version with the correct name
        spec = Spec.parse(mani.name, spec.bareSpec, options)
        // updates the add map with the fixed up spec
        const n = asDependency({
          ...s,
          spec,
        })
        add.set(mani.name, n)
      }
    }

    if (!mani) {
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

    const node = graph.placePackage(
      fromNode,
      type,
      spec,
      normalizeManifest(mani as Manifest),
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

    if (activeModifier) {
      modifiers?.updateActiveEntry(node, activeModifier)
    }

    if (fileTypeInfo?.path && fileTypeInfo.isDirectory) {
      node.location = fileTypeInfo.path
    }
    node.setResolved()
    const nestedAppends: Promise<void>[] = []

    const bundleDeps = node.manifest?.bundleDependencies
    const bundled = new Set<string>(
      (
        node.id.startsWith('git') ||
        node.importer ||
        !isStringArray(bundleDeps)
      ) ?
        []
      : bundleDeps,
    )

    const nextDeps: Dependency[] = []

    for (const depTypeName of longDependencyTypes) {
      const depRecord: Record<string, string> | undefined =
        mani[depTypeName]

      if (depRecord && shouldInstallDepType(node, depTypeName)) {
        for (const [name, bareSpec] of Object.entries(depRecord)) {
          if (bundled.has(name)) continue
          nextDeps.push({
            type: shorten(depTypeName, name, mani),
            spec: Spec.parse(name, bareSpec, {
              ...options,
              registry: spec.registry,
            }),
          })
        }
      }
    }

    if (nextDeps.length) {
      nestedAppends.push(
        appendNodes(
          add,
          packageInfo,
          graph,
          node,
          nextDeps,
          scurry,
          options,
          seen,
          modifiers,
          modifiers?.tryDependencies(node, nextDeps),
        ),
      )
    }
    await Promise.all(nestedAppends)
  }
}
