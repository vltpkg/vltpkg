import { inspect } from 'node:util'
import { EdgeLike, GraphLike, NodeLike } from '../types.js'

function parseNode(
  seenNodes: Set<NodeLike>,
  graph: GraphLike,
  node: NodeLike,
) {
  ;(node as any)[inspect.custom] = (): string => {
    const res =
      'Node ' +
      inspect(
        seenNodes.has(node) ?
          { ref: node.id }
        : {
            id: node.id,
            location: node.location,
            ...(node.importer ? { importer: true } : null),
            ...(node.dev ? { dev: true } : null),
            ...(node.optional ? { optional: true } : null),
            ...(node.resolved ? { resolved: node.resolved } : null),
            ...(node.integrity ?
              { integrity: node.integrity }
            : null),
            ...(node.edgesOut.size ?
              {
                edgesOut: [...node.edgesOut.values()].map(i => {
                  seenNodes.add(node)
                  return parseEdge(seenNodes, graph, i)
                }),
              }
            : (seenNodes.add(node), null)),
          },
        { depth: Infinity },
      )
    return res
  }
  return node
}

function parseEdge(
  seenNodes: Set<NodeLike>,
  graph: GraphLike,
  edge: EdgeLike,
) {
  ;(edge as any)[inspect.custom] = () => {
    const missingNode = `[missing package]: <${edge.name}@${edge.spec.bareSpec}>`
    const toLabel: string =
      edge.to ?
        inspect(parseNode(seenNodes, graph, edge.to), {
          depth: Infinity,
        })
      : missingNode
    return `Edge spec(${String(edge.spec)}) -${edge.type}-> to: ${toLabel}`
  }
  return edge
}

export function objectLikeOutput(graph: GraphLike) {
  const seenNodes = new Set<NodeLike>()
  const importers = [...graph.importers]
  return inspect(
    importers.map(i => parseNode(seenNodes, graph, i)),
    { depth: Infinity },
  )
}
