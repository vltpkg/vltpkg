import { InspectOptions } from 'node:util'
import { Edge } from './edge.js'
import { Graph } from './graph.js'
import { Node } from './node.js'

// XXX should file; deps *always* be considered changed?
// unless the thing containing it wasn't possibly changed because it's inside
// a dep that didn't change?
// Same with remote deps

const kCustomInspect = Symbol.for('nodejs.util.inspect.custom')

/**
 * A Diff object is a representation of a set of changes from one
 * graph to another, typically from the actual graph as it is reified
 * on disk, to an intended ideal graph.
 *
 * The naming convention can get a bit confusing here, because it's a
 * set of directed changes from one set of directed objects to another.
 *
 * Within the context the Diff object, `from` is the Graph we're coming from,
 * and `to` is the Graph we're trying to create.
 */
export class Diff {
  from: Graph
  to: Graph

  /**
   * Collection of nodes to add and delete
   */
  nodes = {
    /** Nodes in the `to` graph that are not in the `from` graph */
    add: new Set<Node>(),
    /** Nodes in the `from` graph that are not in the `to` graph */
    delete: new Set<Node>(),
  }

  /**
   * Collection of nodes to add and delete
   */
  edges = {
    /** Edges in the `to` graph that are not found in the `from` graph */
    add: new Set<Edge>(),
    /** Edges in the `from` graph that are not found in the `to` graph */
    delete: new Set<Edge>(),
  }

  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Diff'
  }

  constructor(from: Graph, to: Graph) {
    this.from = from
    this.to = to

    for (const [id, node] of this.from.nodes) {
      if (!this.to.nodes.get(id)?.equals(node)) {
        this.nodes.delete.add(node)
      }
    }

    for (const [id, node] of this.to.nodes) {
      if (!this.from.nodes.get(id)?.equals(node)) {
        this.nodes.add.add(node)
      }
    }

    for (const edge of this.to.edges) {
      // the node with this dep, in the from  graph
      const fromNode = this.from.nodes.get(edge.from.id)
      const fromEdge = fromNode?.edgesOut.get(edge.spec.name)
      if (fromEdge?.to?.id === edge.to?.id) continue
      if (fromEdge?.to) this.edges.delete.add(fromEdge)
      if (edge.to) this.edges.add.add(edge)
    }
    for (const edge of this.from.edges) {
      // the node with this dep, in the to graph
      const toNode = this.to.nodes.get(edge.from.id)
      const toEdge = toNode?.edgesOut.get(edge.spec.name)
      if (toEdge?.to?.id === edge.to?.id) continue
      if (edge.to) this.edges.delete.add(edge)
      if (toEdge?.to) this.edges.add.add(toEdge)
    }
  }

  [kCustomInspect](_: number, options?: InspectOptions): string {
    const red: [string, string] =
      options?.colors ? ['\x1b[31m', '\x1b[m'] : ['', '']
    const green: [string, string] =
      options?.colors ? ['\x1b[32m', '\x1b[m'] : ['', '']
    const lines: string[] = []
    for (const node of this.nodes.add) {
      lines.push(`+ ${node.id}`)
    }
    for (const node of this.nodes.delete) {
      lines.push(`- ${node.id}`)
    }
    for (const edge of this.edges.add) {
      /* c8 ignore next */
      const to = edge.to?.id ?? ''
      lines.push(
        `+ ${edge.from.id} ${edge.type} ${edge.spec} ${to}`.trim(),
      )
    }
    for (const edge of this.edges.delete) {
      /* c8 ignore next */
      const to = edge.to?.id ?? ''
      lines.push(
        `- ${edge.from.id} ${edge.type} ${edge.spec} ${to}`.trim(),
      )
    }
    const wrap = (s: string, c: [string, string]) => c.join(s)
    const color =
      options?.colors ?
        (s: string) => wrap(s, s.startsWith('+') ? green : red)
      : (s: string) => s

    return `${this[Symbol.toStringTag]} {
${lines
  .sort((a, b) => a.substring(1).localeCompare(b.substring(1), 'en'))
  .map(s => '  ' + color(s))
  .join('\n')}
}`
  }
}
