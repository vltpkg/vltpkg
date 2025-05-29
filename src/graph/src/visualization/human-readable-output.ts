import { splitDepID } from '@vltpkg/dep-id'
import type { EdgeLike, NodeLike } from '../types.ts'
import { styleText as utilStyleText } from 'node:util'

const styleText = (
  format: Parameters<typeof utilStyleText>[0],
  s: string,
) => utilStyleText(format, s, { validateStream: false })

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
  seen: boolean
  include: boolean
  parent: TreeItem | undefined
}

export type HumanReadableOutputGraph = {
  edges: EdgeLike[]
  importers: Set<NodeLike>
  nodes: NodeLike[]
  highlightSelection?: boolean
}

export type EdgeMap = Map<NodeLike | undefined, TreeItem>

export type TreeMap = Map<EdgeLike | undefined, EdgeMap>

const isSelected = (
  options: HumanReadableOutputGraph,
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
  options: HumanReadableOutputGraph,
) => {
  const seenNodes = new Set<NodeLike>()
  const treeItems: TreeMap = new Map()
  const traverse = new Set<TreeItem>(initialItems)
  for (const item of traverse) {
    if (item.node) {
      if (seenNodes.has(item.node)) {
        item.seen = true
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
          seen: false,
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
  options: HumanReadableOutputGraph,
  { colors }: { colors?: boolean },
) {
  const { importers } = options
  const createStyleText =
    (style: Parameters<typeof styleText>[0]) => (s: string) =>
      colors ? styleText(style, s) : s
  const dim = createStyleText('dim')
  const red = createStyleText('red')
  const reset = createStyleText('reset')
  const yellow = createStyleText('yellow')
  const initialItems = new Set<TreeItem>()
  for (const importer of importers) {
    initialItems.add({
      name: importer.name,
      edge: undefined,
      node: importer,
      prefix: '',
      padding: '',
      hasSibling: false,
      seen: false,
      include: isSelected(options, undefined, importer),
      parent: undefined,
    })
  }
  const treeItems = getTreeItems(initialItems, options)

  let res = ''
  const traverse = (item: TreeItem) => {
    let header = ''
    let content = ''

    const name = item.name
    const decoratedName =
      (
        options.highlightSelection &&
        isSelected(options, item.edge, item.node) &&
        name
      ) ?
        yellow(name)
      : name
    if (!item.node && item.include) {
      const missing =
        item.edge?.type.endsWith('ptional') ?
          dim('(missing optional)')
        : red('(missing)')
      return `${item.padding}${item.prefix}${decoratedName} ${missing}\n`
    }

    header += `${item.padding}${item.prefix}${decoratedName}\n`

    // seen items need not to be printed or traversed
    if (!item.seen) {
      const edges = item.node ? [...item.node.edgesOut.values()] : []
      const nextItems = edges.map(i => treeItems.get(i)?.get(i.to))
      const includedItems = nextItems.filter(i => i?.include)

      for (const nextItem of nextItems) {
        /* c8 ignore next -- impossible but TS doesn't know that */
        if (!nextItem) continue

        const parent = item
        const isLast =
          includedItems.indexOf(nextItem) === includedItems.length - 1

        // prefixes the node name with the registry name
        // if a custom registry name is found
        const depIdTuple =
          nextItem.node?.id && splitDepID(nextItem.node.id)
        const hasCustomReg =
          depIdTuple?.[0] === 'registry' && depIdTuple[1]
        const nodeName =
          hasCustomReg ?
            `${depIdTuple[1]}:${nextItem.node?.name}`
          : nextItem.node?.name

        const toName =
          nextItem.node?.version ?
            `${nodeName}@${nextItem.node.version}`
          : nodeName
        const nextChar = isLast ? 'last-child' : 'middle-child'

        nextItem.name =
          nextItem.node?.confused ?
            `${nextItem.edge?.name} ${red('(confused)')}`
          : nextItem.node?.name && nextItem.edge?.name !== nodeName ?
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
  return reset(res)
}
