import { joinDepIDTuple, type DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { type PackageInfoClient } from '@vltpkg/package-info'
import { Spec, type SpecOptions } from '@vltpkg/spec'
import {
  longDependencyTypes,
  type DependencyTypeLong,
} from '@vltpkg/types'
import { type PathScurry } from 'path-scurry'
import {
  asDependency,
  shorten,
  type Dependency,
} from '../dependencies.ts'
import { type Graph } from '../graph.ts'
import { type Node } from '../node.ts'
import { removeOptionalSubgraph } from '../remove-optional-subgraph.ts'

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
) => {
  /* c8 ignore next */
  if (seen.has(fromNode.id)) return
  seen.add(fromNode.id)

  await Promise.all(
    deps.map(async ({ spec, type }) => {
      // see if there's a satisfying node in the graph currently
      const fileTypeInfo = getFileTypeInfo(spec, fromNode, scurry)
      const existingNode = graph.findResolution(spec, fromNode)
      if (existingNode) {
        graph.addEdge(type, spec, fromNode, existingNode)
        return
      }
      const edgeOptional =
        type === 'optional' || type === 'peerOptional'
      const mani = await packageInfo
        .manifest(spec, { from: scurry.resolve(fromNode.location) })
        .catch((er: unknown) => {
          // optional deps ignored if inaccessible
          if (edgeOptional || fromNode.optional) {
            return undefined
          }
          throw er
        })

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
          return
        } else if (edgeOptional) {
          // failed resolution of an optional dep, just ignore it,
          // nothing to prune because we never added it in the first place.
          return
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
        mani,
        fileTypeInfo?.id,
      )

      /* c8 ignore start - not possible, already ensured manifest */
      if (!node) {
        throw error('failed to place package', {
          from: fromNode.location,
          spec,
        })
      }
      /* c8 ignore stop */

      if (fileTypeInfo?.path && fileTypeInfo.isDirectory) {
        node.location = fileTypeInfo.path
      }
      node.setResolved()
      const nestedAppends: Promise<unknown>[] = []

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
          ),
        )
      }
      await Promise.all(nestedAppends)
    }),
  )
}
