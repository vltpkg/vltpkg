import type { DepID } from '@vltpkg/dep-id'
import type { EdgeLike, NodeLike } from '../types.ts'

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
}

export type JSONOutputGraph = {
  edges: EdgeLike[]
  nodes: NodeLike[]
}

/**
 * Returns a JSON string representation of the graph.
 */
export function jsonOutput({ edges, nodes }: JSONOutputGraph) {
  const res: JSONOutputItem[] = []

  // Collects importer nodes as edgeless json output items
  for (const node of nodes) {
    if (node.importer) {
      res.push({
        /* c8 ignore next - name can't be missing but ts won't know */
        name: node.name || node.id,
        to: node,
      })
    }
  }

  // Collects edge & it's linked nodes as json output items
  for (const edge of edges) {
    res.push({
      name: edge.name,
      fromID: edge.from.id,
      spec: String(edge.spec),
      type: edge.type,
      to: edge.to,
    })
  }

  return res
}
