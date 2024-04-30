import { relative } from 'node:path'
import { inspect } from 'node:util'
import { Graph } from '../graph.js'
import { Node } from '../node.js'
import { Edge } from '../edge.js'
import { Package } from '../pkgs.js'

function parseNode(seenNodes: Set<number>, graph: Graph, node: Node) {
  ;(node as any)[inspect.custom] = (): string => {
    const res =
      'Node ' +
      inspect(
        {
          pkg: parsePackage(node.pkg),
          ...((
            node.edgesOut &&
            node.edgesOut.size &&
            !seenNodes.has(node.id)
          ) ?
            {
              edgesOut: [...node.edgesOut.values()].map(i =>
                parseEdge(seenNodes, graph, i),
              ),
            }
          : null),
        },
        { depth: Infinity },
      )
    seenNodes.add(node.id)
    return res
  }
  return node
}

function parseEdge(seenNodes: Set<number>, graph: Graph, edge: Edge) {
  ;(edge as any)[inspect.custom] = () => {
    const missingNode: string = `[missing package]: <${edge.name}@${edge.spec.bareSpec}>`
    const toLabel: string =
      edge.to ?
        inspect(parseNode(seenNodes, graph, edge.to), {
          depth: Infinity,
        })
      : missingNode
    return `Edge -${graph.packages.dependencyTypes.get(edge.type)}-> to: ${toLabel}`
  }
  return edge
}

function parsePackage(pkg: Package) {
  const tarballLabel = pkg.tarball ? ` ${pkg.tarball}` : ''
  const locationLabel =
    pkg.location ? ` ${relative(process.cwd(), pkg.location)}` : ''
  ;(pkg as any)[inspect.custom] = (): string =>
    `<${pkg.id}>${tarballLabel}${locationLabel}`
  return pkg
}

export function humanReadableOutput(graph: Graph) {
  const seenNodes: Set<number> = new Set()
  return parseNode(seenNodes, graph, graph.root)
}
