import { Outlet } from 'react-router'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'
import { DataBadge } from '@/components/ui/data-badge.tsx'
import {
  useSelectedItemStore,
  useTabNavigation,
} from '@/components/explorer-grid/selected-item/context.tsx'
import { toHumanNumber } from '@/utils/human-number.ts'
import { InsightsTabButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-insights.tsx'
import { LicensesTabButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-licenses.tsx'
import { DuplicatesTabButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-duplicates.tsx'
import { FundingTabButton } from '@/components/explorer-grid/selected-item/tabs-dependencies/tabs-funding.tsx'
import { AnimatePresence } from 'framer-motion'
import {
  MotionTabsContent,
  tabMotion,
} from '@/components/explorer-grid/selected-item/helpers.tsx'
import { useRef, useCallback } from 'react'

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
  const { subTab: activeSubTab, setActiveSubTab } = useTabNavigation()
  const currentSubTabRef = useRef<SubTabDependencies | undefined>(
    activeSubTab,
  )

  if (currentSubTabRef.current !== activeSubTab) {
    currentSubTabRef.current = activeSubTab
  }

  const handleSubTabChange = useCallback(
    (subTab: string) => {
      const newSubTab = subTab as SubTabDependencies
      if (currentSubTabRef.current !== newSubTab) {
        currentSubTabRef.current = newSubTab
        setActiveSubTab(newSubTab)
      }
    },
    [setActiveSubTab],
  )

  return (
    <MotionTabsContent {...tabMotion} value="dependencies">
      <Tabs onValueChange={handleSubTabChange} value={activeSubTab}>
        <TabsList variant="nestedCard">
          <InsightsTabButton />
          <LicensesTabButton />
          <DuplicatesTabButton />
          <FundingTabButton />
        </TabsList>
        <div className="min-h-64 overflow-hidden rounded-b-xl bg-card">
          <AnimatePresence initial={false} mode="wait">
            <Outlet key={activeSubTab} />
          </AnimatePresence>
        </div>
      </Tabs>
    </MotionTabsContent>
  )
}
