import { hydrate } from '@vltpkg/dep-id/browser'
import { Card } from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import type { GridItemOptions } from '@/components/explorer-grid/types.js'
import { Tabs, TabsList } from '@/components/ui/tabs.jsx'
import { useEffect, useRef, useState } from 'react'
import { fetchDetails } from '@/lib/external-info.js'
import type { DetailsInfo } from '@/lib/external-info.js'
import type { Tab } from '@/components/explorer-grid/selected-item/context.jsx'
import { SelectedItemProvider } from '@/components/explorer-grid/selected-item/context.jsx'
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
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const specOptions = useGraphStore(state => state.specOptions)
  const updateLinePositionReference = useGraphStore(
    state => state.updateLinePositionReference,
  )
  const linePositionRef = useRef<HTMLDivElement>(null)
  const [details, setDetails] = useState<DetailsInfo>({})

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

  useEffect(() => {
    const abortController = new AbortController()
    async function retrieveDetails() {
      if (!item.to?.name) return
      const depIdSpec = hydrate(item.to.id, item.to.name, specOptions)
      const manifest = item.to.manifest ?? {}

      for await (const d of fetchDetails(
        depIdSpec,
        abortController.signal,
        manifest,
      )) {
        setDetails({
          ...details,
          ...d,
        })
      }
    }
    void retrieveDetails()

    return () => {
      abortController.abort()
    }
  }, [])

  return (
    <SelectedItemProvider
      selectedItem={item}
      details={details}
      activeTab={activeTab}
      setActiveTab={setActiveTab}>
      <div className="relative">
        <Card className="relative my-4 border-muted">
          <ItemHeader />
          <div className="w-full">
            <Tabs
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
