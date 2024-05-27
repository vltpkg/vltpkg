import { DepID, hydrate } from '@vltpkg/dep-id'
import { dependencyTypes } from '../dependencies.js'
import { Edge } from '../edge.js'
import { Graph } from '../graph.js'
import { Node } from '../node.js'

let missingCount = 0

const readableId = (id: DepID) => {
  const spec = hydrate(id)
  return String(spec.type === 'registry' ? spec : spec.bareSpec)
}

function parseNode(seenNodes: Set<DepID>, graph: Graph, node: Node) {
  if (seenNodes.has(node.id)) {
    return ''
  }
  seenNodes.add(node.id)
  const edges: string = [...node.edgesOut.values()]
    .map(e => parseEdge(seenNodes, graph, e))
    .join('\n')
  return `${encodeURIComponent(readableId(node.id))}(${readableId(node.id)})${edges.length ? '\n' : ''}${edges}`
}

function parseEdge(seenNodes: Set<DepID>, graph: Graph, edge: Edge) {
  const edgeResult =
    `${encodeURIComponent(readableId(edge.from.id))}(${readableId(edge.from.id)})` +
    ` -->|${dependencyTypes.get(edge.type)}| `

  if (!edge.to) {
    return (
      edgeResult +
      `missing-${missingCount++}(Missing package: ${edge.name}@${edge.spec.bareSpec})\n`
    )
  }

  return (
    edgeResult +
    `${encodeURIComponent(readableId(edge.to.id))}(${readableId(edge.to.id)})\n` +
    parseNode(seenNodes, graph, edge.to)
  )
}

export function mermaidOutput(graph: Graph) {
  const seenNodes: Set<DepID> = new Set()
  return (
    'flowchart TD\n' + parseNode(seenNodes, graph, graph.mainImporter)
  )
}
