import type { ReactNode } from 'react'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'
import { createContext, useContext } from 'react'
import { SOCKET_SECURITY_DETAILS } from '@/lib/constants/socket.js'

export type Tab = 'overview' | 'insight' | 'versions' | 'manifest'

import type { GridItemData } from '@/components/explorer-grid/types.js'
import type { DetailsInfo } from '@/lib/external-info.js'
import type { Insights } from '@vltpkg/query'

const getSocketInsights = (
  insights?: Insights,
): SocketSecurityDetails[] | undefined => {
  if (!insights?.scanned) return

  return Object.entries(insights)
    .flatMap(([key, value]) => {
      if (typeof value === 'boolean' && value) {
        return SOCKET_SECURITY_DETAILS[
          key as keyof typeof SOCKET_SECURITY_DETAILS
        ] as SocketSecurityDetails
      }

      if (typeof value === 'object') {
        return Object.entries(value)
          .filter(([, subValue]) => subValue === true)
          .map(([subKey]) => {
            const parentInsight =
              SOCKET_SECURITY_DETAILS[
                key as keyof typeof SOCKET_SECURITY_DETAILS
              ]
            return (
                parentInsight && typeof parentInsight === 'object'
              ) ?
                (parentInsight[
                  subKey as keyof typeof parentInsight
                ] as SocketSecurityDetails)
              : undefined
          })
          .filter(Boolean)
      }

      return []
    })
    .filter(Boolean) as SocketSecurityDetails[]
}

export interface SelectedItemContextValue {
  selectedItem: GridItemData
  selectedItemDetails: DetailsInfo
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
  insights: SocketSecurityDetails[] | undefined
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
  children: ReactNode
  selectedItem: GridItemData
  details: DetailsInfo
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}) => {
  const insights = getSocketInsights(selectedItem.to?.insights)

  return (
    <SelectedItemContext.Provider
      value={{
        selectedItem,
        selectedItemDetails: details,
        activeTab,
        setActiveTab,
        insights,
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
