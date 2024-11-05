import { splitDepID } from '@vltpkg/dep-id'
import { type EdgeLike, type NodeLike } from '../types.js'
import { type ChalkInstance } from 'chalk'

// TODO: unicode vs ascii support
const chars = new Map(
  Object.entries({
    connection: '─',
    down: '│',
    'last-child': '└',
    'middle-child': '├',
    t: '┬',
  }),
)

export type TreeItem = {
  name?: string | null
  edge: EdgeLike | undefined
  node: NodeLike | undefined
  prefix: string
  padding: string
  hasSibling: boolean
  deduped: boolean
  include: boolean
  parent: TreeItem | undefined
}

export type HumanReadableOutputOptions = {
  edges: EdgeLike[]
  importers: Set<NodeLike>
  nodes: NodeLike[]
  highlightSelection: boolean
}

export type EdgeMap = Map<NodeLike | undefined, TreeItem>

export type TreeMap = Map<EdgeLike | undefined, EdgeMap>

const isSelected = (
  options: HumanReadableOutputOptions,
  edge?: EdgeLike,
  node?: NodeLike,
) =>
  !!(
    (!node || options.nodes.includes(node)) &&
    (!edge || options.edges.includes(edge))
  )

/**
 * Returns a map of tree items to be printed.
 */
const getTreeItems = (
  initialItems: Set<TreeItem>,
  options: HumanReadableOutputOptions,
) => {
  const seenNodes = new Set<NodeLike>()
  const treeItems: TreeMap = new Map()
  const traverse = new Set<TreeItem>(initialItems)
  for (const item of traverse) {
    if (item.node) {
      if (seenNodes.has(item.node)) {
        item.deduped = true
        continue
      }
      seenNodes.add(item.node)
      const edges = [...item.node.edgesOut.values()].sort(i =>
        Number(i.to?.importer),
      )
      for (const edge of edges) {
        const toItems: EdgeMap =
          treeItems.get(edge) ?? (new Map() as EdgeMap)
        const nextItem: TreeItem = {
          edge,
          node: edge.to,
          hasSibling: false,
          padding: '',
          prefix: '',
          deduped: false,
          include: isSelected(options, edge, edge.to),
          parent: item,
        }
        toItems.set(edge.to, nextItem)
        treeItems.set(edge, toItems)
        traverse.add(nextItem)
      }
    }
  }
  for (const item of [...traverse].reverse()) {
    if (item.include && item.parent) {
      item.parent.include = true
    }
  }
  return treeItems
}

/**
 * Returns a human-readable output of the graph.
 */
export function humanReadableOutput(
  options: HumanReadableOutputOptions,
  viewOptions: { colors: ChalkInstance },
) {
  const { importers } = options
  const { colors } = viewOptions
  const initialItems = new Set<TreeItem>()
  for (const importer of importers) {
    initialItems.add({
      name: importer.name,
      edge: undefined,
      node: importer,
      prefix: '',
      padding: '',
      hasSibling: false,
      deduped: false,
      include: isSelected(options, undefined, importer),
      parent: undefined,
    })
  }
  const treeItems = getTreeItems(initialItems, options)

  let res = ''
  const traverse = (item: TreeItem) => {
    let header = ''
    let content = ''

    const depIdTuple = item.node?.id && splitDepID(item.node.id)
    const customReg = depIdTuple?.[0] === 'registry' && depIdTuple[1]
    const name = `${customReg ? `${customReg}:` : ''}${item.name}`
    const decoratedName =
      (
        options.highlightSelection &&
        isSelected(options, item.edge, item.node)
      ) ?
        colors.yellow(name)
      : name
    if (!item.node && item.include) {
      const missing =
        item.edge?.type.endsWith('ptional') ?
          colors.dim('(missing optional)')
        : colors.red('(missing)')
      return `${item.padding}${item.prefix}${decoratedName} ${missing}\n`
    }

    const deduped = item.deduped ? ` ${colors.dim('(deduped)')}` : ''
    header += `${item.padding}${item.prefix}${decoratedName}${deduped}\n`

    // deduped items need not to be printed or traversed
    if (!item.deduped) {
      const edges = item.node ? [...item.node.edgesOut.values()] : []
      const nextItems = edges.map(i => treeItems.get(i)?.get(i.to))
      const includedItems = nextItems.filter(i => i?.include)

      for (const nextItem of nextItems) {
        /* c8 ignore next -- impossible but TS doesn't know that */
        if (!nextItem) continue

        const parent = item
        const isLast =
          includedItems.indexOf(nextItem) === includedItems.length - 1
        const toName =
          nextItem.node?.version ?
            `${nextItem.node.name}@${nextItem.node.version}`
          : nextItem.node?.name
        const nextChar = isLast ? 'last-child' : 'middle-child'

        nextItem.name =
          (
            nextItem.node?.name &&
            nextItem.edge?.name !== nextItem.edge?.to?.name
          ) ?
            `${nextItem.edge?.name} (${toName})`
          : `${nextItem.edge?.name}@${nextItem.node?.version || nextItem.edge?.spec.bareSpec}`
        nextItem.padding =
          parent.prefix.length ?
            `${parent.padding}${parent.hasSibling ? chars.get('down') : ' '} `
          : ''
        nextItem.prefix = `${chars.get(nextChar)}${chars.get('connection')}${chars.get('connection')} `
        nextItem.hasSibling = !isLast

        content += traverse(nextItem)
      }
    }

    const regularConnection = `${chars.get('connection')} `
    const parentConnection = `${chars.get('t')} `
    return item.include ?
        `${content ? header.replace(regularConnection, parentConnection) : header}${content}`
      : ''
  }

  for (const item of initialItems) {
    res += traverse(item)
  }
  return colors.reset(res)
}
