import { DepID, joinDepIDTuple } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Spec, SpecOptions } from '@vltpkg/spec'
import { PathScurry } from 'path-scurry'
import {
  Dependency,
  DependencyTypeLong,
  longDependencyTypes,
  shorten,
} from '../dependencies.js'
import { Graph } from '../graph.js'
import { Node } from '../node.js'

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
  node.id.startsWith('git;')

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

export const appendNodes = async (
  packageInfo: PackageInfoClient,
  graph: Graph,
  fromNode: Node,
  deps: Dependency[],
  scurry: PathScurry,
  options: SpecOptions,
) =>
  Promise.all(
    deps.map(async ({ spec, type }) => {
      // see if there's a satisfying node in the graph currently
      const fileTypeInfo = getFileTypeInfo(spec, fromNode, scurry)
      const existingNode = graph.findResolution(spec, fromNode)
      if (existingNode) {
        graph.addEdge(type, spec, fromNode, existingNode)
        return
      }
      const node = graph.placePackage(
        fromNode,
        type,
        spec,
        await packageInfo.manifest(spec).catch((er: unknown) => {
          // optional deps ignored if inaccessible
          if (type === 'optional' || type === 'peerOptional') {
            return undefined
          }
          throw er
        }),
        fileTypeInfo?.id,
      )

      if (!node) {
        if (type === 'peerOptional' || type === 'optional') {
          return
        }
        throw error('Failed to place node', {
          spec,
          from: fromNode.location,
        })
      }

      /* c8 ignore next - always set by now, but ts doesn't know */
      const mani = node.manifest ?? {}
      if (fileTypeInfo?.path && fileTypeInfo.isDirectory) {
        node.location = fileTypeInfo.path
      }
      node.setResolved()
      const nestedAppends: Promise<unknown>[] = []

      for (const depTypeName of longDependencyTypes) {
        const depRecord: Record<string, string> | undefined =
          mani[depTypeName]

        if (depRecord && shouldInstallDepType(node, depTypeName)) {
          const nextDeps: Dependency[] = Object.entries(
            depRecord,
          ).map(([name, bareSpec]) => ({
            // if foo:a@1 depends on b@2, then it must be foo:b@2
            spec: Spec.parse(name, bareSpec, {
              ...options,
              registry: spec.registry,
            }),
            type: shorten(depTypeName, name, fromNode.manifest),
          }))
          nestedAppends.push(
            appendNodes(
              packageInfo,
              graph,
              node,
              nextDeps,
              scurry,
              options,
            ),
          )
        }
      }
      await Promise.all(nestedAppends)
    }),
  )
