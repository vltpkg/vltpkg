import { Edge } from '../edge.js'
import { Graph } from '../graph.js'
import { Node } from '../node.js'

let missingCount = 0

function parseNode(seenNodes: Set<number>, graph: Graph, node: Node) {
  if (seenNodes.has(node.id)) {
    return ''
  }
  seenNodes.add(node.id)
  const edges: string = [...node.edgesOut.values()]
    .map(e => parseEdge(seenNodes, graph, e))
    .join('\n')
  return `${node.id}(${node.pkg.id})${edges.length ? '\n' : ''}${edges}`
}

function parseEdge(seenNodes: Set<number>, graph: Graph, edge: Edge) {
  const edgeResult =
    String(edge.from.id) +
    ` -->|${graph.packages.dependencyTypes.get(edge.type)}| `

  if (!edge.to) {
    return (
      edgeResult +
      `missing-${missingCount++}(Missing package: ${edge.name}@${edge.spec.bareSpec})\n`
    )
  }

  return (
    edgeResult +
    `${String(edge.to.id)}(${edge.to.pkg.id})\n` +
    parseNode(seenNodes, graph, edge.to)
  )
}

export function mermaidOutput(graph: Graph) {
  const seenNodes: Set<number> = new Set()
  return 'flowchart TD\n' + parseNode(seenNodes, graph, graph.root)
}
