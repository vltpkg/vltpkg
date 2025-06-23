import { useState } from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs.tsx'
import { Blocks } from 'lucide-react'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { toHumanNumber } from '@/utils/human-number.ts'
import { EmptyState } from '@/components/explorer-grid/selected-item/tabs-dependencies/empty-state.tsx'
import {
  InsightsTabContent,
  InsightsTabButton,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-insights.tsx'
import {
  LicensesTabContent,
  LicensesTabButton,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-licenses.tsx'
import {
  DuplicatesTabContent,
  DuplicatesTabButton,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-duplicates.tsx'

type Tabs = 'insights' | 'licenses' | 'funding' | 'duplicates'

export const DependenciesTabsButton = () => {
  const totalDependencies = useSelectedItemStore(
    state => state.depCount,
  )
  return (
    <TabsTrigger
      variant="ghost"
      value="dependencies"
      className="w-fit px-2">
      Dependencies
      {totalDependencies && (
        <DataBadge
          variant="count"
          classNames={{ wrapperClassName: 'ml-1' }}
          content={toHumanNumber(totalDependencies)}
        />
      )}
    </TabsTrigger>
  )
}

export const DependenciesTabContent = () => {
  const [activeTab, setActiveTab] = useState<Tabs>('insights')
  const totalDependencies = useSelectedItemStore(
    state => state.depCount,
  )

  return (
    <TabsContent value="dependencies">
      {totalDependencies && totalDependencies > 0 ?
        <>
          <Tabs
            onValueChange={setActiveTab as (tab: string) => void}
            value={activeTab}>
            <TabsList variant="nestedCard">
              <InsightsTabButton />
              <LicensesTabButton />
              <DuplicatesTabButton />
            </TabsList>
            <InsightsTabContent />
            <LicensesTabContent />
            <DuplicatesTabContent />
          </Tabs>
        </>
      : <EmptyState
          icon={Blocks}
          message="This package has no installed dependencies"
        />
      }
    </TabsContent>
  )
}
