import {
  GalleryVertical,
  GalleryVerticalEnd,
  GalleryThumbnails,
  Package,
} from 'lucide-react'
import {
  type EdgeLike,
  type NodeLike,
  longDependencyTypes,
  shorten,
  stringifyNode,
} from '@vltpkg/graph/browser'
import { type DepID } from '@vltpkg/dep-id'
import { Spec } from '@vltpkg/spec/browser'
import { useGraphStore } from '@/state/index.js'
import { ResultItem } from '@/components/explorer-grid/result-item.jsx'
import { SideItem } from '@/components/explorer-grid/side-item.jsx'
import { SelectedItem } from '@/components/explorer-grid/selected-item.jsx'
import {
  type EdgeLoose,
  type GridItemData,
} from '@/components/explorer-grid/types.js'
import { GridHeader } from '@/components/explorer-grid/header.jsx'
import { DependencySideBar } from '@/components/explorer-grid/dependency-side-bar.jsx'
import { EmptyResultsState } from '@/components/explorer-grid/empty-results-state.jsx'
import { Badge } from '@/components/ui/badge.jsx'

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
        version: edge.to ? stringifyNode(edge.to) : '',
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

  return items.sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

const getParent = (
  edge?: GridItemData,
  node?: NodeLike,
): GridItemData | undefined => {
  if (!node) return undefined
  const edgeVersion =
    edge?.spec?.bareSpec ? `@${edge.spec.bareSpec}` : ''
  const title = edge?.name ? `${edge.name}${edgeVersion}` : ''
  return {
    ...edge,
    id: node.id,
    name: node.name || '',
    title,
    version: node.version || '',
    stacked: false,
    size: 1,
    labels: undefined,
  }
}

const getWorkspaceItems = (
  item?: GridItemData,
): GridItemData[] | undefined => {
  const items: GridItemData[] = []
  const node = item?.to
  if (!node?.mainImporter) return undefined

  for (const importer of node.graph.importers) {
    if (importer === node) continue

    const version = importer.version ? `@${importer.version}` : ''
    const title = `${importer.name}${version}`

    items.push({
      to: importer,
      id: importer.id,
      title,
      version: importer.version || '',
      name: importer.name || '',
      stacked: false,
      size: 1,
      labels: undefined,
    })
  }
  return items
}

const getDependentItems = (node?: NodeLike, parent?: NodeLike) => {
  const items: GridItemData[] = []
  if (!node) return items
  for (const edge of Array.from(node.edgesIn)) {
    if (edge.from === parent) continue
    const title = `${edge.name}@${edge.spec.bareSpec}`

    items.push({
      ...edge,
      id: edge.from.id,
      title,
      version: edge.from.version || '',
      name: edge.from.name || '',
      stacked: edge.from.edgesIn.size > 1,
      size: edge.from.edgesIn.size,
      labels: undefined,
    })
  }
  return items
}

const getDependencyItems = (
  count: { currIndex: number },
  node?: NodeLike,
) => {
  const items: GridItemData[] = []
  if (!node) return items
  for (const edge of Array.from(node.edgesOut.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  )) {
    // skip missing dependencies, they'll be captured by the uninstalled deps
    if (!edge.to) continue
    const title = `${edge.name}@${edge.spec.bareSpec}`
    items.push({
      ...edge,
      depIndex: count.currIndex++,
      id: edge.to.id,
      title,
      name: edge.to.name || '',
      version: edge.to.version || '',
      stacked: false,
      size: 1,
      labels: [edge.type],
    })
  }
  return items
}

const getUninstalledDependencyItems = (
  count: { currIndex: number },
  node?: NodeLike,
) => {
  const items: GridItemData[] = []
  const manifest = node?.manifest
  if (!manifest) return items
  // collect all dependencies from the manifest into a single map
  const allManifestDeps = []
  for (const type of longDependencyTypes) {
    const deps = manifest[type]
    if (deps) {
      for (const [name, version] of Object.entries(deps)) {
        allManifestDeps.push({ name, version, type })
      }
    }
  }
  for (const { name, version, type } of allManifestDeps.sort((a, b) =>
    a.name.localeCompare(b.name, 'en'),
  )) {
    // skip installed dependencies
    const edge = node.edgesOut.get(name)
    if (edge?.to) continue
    const title = `${name}@${version}`
    items.push({
      depIndex: count.currIndex++,
      id: `uninstalled-dep:${title}`,
      title,
      name: name,
      version,
      stacked: false,
      size: 1,
      labels: [shorten(type, name, manifest)],
    })
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

const getItemQuery = (item: GridItemData) => {
  if (!item.to) return ''
  const name = item.to.name ? `[name="${item.to.name}"]` : ''
  const version =
    item.to.version ? `[version="${item.to.version}"]` : ''
  return `${name}${version}`
}

export const ExplorerGrid = () => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  const edges = useGraphStore(state => state.edges)
  const nodes = useGraphStore(state => state.nodes)
  const items = getItemsData(edges, nodes)
  const selected = items.length === 1
  const [selectedItem] = items
  const importerId =
    selected && selectedItem?.to?.importer ?
      selectedItem.to.id
    : undefined
  const parent = selected ? selectedItem?.from : undefined
  const parentItem = getParent(selectedItem, parent)
  const workspaces = selected && getWorkspaceItems(selectedItem)
  const dependents =
    selected && getDependentItems(selectedItem?.to, parent)
  const count = { currIndex: 0 }
  const dependencies =
    selected && getDependencyItems(count, selectedItem?.to)
  const uninstalledDependencies =
    selected && getUninstalledDependencyItems(count, selectedItem?.to)
  const workspaceClick = (item: GridItemData) => () => {
    const itemQuery = getItemQuery(item)
    if (itemQuery) {
      updateQuery(`:project${itemQuery}`)
    }
    return undefined
  }
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
    const itemQuery = getItemQuery(item)
    if (itemQuery) {
      if (query.includes(itemQuery)) {
        const newQuery = query
          .split(itemQuery)
          .slice(0, -1)
          .concat([''])
          .join(itemQuery)
        updateQuery(newQuery)
      } else {
        const newQuery = `${query} > ${itemQuery}`
        updateQuery(newQuery)
      }
    }
    return undefined
  }

  if (!items.length) return <EmptyResultsState />

  return (
    <div className="grow grid grid-cols-7 gap-4 px-8 bg-secondary dark:bg-black mb-8">
      <div className="col-span-2">
        {parentItem ?
          <>
            <GridHeader>
              <GalleryThumbnails size={22} className="mr-3" />
              Parent
            </GridHeader>
            <SideItem
              parent={true}
              item={parentItem}
              highlight={true}
              onSelect={dependentsClick(parentItem, true)}
            />
          </>
        : ''}
        {workspaces && workspaces.length > 0 ?
          <>
            <GridHeader>
              <Package size={22} className="mr-3" />
              Workspaces
            </GridHeader>
            {workspaces.map(item => (
              <SideItem
                item={item}
                key={item.id}
                onSelect={workspaceClick(item)}
              />
            ))}
          </>
        : ''}
        {dependents && dependents.length > 0 ?
          <>
            <GridHeader>
              <GalleryVerticalEnd size={22} className="mr-3" />
              Dependents
            </GridHeader>
            {dependents.map(item => (
              <SideItem
                item={item}
                key={item.id}
                onSelect={dependentsClick(item)}
              />
            ))}
          </>
        : ''}
      </div>
      <div className="col-span-3">
        {items.length > 1 ?
          <div className="flex items-center gap-3">
            <GridHeader className="mb-4">Results</GridHeader>
            <Badge className="mt-2" variant="default">
              {items.length}
            </Badge>
          </div>
        : <GridHeader>
            <GalleryVertical size={22} className="mr-3" />
            Selected Item
          </GridHeader>
        }
        <div className="flex flex-col gap-6">
          {items.map(item =>
            selected ?
              <SelectedItem item={item} key={item.id} />
            : <ResultItem item={item} key={item.id} />,
          )}
        </div>
      </div>
      <div className="col-span-2">
        {(
          (dependencies && dependencies.length > 0) ||
          selectedItem?.to?.importer
        ) ?
          <DependencySideBar
            dependencies={dependencies || []}
            importerId={importerId}
            onDependencyClick={dependencyClick}
            uninstalledDependencies={uninstalledDependencies || []}
          />
        : ''}
      </div>
    </div>
  )
}
