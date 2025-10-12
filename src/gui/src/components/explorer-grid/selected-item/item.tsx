import { Fragment, useRef, useCallback } from 'react'
import { Outlet } from 'react-router'
import { Card } from '@/components/ui/card.tsx'
import { Tabs, TabsList } from '@/components/ui/tabs.tsx'
import {
  SelectedItemProvider,
  useSelectedItemStore,
  useTabNavigation,
} from '@/components/explorer-grid/selected-item/context.tsx'
import { InsightTabButton } from '@/components/explorer-grid/selected-item/tabs-insight.tsx'
import { OverviewTabButton } from '@/components/explorer-grid/selected-item/tabs-overview.tsx'
import { VersionsTabButton } from '@/components/explorer-grid/selected-item/tabs-versions.tsx'
import { TabsJsonButton } from '@/components/explorer-grid/selected-item/tabs-json.tsx'
import { CodeTabButton } from '@/components/explorer-grid/selected-item/tabs-code/index.tsx'
import { DependenciesTabsButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/index.tsx'
import { ItemHeader } from '@/components/explorer-grid/selected-item/item-header.tsx'
import { AnimatePresence } from 'framer-motion'
import { isHostedEnvironment } from '@/lib/environment.ts'

import type { Tab } from '@/components/explorer-grid/selected-item/context.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

interface ItemProps {
  item: GridItemData
}

export const Item = ({ item }: ItemProps) => {
  return (
    <SelectedItemProvider selectedItem={item}>
      <section className="relative">
        <Card className="relative rounded-xl border-muted shadow-none">
          <ItemHeader />
          <SelectedItemTabs />
        </Card>
      </section>
    </SelectedItemProvider>
  )
}

export const SelectedItemTabs = () => {
  const selectedItem = useSelectedItemStore(
    state => state.selectedItem,
  )
  const { setActiveTab, tab: activeTab } = useTabNavigation()
  const currentTabRef = useRef<Tab>(activeTab)
  const isHostedMode = isHostedEnvironment()

  if (currentTabRef.current !== activeTab) {
    currentTabRef.current = activeTab
  }

  const handleTabChange = useCallback(
    (tab: string) => {
      const newTab = tab as Tab
      if (currentTabRef.current !== newTab) {
        currentTabRef.current = newTab
        setActiveTab(newTab)
      }
    },
    [setActiveTab],
  )

  return (
    <div className="w-full">
      <Tabs
        uniqueId={selectedItem.id}
        onValueChange={handleTabChange}
        value={activeTab}>
        <TabsList
          variant="ghost"
          className="w-full gap-2 overflow-x-auto px-6">
          {isHostedMode ?
            <Fragment>
              <OverviewTabButton />
              <VersionsTabButton />
            </Fragment>
          : <Fragment>
              <OverviewTabButton />
              <TabsJsonButton />
              <CodeTabButton />
              <InsightTabButton />
              <VersionsTabButton />
              <DependenciesTabsButton />
            </Fragment>
          }
        </TabsList>
        <div className="min-h-64 overflow-hidden rounded-b-xl bg-card">
          <AnimatePresence initial={false} mode="wait">
            <Outlet key={activeTab} />
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  )
}
