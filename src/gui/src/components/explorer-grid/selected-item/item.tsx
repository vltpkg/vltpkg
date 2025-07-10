import { Outlet } from 'react-router'
import { Card } from '@/components/ui/card.tsx'
import { Tabs, TabsList } from '@/components/ui/tabs.tsx'
import {
  SelectedItemProvider,
  useSelectedItemStore,
} from '@/components/explorer-grid/selected-item/context.tsx'
import { InsightTabButton } from '@/components/explorer-grid/selected-item/tabs-insight.tsx'
import { OverviewTabButton } from '@/components/explorer-grid/selected-item/tabs-overview.tsx'
import { VersionsTabButton } from '@/components/explorer-grid/selected-item/tabs-versions.tsx'
import { TabsJsonButton } from '@/components/explorer-grid/selected-item/tabs-json.tsx'
import { DependenciesTabsButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/index.tsx'
import { ItemHeader } from '@/components/explorer-grid/selected-item/item-header.tsx'
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
  const activeTab = useSelectedItemStore(state => state.activeTab)
  const setActiveTab = useSelectedItemStore(
    state => state.setActiveTab,
  )

  const handleTabChange = (newTab: string) =>
    setActiveTab(newTab as Tab)

  return (
    <div className="w-full">
      <Tabs
        uniqueId={selectedItem.id}
        onValueChange={handleTabChange}
        value={activeTab}>
        <TabsList variant="ghost" className="w-full gap-2 px-6">
          <OverviewTabButton />
          <TabsJsonButton />
          <InsightTabButton />
          <VersionsTabButton />
          <DependenciesTabsButton />
        </TabsList>
        <Outlet />
      </Tabs>
    </div>
  )
}
