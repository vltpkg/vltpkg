import { inspect } from 'node:util'
import { Edge } from '../edge.js'
import { Graph } from '../graph.js'
import { Node } from '../node.js'

function parseNode(seenNodes: Set<Node>, graph: Graph, node: Node) {
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

function parseEdge(seenNodes: Set<Node>, graph: Graph, edge: Edge) {
  ;(edge as any)[inspect.custom] = () => {
    const extraneousNode = `[extraneous package]: <${edge.name}>`
    const missingNode = `[missing package]: <${edge.name}@${edge.spec.bareSpec}>`
    const toLabel: string =
      edge.to ?
        graph.extraneousDependencies.has(edge) ?
          extraneousNode
        : inspect(parseNode(seenNodes, graph, edge.to), {
            depth: Infinity,
          })
      : missingNode
    return `Edge spec(${edge.spec}) -${edge.type}-> to: ${toLabel}`
  }
  return edge
}

export function humanReadableOutput(graph: Graph) {
  const seenNodes = new Set<Node>()
  const importers = [...graph.importers]
  return inspect(
    importers.map(i => parseNode(seenNodes, graph, i)),
    { depth: Infinity },
  )
}
