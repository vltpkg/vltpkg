import { error } from '@vltpkg/error-cause'
import { DependencyTypeLong, Edge, Graph, Node } from '@vltpkg/graph'

export type ItemRef = 'root' | 'node' | 'edge' | 'symbolic'

export interface Item {
  children: Item[]
  preOrderIndex: number
  postOrderIndex?: number
  pkg?: string
  spec?: string
  type?: DependencyTypeLong
}

export const createStorageTree = (graph: Graph) => {
  const seenNodes = new Set()
  const postOrderIndexes: number[] = []
  let index = 0

  const parseNode = (node: Node): Item => {
    const res: Item = {
      children: [],
      preOrderIndex: index++,
      pkg: node.pkg.id,
    }
    seenNodes.add(node)
    for (const edge of node.edgesOut.values()) {
      res.children.push(parseEdge(edge))
    }
    return res
  }

  const parseEdge = (edge: Edge): Item => {
    const { spec, type } = edge
    let toRes, pkg
    let preOrderIndex = 0

    if (edge.to) {
      if (seenNodes.has(edge.to)) {
        preOrderIndex = index++
        pkg = edge.to.pkg.id
      } else {
        toRes = parseNode(edge.to)
      }
    } else {
      preOrderIndex = index++
    }

    return {
      children: [],
      preOrderIndex,
      pkg,
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
      const preOrder = item.preOrderIndex
      const postOrder = item.postOrderIndex
      const spec = item.spec || ''
      const type =
        item.type ? graph.packages.dependencyTypes.get(item.type) : ''
      const pkg = item.pkg ?? ''
      const formattedResult = `${spec}; ${type}; ${pkg}`

      res[preOrder] = formattedResult
      postOrderIndexes[preOrder] = postOrder
      for (const child of item.children) {
        visit(child)
      }
    }
    visit(item)
    return res
  }

  const root = parseNode(graph.root)
  postOrderIndexing(root)
  return {
    tree: flattenTree(root),
    treeId: Buffer.from(postOrderIndexes).toString('base64'),
  }
}
