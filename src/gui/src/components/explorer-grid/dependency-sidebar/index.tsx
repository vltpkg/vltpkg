import {
  DependencySidebarProvider,
  useDependencySidebarStore,
  useOperation,
} from '@/components/explorer-grid/dependency-sidebar/context.jsx'
import { GridHeader } from '@/components/explorer-grid/header.jsx'
import { SideItem } from '@/components/explorer-grid/side-item.jsx'
import { AddDependenciesPopoverTrigger } from '@/components/explorer-grid/dependency-sidebar/add-dependency.jsx'

import type { DepID } from '@vltpkg/dep-id/browser'
import type { GridItemData } from '@/components/explorer-grid/types.js'

export type DependencySideBarProps = {
  dependencies: GridItemData[]
  importerId?: DepID
  onDependencyClick: (item: GridItemData) => () => undefined
  uninstalledDependencies: GridItemData[]
}

export const DependencySideBar = (props: DependencySideBarProps) => {
  return (
    <DependencySidebarProvider {...props}>
      <SidebarHeader />
      <DependencyList />
    </DependencySidebarProvider>
  )
}

const SidebarHeader = () => {
  const importerId = useDependencySidebarStore(
    state => state.importerId,
  )

  return (
    <GridHeader className="h-[48px]">
      Dependencies
      {importerId && (
        <div className="flex grow justify-end">
          <AddDependenciesPopoverTrigger />
        </div>
      )}
    </GridHeader>
  )
}

const DependencyList = () => {
  const dependencies = useDependencySidebarStore(
    state => state.dependencies,
  )
  const addedDependencies = useDependencySidebarStore(
    state => state.addedDependencies,
  )
  const uninstalledDependencies = useDependencySidebarStore(
    state => state.uninstalledDependencies,
  )
  const onDependencyClick = useDependencySidebarStore(
    state => state.onDependencyClick,
  )
  const { operation } = useOperation()

  return (
    <>
      {[
        // added dependencies should come first
        ...dependencies
          .filter(item => addedDependencies.includes(item.name))
          .sort((a, b) => a.name.localeCompare(b.name, 'en')),
        // then we display the rest of dependencies, sorted by name
        ...dependencies
          .filter(item => !addedDependencies.includes(item.name))
          .sort((a, b) => a.name.localeCompare(b.name, 'en')),
      ].map(item => (
        <SideItem
          item={item}
          key={item.id}
          dependencies={true}
          onSelect={onDependencyClick(item)}
          onUninstall={() =>
            operation({
              item: {
                name: item.name,
                version: item.version,
              },
              operationType: 'uninstall',
            })
          }
        />
      ))}
      {uninstalledDependencies.length > 0 && (
        <>
          <GridHeader>Uninstalled Dependencies</GridHeader>
          {[
            ...uninstalledDependencies.sort((a, b) =>
              a.name.localeCompare(b.name, 'en'),
            ),
          ].map(item => (
            <SideItem item={item} key={item.id} dependencies={true} />
          ))}
        </>
      )}
    </>
  )
}
