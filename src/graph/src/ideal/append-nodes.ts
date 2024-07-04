import { join } from 'node:path/posix'
import { PackageInfoClient } from '@vltpkg/package-info'
import { Spec, SpecOptions } from '@vltpkg/spec'
import {
  Dependency,
  DependencyTypeLong,
  longDependencyTypes,
  shorten,
} from '../dependencies.js'
import { Graph } from '../graph.js'
import { Node } from '../node.js'
import { error } from '@vltpkg/error-cause'
import { DepID, joinDepIDTuple } from '@vltpkg/dep-id'

interface FileTypeInfo {
  id: DepID
  path: string
}

// TODO: peer deps
const shouldInstallDepType = (
  node: Node,
  depType: DependencyTypeLong,
) =>
  // TODO: install dev deps for git & file (symlinks) type spec
  // manifest -> scripts.prepare
  depType === 'dependencies' ||
  depType === 'optionalDependencies' ||
  (depType === 'devDependencies' && node.importer)

/**
 * Retrieve the {@link DepID} and location for a `file:` type {@link Node}.
 */
const getFileTypeInfo = (
  spec: Spec,
  fromNode: Node,
): FileTypeInfo | undefined => {
  if (spec.type !== 'file') return

  const f = spec.final
  if (!f.file) {
    throw error('no path on file specifier', { spec })
  }

  // Given that both linked folders and local tarballs (both defined with
  // usage of the `file:` spec prefix) location needs to be relative to their
  // parents, build the expected path and use it for both location and id
  const path = join(fromNode.location, f.file)
  const id = joinDepIDTuple(['file', path])

  return {
    path,
    id,
  }
}

export const appendNodes = async (
  packageInfo: PackageInfoClient,
  graph: Graph,
  fromNode: Node,
  deps: Dependency[],
  config: SpecOptions,
) => {
  // TODO: create one queue and promise all at the end
  await Promise.all(
    deps.map(async ({ spec, type }) => {
      // TODO: check existing satisfying nodes currently in the graph
      // before hitting packageInfo.manifest
      const mani = await packageInfo.manifest(spec)
      const fileTypeInfo = getFileTypeInfo(spec, fromNode)
      const node = graph.placePackage(
        fromNode,
        type,
        spec,
        mani,
        fileTypeInfo?.id,
      )

      if (!node) {
        throw error('Failed to place a node for manifest', {
          manifest: mani,
        })
      }

      if (fileTypeInfo?.path) {
        node.location = fileTypeInfo.path
      }
      node.setResolved()
      const nestedAppends: Promise<void>[] = []

      for (const depTypeName of longDependencyTypes) {
        const depRecord: Record<string, string> | undefined =
          mani[depTypeName]

        if (depRecord && shouldInstallDepType(node, depTypeName)) {
          const nextDeps: Dependency[] = Object.entries(
            depRecord,
          ).map(([name, bareSpec]) => ({
            spec: Spec.parse(name, bareSpec, config as SpecOptions),
            type: shorten(depTypeName, name, fromNode.manifest),
          }))
          nestedAppends.push(
            appendNodes(packageInfo, graph, node, nextDeps, config),
          )
        }
      }
      await Promise.all(nestedAppends)
    }),
  )
}
