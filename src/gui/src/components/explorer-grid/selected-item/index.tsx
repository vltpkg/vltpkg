import { baseDepID } from '@vltpkg/dep-id/browser'
import { longDependencyTypes, shorten } from '@vltpkg/graph/browser'
import { Spec } from '@vltpkg/spec/browser'
import { useGraphStore } from '@/state/index.ts'
import { Item } from '@/components/explorer-grid/selected-item/item.tsx'
import {
  DependencySidebarProvider,
  useDependencySidebarStore,
} from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import { DependencySideBar } from '@/components/explorer-grid/dependency-sidebar/index.tsx'
import { OverviewSidebar } from '@/components/explorer-grid/overview-sidebar/index.tsx'
import { updateDependentsItem } from '@/lib/update-dependents-item.ts'
import { NumberFlow } from '@/components/number-flow.tsx'
import { FocusedView } from '@/components/explorer-grid/selected-item/focused-view/index.tsx'
import { AddDependenciesPopoverTrigger } from '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx'
import { FilterButton } from '@/components/explorer-grid/dependency-sidebar/filter.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx'
import { motion, AnimatePresence } from 'framer-motion'

import type { CSSProperties } from 'react'
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
  const { focused } = useFocusState()

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
    <DependencySidebarProvider
      dependencies={dependencies}
      uninstalledDependencies={uninstalledDependencies}
      importerId={importerId}
      onDependencyClick={dependencyClick}>
      <AnimatePresence initial={false} mode="wait">
        {focused ?
          <FocusedView
            item={item}
            dependencies={dependencies}
            onDependencyClick={dependencyClick}
            uninstalledDependencies={uninstalledDependencies}
            importerId={importerId}
            // This is necessary to force a re-render of the selected item
            key={`${item.id}-${item.name}-${stamp}`}
          />
        : <motion.div
            initial={{
              opacity: 0,
              filter: 'blur(2px)',
            }}
            animate={{
              opacity: 1,
              filter: 'blur(0px)',
            }}
            exit={{
              opacity: 0,
              filter: 'blur(2px)',
            }}
            transition={{ ease: 'easeInOut', duration: 0.25 }}
            className="bg-background relative h-full">
            <div className="bg-background-secondary h-full">
              <div
                className="h-full grid-cols-[var(--side)_var(--main)] lg:grid"
                style={
                  {
                    '--side': '1fr',
                    '--main': '3fr',
                  } as CSSProperties
                }>
                {/* overview sidebar */}
                <div className="flex h-full w-full p-[0.5px] pt-0 pl-0">
                  <div className="bg-background flex h-full w-full flex-col rounded">
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

                {/* content */}
                <div
                  className="h-full grid-cols-[var(--main)_var(--side)] grid-rows-[auto_1fr] lg:grid"
                  style={
                    {
                      '--side': '1fr',
                      '--main': '2fr',
                    } as CSSProperties
                  }>
                  {/* headers */}
                  <div className="flex w-full shrink-0 p-[0.5px] pt-0">
                    <div className="bg-background flex h-12 w-full items-center rounded px-6 py-3">
                      <h3 className="text-sm font-medium">
                        Selected
                      </h3>
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 p-[0.5px] pt-0">
                    <DependencyHeader />
                  </div>

                  {/* item */}
                  <div className="flex min-h-0 w-full min-w-0 p-[0.5px]">
                    <div className="bg-background flex w-full rounded">
                      <Item
                        item={item}
                        className="w-full"
                        // This is necessary to force a re-render of the selected item
                        key={`${item.id}-${item.name}-${stamp}`}
                      />
                    </div>
                  </div>

                  {/* deps */}
                  <div className="flex min-h-0 w-full p-[0.5px]">
                    <div className="bg-background flex w-full min-w-0 flex-col rounded">
                      {dependencies.length > 0 || item.to?.importer ?
                        <DependencySideBar />
                      : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </DependencySidebarProvider>
  )
}

const DependencyHeader = () => {
  const importerId = useDependencySidebarStore(
    state => state.importerId,
  )
  const dependencies = useDependencySidebarStore(
    state => state.dependencies,
  )
  const filteredDependencies = useDependencySidebarStore(
    state => state.filteredDependencies,
  )

  return (
    <div className="bg-background flex h-12 w-full items-center justify-between rounded px-6 py-3">
      <h3 className="text-sm font-medium">
        <span className="mr-2">Direct Dependencies</span>
        <NumberFlow
          start={dependencies.length}
          end={filteredDependencies.length}
          format={{
            pad: 0,
          }}
          motionConfig={{
            duration: 0.4,
          }}
          classNames={{
            span: 'text-muted-foreground',
          }}
        />
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          /
        </span>
        <NumberFlow
          start={filteredDependencies.length}
          end={dependencies.length}
          format={{
            pad: 0,
          }}
          motionConfig={{
            duration: 0.4,
          }}
          classNames={{
            span: 'text-muted-foreground',
          }}
        />
      </h3>
      {importerId && (
        <div className="flex items-center gap-2">
          <AddDependenciesPopoverTrigger />
          <FilterButton />
        </div>
      )}
    </div>
  )
}
