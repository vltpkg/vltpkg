import { baseDepID } from '@vltpkg/dep-id/browser'
import { longDependencyTypes, shorten } from '@vltpkg/graph/browser'
import { Spec } from '@vltpkg/spec/browser'
import { useGraphStore } from '@/state/index.ts'
import { Item } from '@/components/explorer-grid/selected-item/item.tsx'
import { DependencySidebarProvider } from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import { SelectedItemProvider } from '@/components/explorer-grid/selected-item/context.tsx'
import { DependencySideBar } from '@/components/explorer-grid/dependency-sidebar/index.tsx'
import { OverviewSidebar } from '@/components/explorer-grid/overview-sidebar/index.tsx'
import { updateDependentsItem } from '@/lib/update-dependents-item.ts'
import { ItemBreadcrumbs } from '@/components/explorer-grid/selected-item/item-header.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/use-focus-state.tsx'
import { FocusButton } from '@/components/explorer-grid/selected-item/focused-button.tsx'
import { Cross } from '@/components/ui/cross.tsx'
import { cn } from '@/lib/utils.ts'

import type { State, Action } from '@/state/types.ts'
import type { GridItemData } from '@/components/explorer-grid/types.ts'
import type { QueryResponseNode } from '@vltpkg/query'
import type { DepID } from '@vltpkg/dep-id/browser'

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
    spec: undefined,
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

export const getDependentItems = (
  node?: QueryResponseNode,
  parent?: QueryResponseNode,
) => {
  const seenIds = new Set<DepID>()
  const items: GridItemData[] = []
  if (!node) return items
  for (const edge of Array.from(node.edgesIn)) {
    const id = baseDepID(edge.from.id)
    if (edge.from === parent || seenIds.has(id)) continue
    seenIds.add(id)
    const title = `${edge.name}@${edge.spec.bareSpec}`

    items.push({
      ...edge,
      id,
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
      id: `${edge.to.projectRoot}#${edge.to.id}`,
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

export const dependencyClick =
  ({
    item,
    query,
    updateQuery,
  }: {
    item: GridItemData
    query: State['query']
    updateQuery: Action['updateQuery']
  }) =>
  () => {
    const itemQuery = getItemQuery(item)
    if (!itemQuery) return

    const SEP = ' > '

    // split the query into segments like [":root", "#a"]
    const segments = query
      .split(SEP)
      .map(s => s.trim())
      .filter(Boolean)

    const idx = segments.lastIndexOf(itemQuery)

    if (idx !== -1) {
      // "go back" to that item: keep everything up to it
      const newQuery = segments.slice(0, idx + 1).join(SEP)
      updateQuery(newQuery)
    } else {
      // append it
      const newQuery =
        segments.length ?
          [...segments, itemQuery].join(SEP)
        : itemQuery

      updateQuery(newQuery)
    }

    return undefined
  }

export const SelectedItem = ({ item }: { item: GridItemData }) => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  const importerId = item.to?.importer ? item.to.id : undefined
  const parent = item.from
  const parentItem = getParent(item, parent)
  const workspaces = getWorkspaceItems(item)
  const dependents = getDependentItems(item.to, parent)
  const count = { currIndex: 0 }
  const dependencies = getDependencyItems(count, item.to)
  const stamp = useGraphStore(state => state.stamp)
  const uninstalledDependencies = getUninstalledDependencyItems(
    count,
    item.to,
  )
  const { focused } = useFocusState()

  return (
    <SelectedItemProvider selectedItem={item}>
      <DependencySidebarProvider
        dependencies={dependencies}
        uninstalledDependencies={uninstalledDependencies}
        importerId={importerId}
        onDependencyClick={dependencyClick}>
        <div className="bg-background border-background-secondary relative h-full border-y">
          <div
            className={cn(
              'h-full transition-[grid-template-columns] duration-300 ease-in-out will-change-[grid-template-columns] lg:grid',
              focused ?
                'grid-cols-[0fr_3fr_1fr]'
              : 'grid-cols-[1fr_2fr_1fr]',
            )}>
            {/* overview sidebar */}
            <div
              className={cn(
                'transition-[filter, opacity] flex w-full min-w-0 overflow-hidden duration-300',
                focused ?
                  'lg:pointer-events-none lg:filter-[blur(2px)]'
                : 'lg:pl-0 lg:blur-none',
              )}>
              <div className="flex w-full min-w-0 flex-col">
                <OverviewSidebar
                  dependencies={dependencies}
                  parentItem={parentItem}
                  workspaces={workspaces}
                  dependents={dependents}
                  onWorkspaceClick={updateDependentsItem({
                    query,
                    updateQuery,
                    workspace: true,
                  })}
                  onDependentClick={updateDependentsItem({
                    query,
                    updateQuery,
                  })}
                  selectedItem={item}
                />
              </div>
            </div>

            {/* selected-item */}
            <div
              className={cn(
                'border-background-secondary relative flex w-full min-w-0 flex-col border-t transition-[border] duration-300 lg:border-t-0',
                focused ? 'border-r border-l-0' : 'lg:border-x',
              )}
              key={`${item.id}-${item.name}-${stamp}`}>
              <div className="flex w-full">
                <div className="border-background-secondary relative flex h-12 w-full items-center gap-3 border-b px-6 py-3">
                  <FocusButton />
                  <h3 className="text-sm font-medium">Selected</h3>
                  <ItemBreadcrumbs />

                  <Cross top right />
                  <Cross bottom right />
                  <Cross top left />
                  <Cross bottom left />
                </div>
              </div>
              <div className="flex h-full w-full min-w-0">
                <Item className="w-full" />
              </div>
            </div>

            {/* dependency sidebar */}
            <DependencySideBar className="min-w-0 overflow-hidden" />
          </div>
        </div>
      </DependencySidebarProvider>
    </SelectedItemProvider>
  )
}
