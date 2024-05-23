import { Spec } from '@vltpkg/spec'
import { Graph } from './graph.js'
import { Node } from './node.js'
import {
  dependencyTypes,
  DependencyTypeLong,
} from './dependencies.js'

// TODO: peer deps
const shouldInstallDepType = (
  node: Node,
  depType: DependencyTypeLong,
) =>
  depType === 'dependencies' ||
  depType === 'optionalDependencies' ||
  (depType === 'devDependencies' && node.importer)

export const appendNodes = async (
  graph: Graph,
  fromNode: Node,
  addSpecs: Spec[],
  depType: DependencyTypeLong,
) => {
  const { packageInfo } = graph

  // TODO: create one queue and promise all at the end
  await Promise.all(
    addSpecs.map(async spec => {
      // TODO: check existing satisfying nodes currently in the graph
      // before hitting packageInfo.manifest
      const mani = await packageInfo.manifest(spec)
      const node = graph.placePackage(fromNode, depType, spec, mani)

      if (!node) return

      const nestedAppends: Promise<void>[] = []

      for (const nextDepType of dependencyTypes.keys()) {
        const depRecord: Record<string, string> | undefined =
          mani[nextDepType]

        if (depRecord && shouldInstallDepType(node, nextDepType)) {
          const addSpecs: Spec[] = Object.entries(depRecord).map(
            ([name, bareSpec]) => Spec.parse(name, bareSpec),
          )
          nestedAppends.push(
            appendNodes(graph, node, addSpecs, nextDepType),
          )
        }
      }
      await Promise.all(nestedAppends)
    }),
  )
}
