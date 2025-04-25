import { Card } from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import type { GridItemOptions } from '@/components/explorer-grid/types.js'
import { Tabs, TabsList } from '@/components/ui/tabs.jsx'
import { useEffect, useRef } from 'react'
import {
  SelectedItemProvider,
  useSelectedItemStore,
} from '@/components/explorer-grid/selected-item/context.jsx'
import {
  InsightTabButton,
  InsightTabContent,
} from '@/components/explorer-grid/selected-item/tabs-insight.jsx'
import {
  OverviewTabButton,
  OverviewTabContent,
} from '@/components/explorer-grid/selected-item/tabs-overview.jsx'
import {
  VersionsTabButton,
  VersionsTabContent,
} from '@/components/explorer-grid/selected-item/tabs-versions.jsx'
import {
  TabsManifestButton,
  TabsManifestContent,
} from '@/components/explorer-grid/selected-item/tabs-manifest.jsx'
import { ItemHeader } from '@/components/explorer-grid/selected-item/item-header.jsx'

export const SelectedItem = ({ item }: GridItemOptions) => {
  const updateLinePositionReference = useGraphStore(
    state => state.updateLinePositionReference,
  )
  const linePositionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => {
      const rect = linePositionRef.current?.getBoundingClientRect()
      if (rect?.top) {
        updateLinePositionReference(rect.top)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  })

  return (
    <SelectedItemProvider selectedItem={item}>
      <div className="relative">
        <Card className="relative my-4 border-muted">
          <ItemHeader />
          <SelectedItemTabs />
        </Card>
        {
          // Draw the connection line between dependencies and the selected item
          item.to?.edgesOut && item.to.edgesOut.size > 0 ?
            <div
              ref={linePositionRef}
              className={
                'absolute -right-4 top-[44px] w-4 rounded-tr-sm border-t border-muted'
              }></div>
          : ''
        }
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
