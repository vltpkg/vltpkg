import {
  useDependencySidebarStore,
  useOperation,
} from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import { SideItem } from '@/components/explorer-grid/side-item.tsx'
import { FilterListEmptyState } from '@/components/explorer-grid/dependency-sidebar/filter.tsx'
import { DependencyEmptyState } from '@/components/explorer-grid/dependency-sidebar/empty-state.tsx'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useMemo } from 'react'

export const DependencySideBar = () => {
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
      <div className="bg-foreground/6 flex w-full flex-col gap-[1px] rounded rounded-b-none pb-[1px]">
        <FilterListEmptyState />
        <motion.div
          layout="position"
          className="bg-background flex flex-col gap-4 rounded px-6 py-3">
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
            className="flex flex-col gap-[1px]">
            <div className="bg-background flex h-12 w-full items-center rounded px-6">
              <h3 className="text-muted-foreground text-sm font-medium">
                Uninstalled Dependencies
              </h3>
            </div>
            <div className="bg-background flex flex-col gap-4 rounded px-6 py-3">
              {sortedUninstalledDependencies.map(item => (
                <SideItem
                  item={item}
                  key={item.id}
                  dependencies={false}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  )
}
