import { Fragment } from 'react'
import { Outlet } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { JellyTriangleSpinner } from '@/components/ui/jelly-spinner.tsx'
import {
  useSelectedItemStore,
  SelectedItemProvider,
  PRIMARY_TABS,
  useTabNavigation,
} from '@/components/explorer-grid/selected-item/context.tsx'
import {
  DependencySidebarProvider,
  useDependencySidebarStore,
} from '@/components/explorer-grid/dependency-sidebar/context.tsx'
import { useEmptyCheck } from '@/components/explorer-grid/selected-item/aside/use-empty-check.tsx'
import { FilterButton } from '@/components/explorer-grid/dependency-sidebar/filter.tsx'
import { AddDependenciesPopoverTrigger } from '@/components/explorer-grid/dependency-sidebar/add-dependency.tsx'
import {
  Navigation,
  NavigationButton,
  NavigationList,
  NavigationListItem,
} from '@/components/explorer-grid/selected-item/navigation.tsx'
import {
  PackageImageSpec,
  ItemBreadcrumbs,
  Publisher,
} from '@/components/explorer-grid/selected-item/item-header.tsx'
import { DependencySideBar } from '@/components/explorer-grid/dependency-sidebar/index.tsx'
import { AsideOverview } from '@/components/explorer-grid/selected-item/aside/index.tsx'
import { AsideOverviewEmptyState } from '@/components/explorer-grid/selected-item/aside/empty-state.tsx'
import { Decorator } from '@/components/ui/decorator.tsx'
import { InstallHelper } from '@/components/explorer-grid/selected-item/focused-view/install-helper.tsx'
import { PartialErrorsIndicator } from '@/components/explorer-grid/selected-item/partial-errors-indicator.tsx'
import { cn } from '@/lib/utils.ts'

import type { DepID } from '@vltpkg/dep-id'
import type { Tab } from '@/components/explorer-grid/selected-item/context.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

interface FocusedViewProps {
  item: GridItemData
  dependencies: GridItemData[]
  onDependencyClick: (dependency: GridItemData) => () => undefined
  uninstalledDependencies: GridItemData[]
  importerId?: DepID
}

const FocusedBreadcrumbs = ({
  className,
}: {
  className?: string
}) => {
  const breadcrumbs = useSelectedItemStore(
    state => state.selectedItem.breadcrumbs,
  )

  if (!breadcrumbs) return null

  return (
    <div className="grid-cols-[4fr_1fr] lg:grid">
      <div className={cn('flex w-full p-[0.5px]', className)}>
        <div className="bg-background w-full rounded px-6 py-3">
          <ItemBreadcrumbs />
        </div>
      </div>
      <Decorator className="pt-[0px] max-lg:hidden" />
    </div>
  )
}

const FocusedResource = () => {
  const { tab } = useTabNavigation()
  const importerId = useDependencySidebarStore(
    state => state.importerId,
  )

  return (
    <div className="flex w-full p-[0.5px] max-lg:hidden">
      <div className="bg-background flex w-full items-center justify-between rounded px-6">
        <h3 className="text-muted-foreground text-sm font-medium">
          {tab === 'dependencies' ? 'Direct Dependencies' : 'Summary'}
        </h3>
        {importerId && tab === 'dependencies' && (
          <div className="flex items-center gap-2">
            <AddDependenciesPopoverTrigger />
            <FilterButton />
          </div>
        )}
      </div>
    </div>
  )
}

const FocusedSidebar = () => {
  const { isMetadataEmpty } = useEmptyCheck()
  const { tab: activeTab } = useTabNavigation()
  const tabAsideSet = new Set<Tab>([
    'overview',
    'insights',
    'versions',
    'code',
    'json',
  ])
  return (
    <Fragment>
      {tabAsideSet.has(activeTab) ?
        <Fragment>
          {isMetadataEmpty ?
            <AsideOverviewEmptyState />
          : <AsideOverview />}
        </Fragment>
      : activeTab === 'dependencies' ?
        <aside className="bg-background w-full">
          <DependencySideBar />
        </aside>
      : null}
    </Fragment>
  )
}

export const FocusedView = ({ item, ...props }: FocusedViewProps) => {
  return (
    <SelectedItemProvider
      key={item.id}
      selectedItem={item}
      asideOveriewVisible={false}>
      <DependencySidebarProvider {...props}>
        <FocusedViewContent />
      </DependencySidebarProvider>
    </SelectedItemProvider>
  )
}

const FocusedViewContent = () => {
  const isLoadingDetails = useSelectedItemStore(
    state => state.isLoadingDetails,
  )

  return (
    <div className="bg-background relative">
      <AnimatePresence initial={false}>
        {isLoadingDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded backdrop-blur-sm">
            <JellyTriangleSpinner size={40} />
          </motion.div>
        )}
      </AnimatePresence>

      <PartialErrorsIndicator />

      <div className="bg-foreground/6">
        <FocusedBreadcrumbs className="pt-0 pl-0" />

        <PackageDetails />

        <div className="bg-background pattern-hatch h-9 w-full rounded lg:hidden" />
        <div className="grid-cols-[4fr_1fr] lg:grid">
          <div className="flex w-full p-[0.5px] pl-0">
            <div className="bg-background w-full rounded">
              <TabsNavigation />
            </div>
          </div>

          <FocusedResource />
        </div>

        <div
          className={cn(
            'h-full min-w-0 grid-cols-[4fr_1fr] lg:grid',
            'lg:min-h-[calc(100svh-64px-96.5px-45px-1px)]',
          )}>
          <div className="flex w-full min-w-0 p-[0.5px] pl-0">
            <div className="bg-background w-full min-w-0 rounded">
              <Outlet />
            </div>
          </div>

          <div className="bg-background pattern-hatch h-9 w-full rounded lg:hidden" />

          <div className="flex w-full min-w-0 rounded p-[0.5px]">
            <div
              className={cn(
                'flex h-full w-full min-w-0 flex-col gap-px rounded',
                '**:data-[slot=aside-section]:last-of-type:h-full [&>aside]:h-full **:data-[slot=aside-section]:last-of-type:[&>div]:h-full',
              )}>
              <InstallHelper />
              <FocusedSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const PackageDetails = ({ className }: { className?: string }) => {
  const breadcrumbs = useSelectedItemStore(
    state => state.selectedItem.breadcrumbs,
  )

  return (
    <div className={cn('grid-cols-[4fr_1fr] lg:grid', className)}>
      <div
        className={cn(
          'flex w-full flex-col gap-px p-[0.5px] pl-0',
          !breadcrumbs && 'pt-0',
        )}>
        <div className="bg-background w-full rounded px-6 py-4">
          <PackageImageSpec />
        </div>
        <div className="bg-background w-full rounded px-6 py-2 empty:hidden">
          <Publisher className="flex-col items-start lg:flex-row" />
        </div>
      </div>
      <Decorator className="max-lg:hidden" />
    </div>
  )
}

const TabsNavigation = () => {
  const insights = useSelectedItemStore(state => state.insights)
  const versions = useSelectedItemStore(state => state.versions)
  const greaterVersions = useSelectedItemStore(
    state => state.greaterVersions,
  )
  const totalDependencies = useSelectedItemStore(
    state => state.depCount,
  )

  const versionCount =
    (versions?.length ?? 0) + (greaterVersions?.length ?? 0) ||
    undefined

  const getCount = (tab: Tab) => {
    switch (tab) {
      case 'insights':
        return insights?.length || undefined
      case 'versions':
        return versionCount || undefined
      case 'dependencies':
        return totalDependencies || undefined
      default:
        return undefined
    }
  }

  return (
    <Navigation>
      <NavigationList>
        {(
          Object.entries(PRIMARY_TABS) as {
            [K in keyof typeof PRIMARY_TABS]-?: [
              K,
              (typeof PRIMARY_TABS)[K],
            ]
          }[keyof typeof PRIMARY_TABS][]
        ).map(([tab, label], idx) => (
          <NavigationListItem key={`focused-tabs-${tab}-${idx}`}>
            <NavigationButton
              navigationLayer="primary"
              tab={tab}
              count={getCount(tab)}>
              {label}
            </NavigationButton>
          </NavigationListItem>
        ))}
      </NavigationList>
    </Navigation>
  )
}
