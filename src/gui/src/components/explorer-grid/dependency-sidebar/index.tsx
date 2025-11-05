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
  FilterListEmptyState,
} from '@/components/explorer-grid/dependency-sidebar/filter.tsx'
import { DependencyEmptyState } from '@/components/explorer-grid/dependency-sidebar/empty-state.tsx'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { memo, useMemo } from 'react'

import type { DepID } from '@vltpkg/dep-id/browser'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

export type DependencySideBarProps = {
  dependencies: GridItemData[]
  importerId?: DepID
  onDependencyClick: (item: GridItemData) => () => undefined
  uninstalledDependencies: GridItemData[]
}

export const DependencySideBar = memo(
  (props: DependencySideBarProps) => {
    return (
      <DependencySidebarProvider {...props}>
        <SidebarHeader />
        <DependencyList />
      </DependencySidebarProvider>
    )
  },
)

const SidebarHeader = () => {
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
    <>
      <GridHeader className="flex w-full">
        <span className="mr-2">Dependencies</span>
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
        <AnimatePresence mode="popLayout" initial={false}>
          {dependencies.length !== 0 && (
            <motion.div
              initial={{ opacity: 0, filter: 'blur(2px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{
                ease: 'easeInOut',
                duration: 0.25,
              }}
              className="flex grow justify-end gap-2">
              {importerId && <AddDependenciesPopoverTrigger />}
              <FilterButton />
            </motion.div>
          )}
        </AnimatePresence>
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

  // Memoize sorted dependencies to prevent unnecessary re-sorting
  const sortedDependencies = useMemo(() => {
    const added = filteredDependencies
      .filter(item => addedDependencies.includes(item.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))

    const notAdded = filteredDependencies
      .filter(item => !addedDependencies.includes(item.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))

    return [...added, ...notAdded]
  }, [filteredDependencies, addedDependencies])

  // Memoize sorted uninstalled dependencies
  const sortedUninstalledDependencies = useMemo(
    () =>
      uninstalledDependencies.sort((a, b) =>
        a.name.localeCompare(b.name, 'en'),
      ),
    [uninstalledDependencies],
  )

  return (
    <LayoutGroup>
      <FilterListEmptyState />
      <motion.div layout="position" className="flex flex-col gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {sortedDependencies.map(item => (
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
        </AnimatePresence>
      </motion.div>
      <DependencyEmptyState />
      {sortedUninstalledDependencies.length > 0 && (
        <motion.div
          layout="position"
          className="mt-8 flex flex-col gap-4">
          <GridHeader className="h-fit">
            Uninstalled Dependencies
          </GridHeader>
          {sortedUninstalledDependencies.map(item => (
            <SideItem
              item={item}
              key={item.id}
              dependencies={false}
            />
          ))}
        </motion.div>
      )}
    </LayoutGroup>
  )
}
