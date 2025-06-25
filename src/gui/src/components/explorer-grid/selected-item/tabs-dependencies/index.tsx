import { Outlet } from 'react-router'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import { useSelectedItemStore } from '@/components/explorer-grid/selected-item/context.tsx'
import { toHumanNumber } from '@/utils/human-number.ts'
import { InsightsTabButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-insights.tsx'
import { LicensesTabButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-licenses.tsx'
import { DuplicatesTabButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-duplicates.tsx'
import { FundingTabButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-funding.tsx'
import type { SubTabDependencies } from '@/components/explorer-grid/selected-item/context.tsx'

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
  const activeTab =
    useSelectedItemStore(state => state.activeSubTab) ?? 'insights'
  const setActiveSubTab = useSelectedItemStore(
    state => state.setActiveSubTab,
  )

  const handleSubTabChange = (newSubTab: string) => {
    setActiveSubTab(newSubTab as SubTabDependencies)
  }

  return (
    <TabsContent value="dependencies">
      <Tabs onValueChange={handleSubTabChange} value={activeTab}>
        <TabsList variant="nestedCard">
          <InsightsTabButton />
          <LicensesTabButton />
          <DuplicatesTabButton />
          <FundingTabButton />
        </TabsList>
        <Outlet />
      </Tabs>
    </TabsContent>
  )
}
