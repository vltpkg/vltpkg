import { baseDepID } from '@vltpkg/dep-id/browser'
import { longDependencyTypes, shorten } from '@vltpkg/graph/browser'
import { Spec } from '@vltpkg/spec/browser'
import { useGraphStore } from '@/state/index.ts'
import { Item } from '@/components/explorer-grid/selected-item/item.tsx'
import { GridHeader } from '@/components/explorer-grid/header.tsx'
import { DependencySideBar } from '@/components/explorer-grid/dependency-sidebar/index.tsx'
import { OverviewSidebar } from '@/components/explorer-grid/overview-sidebar/index.tsx'
import { updateDependentsItem } from '@/lib/update-dependents-item.ts'
import { FocusButton } from '@/components/explorer-grid/selected-item/focused-view/focused-button.tsx'
import { FocusedView } from '@/components/explorer-grid/selected-item/focused-view/index.tsx'
import { useFocusState } from '@/components/explorer-grid/selected-item/focused-view/use-focus-state.tsx'
import { motion, AnimatePresence } from 'framer-motion'

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
  const { focused } = useFocusState()

  const workspaceClick =
    ({ item }: { item: GridItemData }) =>
    () => {
      const itemQuery = getItemQuery(item)
      if (itemQuery) {
        updateQuery(`:project${itemQuery}`)
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
    <>
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
            className="grid w-full max-w-8xl grid-cols-8 gap-4 px-8 py-4">
            <div className="relative col-span-2">
              <OverviewSidebar
                dependencies={dependencies}
                parentItem={parentItem}
                workspaces={workspaces}
                dependents={dependents}
                onWorkspaceClick={workspaceClick}
                onDependentClick={updateDependentsItem({
                  query,
                  updateQuery,
                })}
                selectedItem={item}
              />
            </div>
            <div className="col-span-4">
              <div className="flex items-center justify-between">
                <GridHeader>Selected</GridHeader>
                <FocusButton />
              </div>
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
          </motion.div>
        }
      </AnimatePresence>
    </>
  )
}
