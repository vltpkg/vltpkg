import { CornerRightDown, MoveRight } from 'lucide-react'
import type { EdgeLike, NodeLike } from '@vltpkg/graph'
import { stringifyNode } from '@vltpkg/graph/browser'
import type { DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec/browser'
import { useGraphStore } from '@/state/index.js'
import { ResultItem } from '@/components/explorer-grid/result-item.jsx'
import { SideItem } from '@/components/explorer-grid/side-item.jsx'
import { SelectedItem } from '@/components/explorer-grid/selected-item.jsx'
import {
  EdgeLoose,
  GridItemData,
} from '@/components/explorer-grid//types.js'

const GridHeader = ({ ...props }) => (
  <div
    className="pt-6 text-xl flex flex-row font-semibold"
    {...props}></div>
)

const getItemsData = (edges: EdgeLike[], nodes: NodeLike[]) => {
  const items: GridItemData[] = []
  const seenEdges = new Map<DepID, Set<EdgeLoose>>()
  const seenItems = new Map<DepID, GridItemData>()
  const allEdges: EdgeLoose[] = [...edges]

  // creates empty edge references for importer nodes
  for (const node of nodes) {
    if (node.importer) {
      const name = node.name || ''
      allEdges.unshift({
        name,
        type: 'prod',
        spec: Spec.parse(
          name || '',
          node.mainImporter ? 'file:.' : `workspace:*`,
        ),
        from: undefined,
        to: node,
      })
    }
  }

  const ids = new Set<string | undefined>(
    allEdges.map(edge => edge.to?.id),
  )
  const stackable = ids.size > 1
  const sameItems = ids.size === 1

  for (const edge of allEdges) {
    if (sameItems && !edge.from && allEdges.length > 1) continue
    const id = edge.to?.id
    const titleVersion =
      edge.spec?.bareSpec ? `@${edge.spec.bareSpec}` : ''
    const title =
      edge.from ? `${edge.name}${titleVersion}` : edge.name
    // will not stack missing packages
    if (!id) {
      items.push({
        ...edge,
        id: `${edge.from?.id}${title}`,
        labels: edge.type ? [edge.type] : [],
        title,
        version: 'Missing package',
        sameItems,
        stacked: false,
        size: 1,
      })
      continue
    }
    // items resolving to the same package will be stacked
    const item = seenItems.get(id)
    if (item && stackable) {
      const seen = seenEdges.get(id)
      seen?.add(edge)
      item.size += 1
      item.stacked = true
      if (title !== item.title) {
        if (item.spec?.bareSpec !== edge.spec?.bareSpec) {
          item.title = item.name
        }
        if (item.name !== edge.name) {
          item.title = `${item.name} and ${item.size} more`
        }
      }
    } else {
      // when nothing was seen, create a new item
      const nodeType: string | undefined =
        edge.to?.dev ? 'dev'
        : edge.to?.optional ? 'optional'
        : undefined
      const workspaceLabel: string | undefined =
        edge.to?.importer && !edge.to.mainImporter ?
          'workspace'
        : undefined
      const labelNames: string[] =
        edge.to?.edgesIn ?
          Array.from(edge.to.edgesIn).map(e => e.type)
        : []
      const labels = Array.from(
        new Set(
          [...labelNames, nodeType, workspaceLabel].filter(
            Boolean,
          ) as string[],
        ),
      )
      const data: GridItemData = {
        ...edge,
        id: `${edge.from?.id}${edge.to?.id}` || title,
        labels,
        title,
        version:
          edge.to ? `Resolves to: ${stringifyNode(edge.to)}` : '',
        sameItems,
        stacked: false,
        size: 1,
      }
      items.push(data)
      seenEdges.set(id, new Set([edge]))
      seenItems.set(id, data)
    }
  }

  // this is a singled out, selected node
  const item = items[0]
  if (item && items.length === 1) {
    item.title = item.to?.name || 'Missing package'
    item.version = item.to?.version ? `v${item.to.version}` : ''
  }

  return items
}

const getParent = (
  edge?: GridItemData,
  node?: NodeLike,
): GridItemData | undefined => {
  if (!node) return undefined
  const version = node.version ? `@${node.version}` : ''
  return {
    ...edge,
    id: node.id,
    name: node.name || '',
    title: `${node.name}${version}`,
    version: '',
    stacked: false,
    size: 1,
    labels: undefined,
  }
}

const getDependentItems = (node?: NodeLike, parent?: NodeLike) => {
  const items: GridItemData[] = []
  if (!node) return items
  for (const edge of Array.from(node.edgesIn)) {
    if (edge.from === parent) continue
    const version = edge.from.version ? `@${edge.from.version}` : ''

    items.push({
      ...edge,
      id: edge.from.id,
      title: `${edge.from.name}${version}`,
      version: '',
      stacked: edge.from.edgesIn.size > 1,
      size: edge.from.edgesIn.size,
      labels: undefined,
    })
  }
  return items
}

const getDependencyItems = (node?: NodeLike) => {
  const items: GridItemData[] = []
  if (!node) return items
  for (const edge of Array.from(node.edgesOut.values())) {
    const title = `${edge.name}@${edge.spec.bareSpec}`
    items.push({
      ...edge,
      id: edge.to?.id || title,
      title,
      version: '',
      stacked: false,
      size: 1,
      labels: [edge.type],
    })
  }
  return items
}

export const ExplorerGrid = () => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  const edges = useGraphStore(state => state.edges)
  const nodes = useGraphStore(state => state.nodes)
  const items = getItemsData(edges, nodes)
  const selected = items.length === 1
  const [selectedItem] = items
  const parent = selected ? selectedItem?.from : undefined
  const parentItem = getParent(selectedItem, parent)
  const dependents =
    selected && getDependentItems(selectedItem?.to, parent)
  const dependencies =
    selected && getDependencyItems(selectedItem?.to)
  const dependentsClick =
    (item: GridItemData, isParent?: boolean) => () => {
      const selectedName =
        selectedItem?.to?.name ?
          `[name="${selectedItem.to.name}"]`
        : ''
      const selectedVersion =
        selectedItem?.to?.version ?
          `[version="${selectedItem.to.version}"]`
        : ''
      const newQuery =
        isParent &&
        query.endsWith(`> ${selectedName}${selectedVersion}`) &&
        query.slice(0, query.lastIndexOf('>'))
      if (newQuery) {
        updateQuery(newQuery)
      } else {
        const name =
          item.from?.name ? `[name="${item.from.name}"]` : ''
        const version =
          item.from?.version ? `[version="${item.from.version}"]` : ''
        updateQuery(`${name}${version}`)
      }
      return undefined
    }
  const dependencyClick = (item: GridItemData) => () => {
    if (!item.to) return
    let newQuery = ''
    const name = item.to.name ? `[name="${item.to.name}"]` : ''
    const version =
      item.to.version ? `[version="${item.to.version}"]` : ''
    newQuery = `${query} > ${name}${version}`
    updateQuery(newQuery)
    return undefined
  }
  return (
    <div className="grid grid-cols-7 gap-4">
      <div className="col-span-2">
        {parentItem ?
          <>
            <GridHeader>
              Parent <CornerRightDown className="mt-1 ml-2" />
            </GridHeader>
            <SideItem
              item={parentItem}
              highlight={true}
              onClick={dependentsClick(parentItem, true)}
            />
          </>
        : ''}
        {dependents && dependents.length > 0 ?
          <>
            <GridHeader>
              Dependents <MoveRight className="mt-1 ml-2" />
            </GridHeader>
            {dependents.map(item => (
              <SideItem
                item={item}
                key={item.id}
                onClick={dependentsClick(item)}
              />
            ))}
          </>
        : ''}
      </div>
      <div className="col-span-3">
        {items.length === 0 ?
          <GridHeader>No Results</GridHeader>
        : items.length > 1 ?
          <GridHeader>Results</GridHeader>
        : <GridHeader>
            Selected Item <CornerRightDown className="mt-1 ml-2" />
          </GridHeader>
        }
        {items.map(item =>
          selected ?
            <SelectedItem item={item} key={item.id} />
          : <ResultItem item={item} key={item.id} />,
        )}
      </div>
      <div className="col-span-2">
        <div className="h-[7.9rem]"></div>
        {dependencies && dependencies.length > 0 ?
          <>
            <GridHeader>
              <MoveRight className="mt-1 ml-2 mr-2" />
              Dependencies
            </GridHeader>
            {dependencies.map(item => (
              <SideItem
                item={item}
                key={item.id}
                dependencies={true}
                onClick={dependencyClick(item)}
              />
            ))}
          </>
        : ''}
      </div>
    </div>
  )
}
