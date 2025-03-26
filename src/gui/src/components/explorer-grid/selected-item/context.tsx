import { createContext, useContext } from 'react'
import { useGraphStore } from '@/state/index.js'

export type Tab = 'overview' | 'insight' | 'versions' | 'manifest'

import type { GridItemData } from '@/components/explorer-grid/types.js'
import type { State } from '@/state/types.js'
import type { DetailsInfo } from '@/lib/external-info.js'

export interface SelectedItemContextValue {
  selectedItem: GridItemData
  securityArchive: State['securityArchive']
  selectedItemDetails: DetailsInfo
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}

const SelectedItemContext = createContext<
  SelectedItemContextValue | undefined
>(undefined)

export const SelectedItemProvider = ({
  children,
  selectedItem,
  details,
  activeTab,
  setActiveTab,
}: {
  children: React.ReactNode
  selectedItem: GridItemData
  details: DetailsInfo
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}) => {
  const securityArchive = useGraphStore(
    state => state.securityArchive,
  )

  return (
    <SelectedItemContext.Provider
      value={{
        selectedItem,
        securityArchive,
        selectedItemDetails: details,
        activeTab,
        setActiveTab,
      }}>
      {children}
    </SelectedItemContext.Provider>
  )
}

export const useSelectedItem = () => {
  const context = useContext(SelectedItemContext)
  if (!context) {
    throw new Error(
      'useSelectedItem must be used within a SelectedItemProvider',
    )
  }
  return context
}
