import type { DepID } from '@vltpkg/dep-id'
import { Edge } from '../edge.ts'
import { Node } from '../node.ts'
import type { EdgeLike, NodeLike } from '@vltpkg/types'

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

/**
 * Generates a short identifier for a given index following the pattern:
 * 0 -> a, 1 -> b, ..., 25 -> z, 26 -> A, ..., 51 -> Z, 52 -> aa, 53 -> ab, etc.
 * This implements a bijective base-52 numbering system where a-z = 0-25, A-Z = 26-51
 */
export function generateShortId(index: number): string {
  const base = 52

  // Helper function to convert a digit (0-51) to character
  const digitToChar = (digit: number): string => {
    if (digit < 26) {
      // a-z (0-25)
      return String.fromCharCode(97 + digit)
    } else {
      // A-Z (26-51)
      return String.fromCharCode(65 + (digit - 26))
    }
  }

  // Bijective base-52 conversion
  let result = ''
  let num = index + 1 // Convert to 1-based for bijective base

  while (num > 0) {
    num-- // Adjust for 0-based indexing in each position
    const remainder = num % base
    result = digitToChar(remainder) + result
    num = Math.floor(num / base)
  }

  return result
}

/**
 * Creates a mapping from DepID to short identifier
 */
function createDepIdMapping(
  importers: Set<NodeLike>,
): Map<DepID, string> {
  const mapping = new Map<DepID, string>()
  const uniqueDepIds = new Set<DepID>()

  // Collect all unique DepIDs from nodes & importers
  const [importer] = importers
  if (importer) {
    for (const node of importer.graph.nodes.values()) {
      uniqueDepIds.add(node.id)
    }
  }

  // Create mapping for each unique DepID
  let index = 0
  for (const depId of uniqueDepIds) {
    mapping.set(depId, generateShortId(index++))
  }

  return mapping
}

const nodeLabel = (node: NodeLike) =>
  `"${String(node).replaceAll('@', '#64;')}"`

function parseNode(
  seenNodes: Set<DepID>,
  includedItems: Map<EdgeLike | NodeLike, boolean>,
  depIdMapping: Map<DepID, string>,
  node: NodeLike,
) {
  if (seenNodes.has(node.id) || !includedItems.get(node)) {
    return ''
  }
  seenNodes.add(node.id)
  const edges: string = [...node.edgesOut.values()]
    .map(e => parseEdge(seenNodes, includedItems, depIdMapping, e))
    .filter(Boolean)
    .join('\n')
  const shortId = depIdMapping.get(node.id)
  return `${shortId}(${nodeLabel(node)})${edges.length ? '\n' : ''}${edges}`
}

function parseEdge(
  seenNodes: Set<DepID>,
  includedItems: Map<EdgeLike | NodeLike, boolean>,
  depIdMapping: Map<DepID, string>,
  edge: EdgeLike,
) {
  if (!includedItems.get(edge)) {
    return ''
  }

  const fromShortId = depIdMapping.get(edge.from.id)
  const edgeType = edge.type === 'prod' ? '' : ` (${edge.type})`
  const edgeResult =
    `${fromShortId}(${nodeLabel(edge.from)})` +
    ` -->|"${String(edge.spec).replaceAll('@', '#64;')}${edgeType}"| `

  const missingLabel =
    edge.type.endsWith('ptional') ? 'Missing Optional' : 'Missing'
  if (!edge.to) {
    return edgeResult + `missing-${missingCount++}(${missingLabel})\n`
  }

  const toShortId = depIdMapping.get(edge.to.id)
  return (
    edgeResult +
    `${toShortId}(${nodeLabel(edge.to)})\n` +
    parseNode(seenNodes, includedItems, depIdMapping, edge.to)
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

  // Create DepID to short identifier mapping
  const depIdMapping = createDepIdMapping(importers)

  return (
    'flowchart TD\n' +
    [...importers]
      .map(i =>
        parseNode(new Set<DepID>(), includedItems, depIdMapping, i),
      )
      .join('\n')
  )
}
