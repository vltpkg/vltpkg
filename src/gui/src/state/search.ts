import { create } from 'zustand'
import { fetchPackageSearch } from '@/lib/package-search.ts'

import type { SearchObject } from '@/lib/package-search.ts'

export type SearchState = {
  /**
   * Whether the search modal is open (dropdown with results)
   */
  hasResults: boolean
  /**
   * The current search term
   */
  searchTerm: string
  /**
   * The search results from the API
   */
  searchResults: SearchObject[]
  /**
   * Whether a search request is in progress
   */
  isLoading: boolean
  /**
   * Error message from the last search request
   */
  error: string | null
  /**
   * Index of the currently selected search result (-1 means no selection)
   */
  selectedIndex: number
}

export type SearchAction = {
  /**
   * Set whether the search modal is open
   */
  setHasResults: (hasResults: SearchState['hasResults']) => void
  /**
   * Set the current search term and trigger debounced search
   */
  setSearchTerm: (searchTerm: SearchState['searchTerm']) => void
  /**
   * Set the currently selected result index
   */
  setSelectedIndex: (
    selectedIndex: SearchState['selectedIndex'],
  ) => void
  /**
   * Perform a search with the current debounced term
   */
  performSearch: (term: string, signal?: AbortSignal) => Promise<void>
  /**
   * Reset the search state
   */
  reset: () => void
}

const initialState: SearchState = {
  hasResults: false,
  searchTerm: '',
  searchResults: [],
  isLoading: false,
  error: null,
  selectedIndex: -1,
}

export const useSearchStore = create<SearchState & SearchAction>(
  set => {
    const store = {
      ...initialState,
      setHasResults: (hasResults: SearchState['hasResults']) =>
        set(() => ({ hasResults })),
      setSearchTerm: (searchTerm: SearchState['searchTerm']) => {
        set({ searchTerm })
      },
      setSelectedIndex: (
        selectedIndex: SearchState['selectedIndex'],
      ) => set(() => ({ selectedIndex })),
      performSearch: async (term: string, signal?: AbortSignal) => {
        if (!term || term === '') {
          set({
            searchResults: [],
            hasResults: false,
            error: null,
            selectedIndex: -1,
            isLoading: false,
          })
          return
        }

        set({ isLoading: true, error: null })

        try {
          const result = await fetchPackageSearch({
            text: term,
            size: 10,
            signal,
          })

          set({
            searchResults: result.objects,
            selectedIndex: -1,
            hasResults: result.objects.length > 0,
            isLoading: false,
          })
        } catch (e) {
          if ((e as { name?: unknown }).name !== 'AbortError') {
            // Treat 400 errors (invalid search terms) as "no results" rather than an error
            const errorMessage =
              e instanceof Error ? e.message : String(e)
            const is400Error =
              errorMessage.includes('400') ||
              errorMessage.includes('Bad Request')

            if (is400Error) {
              set({
                searchResults: [],
                hasResults: false,
                error: null,
                isLoading: false,
              })
            } else {
              set({
                error: errorMessage || 'Failed to search packages',
                searchResults: [],
                hasResults: false,
                isLoading: false,
              })
            }
          }
        }
      },
      reset: () => set(initialState),
    }

    return store
  },
)
