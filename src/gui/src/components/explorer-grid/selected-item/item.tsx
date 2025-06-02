import { Card } from '@/components/ui/card.tsx'
import { Tabs, TabsList } from '@/components/ui/tabs.tsx'
import {
  SelectedItemProvider,
  useSelectedItemStore,
} from '@/components/explorer-grid/selected-item/context.tsx'
import {
  InsightTabButton,
  InsightTabContent,
} from '@/components/explorer-grid/selected-item/tabs-insight.tsx'
import {
  OverviewTabButton,
  OverviewTabContent,
} from '@/components/explorer-grid/selected-item/tabs-overview.tsx'
import {
  VersionsTabButton,
  VersionsTabContent,
} from '@/components/explorer-grid/selected-item/tabs-versions.tsx'
import {
  TabsManifestButton,
  TabsManifestContent,
} from '@/components/explorer-grid/selected-item/tabs-manifest.tsx'
import { ItemHeader } from '@/components/explorer-grid/selected-item/item-header.tsx'
import type { GridItemData } from '@/components/explorer-grid/types.ts'

export const Item = ({ item }: { item: GridItemData }) => {
  return (
    <SelectedItemProvider selectedItem={item}>
      <div className="relative">
        <Card className="relative border-muted">
          <ItemHeader />
          <SelectedItemTabs />
        </Card>
      </div>
    </SelectedItemProvider>
  )
}

const SelectedItemTabs = () => {
  const selectedItem = useSelectedItemStore(
    state => state.selectedItem,
  )
  const activeTab = useSelectedItemStore(state => state.activeTab)
  const setActiveTab = useSelectedItemStore(
    state => state.setActiveTab,
  )

  return (
    <div className="w-full">
      <Tabs
        uniqueId={selectedItem.id}
        onValueChange={setActiveTab as (tab: string) => void}
        value={activeTab}>
        <TabsList variant="ghost" className="w-full gap-2 px-6">
          <OverviewTabButton />
          <TabsManifestButton />
          <InsightTabButton />
          <VersionsTabButton />
        </TabsList>
        <OverviewTabContent />
        <TabsManifestContent />
        <InsightTabContent />
        <VersionsTabContent />
      </Tabs>
    </div>
  )
}
