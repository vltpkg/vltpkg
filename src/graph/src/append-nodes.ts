import { PackageInfoClient } from '@vltpkg/package-info'
import { Spec, SpecOptions } from '@vltpkg/spec'
import {
  Dependency,
  DependencyTypeLong,
  longDependencyTypes,
  shorten,
} from './dependencies.js'
import { Graph } from './graph.js'
import { Node } from './node.js'

// TODO: peer deps
const shouldInstallDepType = (
  node: Node,
  depType: DependencyTypeLong,
) =>
  depType === 'dependencies' ||
  depType === 'optionalDependencies' ||
  (depType === 'devDependencies' && node.importer)

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
      const node = graph.placePackage(fromNode, type, spec, mani)

      if (!node) return

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
