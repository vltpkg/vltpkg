import { type DepID } from '@vltpkg/dep-id'
import { Edge } from '../edge.js'
import { Node } from '../node.js'
import { type EdgeLike, type NodeLike } from '../types.js'

export type MermaidOutputGraph = {
  edges: EdgeLike[]
  importers: Set<NodeLike>
  nodes: NodeLike[]
}

type TraverseItem = {
  self: EdgeLike | NodeLike
  parent: EdgeLike | NodeLike | undefined
}

let missingCount = 0

const nodeLabel = (node: NodeLike) =>
  `"${String(node).replaceAll('@', '#64;')}"`

function parseNode(
  seenNodes: Set<DepID>,
  includedItems: Map<EdgeLike | NodeLike, boolean>,
  node: NodeLike,
) {
  if (seenNodes.has(node.id) || !includedItems.get(node)) {
    return ''
  }
  seenNodes.add(node.id)
  const edges: string = [...node.edgesOut.values()]
    .map(e => parseEdge(seenNodes, includedItems, e))
    .filter(Boolean)
    .join('\n')
  return `${encodeURIComponent(node.id)}(${nodeLabel(node)})${edges.length ? '\n' : ''}${edges}`
}

function parseEdge(
  seenNodes: Set<DepID>,
  includedItems: Map<EdgeLike | NodeLike, boolean>,
  edge: EdgeLike,
) {
  if (!includedItems.get(edge)) {
    return ''
  }

  const edgeResult =
    `${encodeURIComponent(edge.from.id)}(${nodeLabel(edge.from)})` +
    ` -->|"${String(edge.spec).replaceAll('@', '#64;')} (${edge.type})"| `

  const missingLabel =
    edge.type.endsWith('ptional') ? 'Missing Optional' : 'Missing'
  if (!edge.to) {
    return edgeResult + `missing-${missingCount++}(${missingLabel})\n`
  }

  return (
    edgeResult +
    `${encodeURIComponent(edge.to.id)}(${nodeLabel(edge.to)})\n` +
    parseNode(seenNodes, includedItems, edge.to)
  )
}

/**
 * Returns a mermaid string representation of the graph.
 */
export function mermaidOutput({
  edges,
  importers,
  nodes,
}: MermaidOutputGraph) {
  const seen = new Set<EdgeLike | NodeLike>()
  const includedItems = new Map<EdgeLike | NodeLike, boolean>()
  const traverse = new Set<TraverseItem>(
    [...importers].map(i => ({ self: i, parent: undefined })),
  )

  for (const item of traverse) {
    if (seen.has(item.self)) continue
    seen.add(item.self)

    if (item.self instanceof Edge) {
      if (edges.includes(item.self)) {
        includedItems.set(item.self, true)
      }
      if (item.self.to) {
        traverse.add({ self: item.self.to, parent: item.self })
      }
    }

    if (item.self instanceof Node) {
      if (nodes.includes(item.self)) {
        includedItems.set(item.self, true)
      }
      for (const edge of item.self.edgesOut.values()) {
        traverse.add({ self: edge, parent: item.self })
      }
    }
  }

  for (const item of [...traverse].reverse()) {
    if (includedItems.has(item.self) && item.parent) {
      includedItems.set(item.parent, true)
    }
  }

  return (
    'flowchart TD\n' +
    [...importers]
      .map(i => parseNode(new Set<DepID>(), includedItems, i))
      .join('\n')
  )
}
