import { longDependencyTypes, shorten } from '@vltpkg/graph/browser'
import { Spec } from '@vltpkg/spec/browser'
import { useGraphStore } from '@/state/index.ts'
import { Item } from '@/components/explorer-grid/selected-item/item.tsx'
import { GridHeader } from '@/components/explorer-grid/header.tsx'
import { DependencySideBar } from '@/components/explorer-grid/dependency-sidebar/index.tsx'
import { OverviewSidebar } from '@/components/explorer-grid/overview-sidebar/index.tsx'

import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { QueryResponseNode } from '@vltpkg/query'

const getParent = (
  edge?: GridItemData,
  node?: QueryResponseNode,
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

const getWorkspaceItems = (item?: GridItemData): GridItemData[] => {
  const items: GridItemData[] = []
  const node = item?.to
  if (!node?.mainImporter) return []

  for (const importer of node.graph.importers) {
    if (importer === node) continue

    const version = importer.version ? `@${importer.version}` : ''
    const title = `${importer.name}${version}`

    items.push({
      ...importer,
      to: importer as QueryResponseNode,
      id: importer.id,
      title,
      version: importer.version || '',
      name: importer.name || '',
      stacked: false,
      labels: undefined,
      size: 1,
    })
  }
  return items
}

const getDependentItems = (
  node?: QueryResponseNode,
  parent?: QueryResponseNode,
) => {
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
  node?: QueryResponseNode,
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
      depName: edge.name,
      depIndex: count.currIndex++,
      id: edge.to.id,
      title,
      version: edge.to.version || '',
      stacked: false,
      size: 1,
      labels: edge.type !== 'prod' ? [edge.type] : [],
    })
  }
  return items
}

const getUninstalledDependencyItems = (
  count: { currIndex: number },
  node?: QueryResponseNode,
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
    const edgeType = shorten(type, name, manifest)
    items.push({
      spec: Spec.parse(name, version),
      depName: edge?.name,
      depIndex: count.currIndex++,
      id: `uninstalled-dep:${title}`,
      title,
      name: name,
      version,
      stacked: false,
      size: 1,
      labels: edgeType !== 'prod' ? [edgeType] : [],
    })
  }
  return items.sort((a, b) => a.name.localeCompare(b.name, 'en'))
}

const getItemQuery = (item: GridItemData) => {
  if (!item.to) return ''
  const name = item.name ? `#${item.name}` : ''
  return name.trim()
}

export const SelectedItem = ({ item }: { item: GridItemData }) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  const stamp = useGraphStore(state => state.stamp)
  const importerId = item.to?.importer ? item.to.id : undefined
  const parent = item.from
  const parentItem = getParent(item, parent)
  const workspaces = getWorkspaceItems(item)
  const dependents = getDependentItems(item.to, parent)
  const count = { currIndex: 0 }
  const dependencies = getDependencyItems(count, item.to)
  const uninstalledDependencies = getUninstalledDependencyItems(
    count,
    item.to,
  )
  const workspaceClick = (item: GridItemData) => () => {
    const itemQuery = getItemQuery(item)
    if (itemQuery) {
      updateQuery(`:project${itemQuery}`)
    }
    return undefined
  }
  const dependentsClick =
    (item: GridItemData, isParent?: boolean) => () => {
      if (item.from?.mainImporter) {
        updateQuery(`:root`)
        return
      }
      const selectedName = item.to?.name ? `#${item.to.name}` : ''
      const selectedVersion =
        item.to?.version ? `:v(${item.to.version})` : ''
      const newQuery =
        isParent &&
        (query.endsWith(`> ${selectedName}${selectedVersion}`) ||
          query.endsWith(`> ${selectedName}`)) &&
        query.slice(0, query.lastIndexOf('>'))
      if (newQuery) {
        updateQuery(newQuery.trim())
      } else {
        // use version on the parent node if there are multiple nodes in the graph with the same name
        const useVersion =
          item.from ?
            [...item.from.graph.nodes.values()].filter(
              n => n.name === item.from?.name,
            ).length > 1
          : false
        const name = item.from?.name ? `#${item.from.name}` : ''
        const version =
          useVersion && item.from?.version ?
            `:v(${item.from.version})`
          : ''
        updateQuery(`${name}${version}`.trim())
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

  return (
    <div className="grid w-full max-w-8xl grid-cols-8 gap-4 pb-8">
      <div className="relative col-span-2">
        <OverviewSidebar
          dependencies={dependencies}
          parentItem={parentItem}
          workspaces={workspaces}
          dependents={dependents}
          onWorkspaceClick={workspaceClick}
          onDependentClick={dependentsClick}
        />
      </div>
      <div className="col-span-4">
        <GridHeader>Selected</GridHeader>
        <div className="flex flex-col gap-6">
          <Item
            item={item}
            // This is necessary to force a re-render of the selected item
            key={`${item.id}-${item.name}-${stamp}`}
          />
        </div>
      </div>
      <div className="col-span-2">
        {dependencies.length > 0 || item.to?.importer ?
          <DependencySideBar
            dependencies={dependencies}
            importerId={importerId}
            onDependencyClick={dependencyClick}
            uninstalledDependencies={uninstalledDependencies}
          />
        : ''}
      </div>
    </div>
  )
}
