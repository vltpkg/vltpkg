import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs.tsx'
import { Blocks } from 'lucide-react'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import type { SubTabDependencies } from '@/components/explorer-grid/selected-item/context.tsx'
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
import {
  FundingTabButton,
  FundingTabContent,
} from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-funding.tsx'

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
  const totalDependencies = useSelectedItemStore(
    state => state.depCount,
  )

  // Use the store's activeSubTab which should be synced with URL
  const activeTab =
    useSelectedItemStore(state => state.activeSubTab) ?? 'insights'
  const setActiveSubTab = useSelectedItemStore(
    state => state.setActiveSubTab,
  )

  const handleSubTabChange = (newSubTab: string) => {
    // This will update the URL, and the useEffect will update the state
    setActiveSubTab(newSubTab as SubTabDependencies)
  }

  return (
    <TabsContent value="dependencies">
      {totalDependencies && totalDependencies > 0 ?
        <>
          <Tabs onValueChange={handleSubTabChange} value={activeTab}>
            <TabsList variant="nestedCard">
              <InsightsTabButton />
              <LicensesTabButton />
              <DuplicatesTabButton />
              <FundingTabButton />
            </TabsList>
            <InsightsTabContent />
            <LicensesTabContent />
            <DuplicatesTabContent />
            <FundingTabContent />
          </Tabs>
        </>
      : <EmptyState
          icon={Blocks}
          message="This package has no installed dependencies."
        />
      }
    </TabsContent>
  )
}
