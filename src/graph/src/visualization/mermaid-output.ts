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

/**
 * Returns a node reference: on the first occurrence of a node, returns the full label;
 * on subsequent occurrences, returns just the shortId.
 *
 * Note: Mutates the `labeledNodes` set as a side effect to track which nodes have already
 * been labeled. This tracking is shared across multiple importers to prevent duplicate
 * labels in the output.
 */
const nodeRef = (
  node: NodeLike,
  labeledNodes: Set<DepID>,
  depIdMapping: Map<DepID, string>,
): string => {
  const shortId =
    depIdMapping.get(
      node.id,
    ) /* c8 ignore next - should not be possible */ ?? ''
  if (labeledNodes.has(node.id)) {
    return shortId
  }
  labeledNodes.add(node.id)
  return `${shortId}("${String(node).replaceAll('@', '#64;')}")`
}

function parseNode(
  seenNodes: Set<DepID>,
  labeledNodes: Set<DepID>,
  includedItems: Map<EdgeLike | NodeLike, boolean>,
  depIdMapping: Map<DepID, string>,
  node: NodeLike,
  isImporter = false,
) {
  if (seenNodes.has(node.id) || !includedItems.get(node)) {
    return ''
  }
  seenNodes.add(node.id)
  // For importers, render the node label first as a standalone line before processing edges,
  // since they appear at the top of the graph. Non-importer nodes are labeled inline as part of edge definitions.
  const nodeLabel =
    isImporter ? nodeRef(node, labeledNodes, depIdMapping) : ''
  const edges: string = [...node.edgesOut.values()]
    .map(e =>
      parseEdge(
        seenNodes,
        labeledNodes,
        includedItems,
        depIdMapping,
        e,
      ),
    )
    .filter(Boolean)
    .join('\n')
  // Only render node standalone for importers, others are rendered as part of edges
  if (isImporter) {
    return `${nodeLabel}${edges.length ? '\n' : ''}${edges}`
  }
  return edges
}

function parseEdge(
  seenNodes: Set<DepID>,
  labeledNodes: Set<DepID>,
  includedItems: Map<EdgeLike | NodeLike, boolean>,
  depIdMapping: Map<DepID, string>,
  edge: EdgeLike,
) {
  if (!includedItems.get(edge)) {
    return ''
  }

  const edgeType = edge.type === 'prod' ? '' : ` (${edge.type})`
  const edgeResult =
    nodeRef(edge.from, labeledNodes, depIdMapping) +
    ` -->|"${String(edge.spec).replaceAll('@', '#64;')}${edgeType}"| `

  const missingLabel =
    edge.type.endsWith('ptional') ? 'Missing Optional' : 'Missing'
  if (!edge.to) {
    return edgeResult + `missing-${missingCount++}(${missingLabel})`
  }

  // Label the target node BEFORE processing its children
  const toRef = nodeRef(edge.to, labeledNodes, depIdMapping)
  const childEdges = parseNode(
    seenNodes,
    labeledNodes,
    includedItems,
    depIdMapping,
    edge.to,
  )
  return edgeResult + toRef + (childEdges ? '\n' + childEdges : '')
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

  // Track nodes that have had their label printed (shared across all importers)
  const labeledNodes = new Set<DepID>()

  return (
    'flowchart TD\n' +
    [...importers]
      .map(i =>
        parseNode(
          new Set<DepID>(),
          labeledNodes,
          includedItems,
          depIdMapping,
          i,
          true, // isImporter
        ),
      )
      .filter(Boolean)
      .join('\n')
  )
}
