import { createContext, useEffect, useState, useContext } from 'react'
import { useStore, createStore } from 'zustand'
import { hydrate } from '@vltpkg/dep-id/browser'
import { useGraphStore } from '@/state/index.js'
import { fetchDetails } from '@/lib/external-info.js'

import { SOCKET_SECURITY_DETAILS } from '@/lib/constants/socket.js'

import type { StoreApi } from 'zustand'
import type { GridItemData } from '@/components/explorer-grid/types.js'
import type { DetailsInfo } from '@/lib/external-info.js'
import type { Insights } from '@vltpkg/query'
import type { PropsWithChildren } from 'react'
import type { SocketSecurityDetails } from '@/lib/constants/socket.js'
import type { PackageScore } from '@vltpkg/security-archive'
import type { Manifest } from '@vltpkg/types'

export type Tab = 'overview' | 'insights' | 'versions' | 'manifest'

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

type SelectedItemStoreState = {
  selectedItem: GridItemData
  activeTab: Tab
  selectedItemDetails: DetailsInfo
  manifest: Manifest | null
  packageScore?: PackageScore
  insights: SocketSecurityDetails[] | undefined
}

type SelectedItemStoreAction = {
  setActiveTab: (tab: SelectedItemStoreState['activeTab']) => void
  setSelectedItemDetails: (
    selectedItemDetails: SelectedItemStoreState['selectedItemDetails'],
  ) => void
}

const SelectedItemContext = createContext<
  | StoreApi<SelectedItemStoreAction & SelectedItemStoreState>
  | undefined
>(undefined)

type SelectedItemProviderProps = PropsWithChildren & {
  selectedItem: GridItemData
}

export const SelectedItemProvider = ({
  children,
  selectedItem,
}: SelectedItemProviderProps) => {
  const specOptions = useGraphStore(state => state.specOptions)

  const [selectedItemStore] = useState(() =>
    createStore<SelectedItemStoreAction & SelectedItemStoreState>(
      set => ({
        selectedItem,
        manifest: selectedItem.to?.manifest ?? null,
        packageScore: selectedItem.to?.insights.score,
        insights: getSocketInsights(selectedItem.to?.insights),
        selectedItemDetails: {},
        setSelectedItemDetails: (
          selectedItemDetails: SelectedItemStoreState['selectedItemDetails'],
        ) => set(() => ({ selectedItemDetails })),
        activeTab: 'overview',
        setActiveTab: (
          activeTab: SelectedItemStoreState['activeTab'],
        ) => set(() => ({ activeTab })),
      }),
    ),
  )

  const fetchDetailsAsync = async (
    store: StoreApi<SelectedItemStoreAction & SelectedItemStoreState>,
  ) => {
    const state = store.getState()
    const item = state.selectedItem

    if (!item.to?.name) return

    const depIdSpec = hydrate(item.to.id, item.to.name, specOptions)
    const manifest = item.to.manifest ?? {}
    const abortController = new AbortController()

    for await (const d of fetchDetails(
      depIdSpec,
      abortController.signal,
      manifest,
    )) {
      store.setState(state => ({
        selectedItemDetails: {
          ...state.selectedItemDetails,
          ...d,
        },
      }))
    }
  }

  useEffect(() => {
    void fetchDetailsAsync(selectedItemStore)
  }, [selectedItemStore, specOptions])

  return (
    <SelectedItemContext.Provider value={selectedItemStore}>
      {children}
    </SelectedItemContext.Provider>
  )
}

export const useSelectedItemStore = <T,>(
  selector: (
    state: SelectedItemStoreAction & SelectedItemStoreState,
  ) => T,
) => {
  const store = useContext(SelectedItemContext)
  if (!store) {
    throw new Error(
      'useSelectedItemStore must be used within a SelectedItemProvider',
    )
  }
  return useStore(store, selector)
}
