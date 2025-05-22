import {
  DependencySidebarProvider,
  useDependencySidebarStore,
  useOperation,
} from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import { GridHeader } from '@/components/explorer-grid/header.tsx'
import { SideItem } from '@/components/explorer-grid/side-item.tsx'
import { AddDependenciesPopoverTrigger } from '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx'
import { NumberFlow } from '@/components/number-flow.tsx'
import {
  FilterButton,
  FilterList,
} from '@/components/explorer-grid/dependency-sidebar/filter.tsx'

import type { DepID } from '@vltpkg/dep-id/browser'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

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
  const dependencies = useDependencySidebarStore(
    state => state.dependencies,
  )
  const addedDependencies = useDependencySidebarStore(
    state => state.addedDependencies,
  )
  const filteredDependencies = useDependencySidebarStore(
    state => state.filteredDependencies,
  )
  const totalLength = dependencies.length + addedDependencies.length

  return (
    <>
      <GridHeader className="flex w-full">
        <span className="mr-2">Dependencies</span>
        <NumberFlow
          start={totalLength}
          end={filteredDependencies.length + addedDependencies.length}
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
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          /
        </span>
        <NumberFlow
          start={filteredDependencies.length}
          end={totalLength}
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
        <div className="flex grow justify-end gap-2">
          <FilterButton />
          {importerId && <AddDependenciesPopoverTrigger />}
        </div>
      </GridHeader>
      <FilterList />
    </>
  )
}

const DependencyList = () => {
  const filteredDependencies = useDependencySidebarStore(
    state => state.filteredDependencies,
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
      <div className="flex flex-col gap-4">
        {[
          // added dependencies should come first
          ...filteredDependencies
            .filter(item => addedDependencies.includes(item.name))
            .sort((a, b) => a.name.localeCompare(b.name, 'en')),
          // then we display the rest of dependencies, sorted by name
          ...filteredDependencies
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
      </div>
      {uninstalledDependencies.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          <GridHeader className="h-fit">
            Uninstalled Dependencies
          </GridHeader>
          {[
            ...uninstalledDependencies.sort((a, b) =>
              a.name.localeCompare(b.name, 'en'),
            ),
          ].map(item => (
            <SideItem
              item={item}
              key={item.id}
              dependencies={false}
            />
          ))}
        </div>
      )}
    </>
  )
}
