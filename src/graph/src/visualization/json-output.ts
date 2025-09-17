import type { DepID } from '@vltpkg/dep-id'
import type { EdgeLike, NodeLike } from '@vltpkg/types'

/**
 * A JSON output item describes a package that is present in the install
 * graph. It represents an edge plus it's linking Node.
 */
export type JSONOutputItem = {
  /**
   * The name of the package.
   */
  name: string
  /**
   * A reference to the id of the Node that this package is linked from.
   */
  fromID?: DepID
  /**
   * The dependency spec definition for this package.
   */
  spec?: string
  /**
   * The package type.
   */
  type?: EdgeLike['type']
  /**
   * A representation of the package object that fulfills this dependency.
   */
  to?: NodeLike
  /**
   * Whether this edge was overridden by a graph modifier.
   */
  overridden: boolean
}

export type JSONOutputGraph = {
  edges: EdgeLike[]
  importers: Set<NodeLike>
}

/**
 * Returns a JSON string representation of the graph.
 */
export function jsonOutput({ edges, importers }: JSONOutputGraph) {
  const res: JSONOutputItem[] = []
  const seenIds = new Set<DepID>()

  // Collects edge & it's linked nodes as json output items
  const orderedEdges = [...edges].sort((a, b) => {
    const aIsWorkspace = a.spec.type === 'workspace'
    const bIsWorkspace = b.spec.type === 'workspace'
    if (aIsWorkspace && !bIsWorkspace) return -1
    /* c8 ignore next */
    if (!aIsWorkspace && bIsWorkspace) return 1
    return 0 // preserve original order otherwise
  })
  for (const edge of orderedEdges) {
    if (edge.to) seenIds.add(edge.to.id)
    res.push({
      name: edge.name,
      fromID: edge.from.id,
      spec: String(edge.spec),
      type: edge.type,
      to: edge.to,
      overridden: edge.spec.overridden,
    })
  }

  // Collects included importer nodes json output items
  /* c8 ignore next 3 */
  const orderedImporters = [...importers].sort((a, b) => {
    if (!a.name) return 1
    if (!b.name) return -1
    return a.name.localeCompare(b.name)
  })
  for (const node of orderedImporters) {
    if (seenIds.has(node.id)) continue
    res.unshift({
      /* c8 ignore next - name can't be missing but ts won't know */
      name: node.name || node.id,
      to: node,
      overridden: false,
    })
  }

  return res
}
