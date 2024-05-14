import { error } from '@vltpkg/error-cause'
import {
  DependencyTypeLong,
  Edge,
  Graph,
  Node,
  Package,
} from '@vltpkg/graph'

export type ItemRef = 'root' | 'node' | 'edge' | 'symbolic'

export interface Item {
  children: Item[]
  ref: ItemRef
  preOrderIndex: number
  postOrderIndex?: number
  pkg?: number
  name?: string
  spec?: string
  type?: DependencyTypeLong
}

export const createStorageTree = (
  graph: Graph,
  packages: Package[],
) => {
  const seenNodes = new Set()
  let index = 0

  const parseNode = (node: Node): Item => {
    const res: Item = {
      ref: node.isRoot ? 'root' : 'node',
      children: [],
      preOrderIndex: index++,
      name: node.pkg.name,
      pkg: packages.indexOf(graph.packages.get(node.pkg.id)),
    }
    seenNodes.add(node)
    for (const edge of node.edgesOut.values()) {
      res.children.push(parseEdge(edge))
    }
    return res
  }

  const parseEdge = (edge: Edge): Item => {
    const { name, spec, type } = edge
    let ref: ItemRef = 'edge'
    let toRes, pkg
    let preOrderIndex = 0

    if (edge.to) {
      if (seenNodes.has(edge.to)) {
        ref = 'symbolic'
        preOrderIndex = index++
        pkg = packages.indexOf(graph.packages.get(edge.to.pkg.id))
      } else {
        toRes = parseNode(edge.to)
      }
    } else {
      preOrderIndex = index++
    }

    return {
      ref,
      children: [],
      preOrderIndex,
      pkg,
      name,
      spec: spec.spec,
      type,
      ...toRes,
    }
  }

  const postOrderIndexing = (item: Item) => {
    let index = 0
    const assignIndex = (item: Item) => {
      for (const child of item.children) {
        assignIndex(child)
      }
      item.postOrderIndex = index++
    }
    assignIndex(item)
  }

  const flattenTree = (item: Item) => {
    const res: string[] = []
    const visit = (item: Item) => {
      /* c8 ignore next 6 */
      if (item.postOrderIndex == null) {
        throw error(
          `Malformed tree, item missing postOrderIndex: Item { spec: ${item.spec} }}`,
          { found: item, spec: item.spec },
        )
      }
      const ref = item.ref[0]
      const preOrder = item.preOrderIndex
      const postOrder = item.postOrderIndex
      const name = item.name
      const spec = item.spec || ''
      const type =
        item.type ? graph.packages.dependencyTypes.get(item.type) : ''
      const pkg = item.pkg ?? ''
      const formattedResult = `${name}; ${spec}; ${type}; ${postOrder}; ${pkg}`

      res[preOrder] = formattedResult
      for (const child of item.children) {
        visit(child)
      }
    }
    visit(item)
    return res
  }

  const root = parseNode(graph.root)
  postOrderIndexing(root)
  return flattenTree(root)
}
