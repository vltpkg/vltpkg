import { relative } from 'node:path'
import { inspect } from 'node:util'
import { DepID } from '@vltpkg/dep-id'
import { dependencyTypes } from '../dependencies.js'
import { Graph } from '../graph.js'
import { Node } from '../node.js'
import { Edge } from '../edge.js'

function parseNode(seenNodes: Set<DepID>, graph: Graph, node: Node) {
  ;(node as any)[inspect.custom] = (): string => {
    const res =
      'Node ' +
      inspect(
        {
          id: node.id,
          location: node.location,
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

function parseEdge(seenNodes: Set<DepID>, graph: Graph, edge: Edge) {
  ;(edge as any)[inspect.custom] = () => {
    const missingNode: string = `[missing package]: <${edge.name}@${edge.spec.bareSpec}>`
    const toLabel: string =
      edge.to ?
        inspect(parseNode(seenNodes, graph, edge.to), {
          depth: Infinity,
        })
      : missingNode
    return `Edge -${dependencyTypes.get(edge.type)}-> to: ${toLabel}`
  }
  return edge
}

export function humanReadableOutput(graph: Graph) {
  const seenNodes: Set<DepID> = new Set()
  return parseNode(seenNodes, graph, graph.mainImporter)
}
