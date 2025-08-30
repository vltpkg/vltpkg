import { error } from '@vltpkg/error-cause'
import type { InspectOptions } from 'node:util'
import type { Edge } from './edge.ts'
import type { Graph } from './graph.ts'
import type { Node } from './node.ts'

// XXX should file deps *always* be considered changed?
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

  projectRoot: string

  /**
   * If changes need to be made later for failures of optional nodes,
   * set this flag so that we know to call graph.gc() at the appropriate time.
   */
  hadOptionalFailures = false

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

  /**
   * True if the diff only contains optional nodes (computed during construction)
   */
  optionalOnly = true

  get [Symbol.toStringTag]() {
    return '@vltpkg/graph.Diff'
  }

  constructor(from: Graph, to: Graph) {
    this.from = from
    this.to = to
    this.projectRoot = from.projectRoot
    if (to.projectRoot !== from.projectRoot) {
      throw error('projectRoot mismatch in Graph diff', {
        wanted: from.projectRoot,
        found: to.projectRoot,
      })
    }

    // Optimized single-pass node diff - O(n) instead of O(2n)
    const allNodeIds = new Set([
      ...this.from.nodes.keys(),
      ...this.to.nodes.keys(),
    ])
    for (const id of allNodeIds) {
      const fromNode = this.from.nodes.get(id)
      const toNode = this.to.nodes.get(id)

      if (!fromNode && toNode) {
        // Node was added
        this.nodes.add.add(toNode)
        if (!toNode.optional) this.optionalOnly = false
      } else if (fromNode && !toNode) {
        // Node was deleted
        this.nodes.delete.add(fromNode)
      } else if (fromNode && toNode && !fromNode.equals(toNode)) {
        // Node was modified (delete old, add new)
        this.nodes.delete.add(fromNode)
        this.nodes.add.add(toNode)
        if (!toNode.optional) this.optionalOnly = false
      }
    }

    // Optimized single-pass edge diff - O(m) instead of O(2m)
    // Build edge lookup maps once to avoid repeated traversals
    const fromEdgeMap = new Map<string, Edge>()
    const toEdgeMap = new Map<string, Edge>()

    for (const edge of this.from.edges) {
      fromEdgeMap.set(`${edge.from.id}:${edge.spec.name}`, edge)
    }
    for (const edge of this.to.edges) {
      toEdgeMap.set(`${edge.from.id}:${edge.spec.name}`, edge)
    }

    // Single pass through unique edge keys
    const allEdgeKeys = new Set([
      ...fromEdgeMap.keys(),
      ...toEdgeMap.keys(),
    ])
    for (const key of allEdgeKeys) {
      const fromEdge = fromEdgeMap.get(key)
      const toEdge = toEdgeMap.get(key)

      if (!fromEdge && toEdge) {
        // Edge was added
        if (toEdge.to) this.edges.add.add(toEdge)
      } else if (fromEdge && !toEdge) {
        // Edge was deleted
        if (fromEdge.to) this.edges.delete.add(fromEdge)
      } else if (
        fromEdge &&
        toEdge &&
        fromEdge.to?.id !== toEdge.to?.id
      ) {
        // Edge target changed
        if (fromEdge.to) this.edges.delete.add(fromEdge)
        if (toEdge.to) this.edges.add.add(toEdge)
      }
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

  hasChanges(): boolean {
    return (
      this.nodes.add.size > 0 ||
      this.nodes.delete.size > 0 ||
      this.edges.add.size > 0 ||
      this.edges.delete.size > 0
    )
  }
}
