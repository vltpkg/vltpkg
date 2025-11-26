import { create } from 'zustand'
import { fetchPackageSearch } from '@/lib/package-search.ts'
import { LRUCache } from '@/utils/lru-cache.ts'

import type { SearchObject } from '@/lib/package-search.ts'

/**
 * LRU cache for command palette search results
 */
const searchCache = new LRUCache<SearchObject[]>(50)

export type SearchState = {
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
}

export type SearchAction = {
  /**
   * Set the current search term and trigger debounced search
   */
  setSearchTerm: (searchTerm: SearchState['searchTerm']) => void
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
  searchTerm: '',
  searchResults: [],
  isLoading: false,
  error: null,
}

export const useSearchStore = create<SearchState & SearchAction>(
  set => {
    const store = {
      ...initialState,
      setSearchTerm: (searchTerm: SearchState['searchTerm']) => {
        set({ searchTerm })
      },
      performSearch: async (term: string, signal?: AbortSignal) => {
        if (!term || term === '') {
          set({
            searchResults: [],
            error: null,
            isLoading: false,
          })
          return
        }

        // Check cache first
        const cached = searchCache.get(term)
        if (cached) {
          set({
            searchResults: cached,
            isLoading: false,
            error: null,
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

          // Cache the results
          searchCache.set(term, result.objects)

          set({
            searchResults: result.objects,
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
                error: null,
                isLoading: false,
              })
            } else {
              set({
                error: errorMessage || 'Failed to search packages',
                searchResults: [],
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
