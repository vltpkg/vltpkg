import { create } from 'zustand'
import { fetchPackageSearch } from '@/lib/package-search.ts'
import { LRUCache } from '@/utils/lru-cache.ts'

import type { SearchObject } from '@/lib/package-search.ts'

/**
 * LRU cache for search results
 * Key format: "query-page-pageSize" (e.g., "react-1-25")
 * Stores individual page results for server-side pagination
 */
const searchResultsCache = new LRUCache<{
  objects: SearchObject[]
  total: number
}>(50)

const getCacheKey = (
  query: string,
  page: number,
  pageSize: number,
) => {
  return `${query}-${page}-${pageSize}`
}

type SearchResultsState = {
  /**
   * The search results
   */
  results: SearchObject[]
  /**
   * The total number of results available from the API
   */
  total: number
  /**
   * Loading state
   */
  isLoading: boolean
  /**
   * Error state
   */
  error: string | null
  /**
   * The current search query that was executed
   */
  query: string
}

type SearchResultsAction = {
  /**
   * Sets the query
   */
  setQuery: (query: string) => void
  /**
   * Fetches search results from the API for a specific page
   */
  fetchResults: (
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ) => Promise<void>
  /**
   * Reset the store
   */
  reset: () => void
}

const initialState: SearchResultsState = {
  results: [],
  total: 0,
  isLoading: false,
  error: null,
  query: '',
}

export const useSearchResultsStore = create<
  SearchResultsState & SearchResultsAction
>((set, get) => ({
  ...initialState,
  setQuery: (query: string) => {
    set({ query })
  },
  fetchResults: async (
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ) => {
    const { query } = get()

    if (!query) return

    // Check cache first
    const cacheKey = getCacheKey(query, page, pageSize)
    const cached = searchResultsCache.get(cacheKey)

    if (cached) {
      set({
        results: cached.objects,
        total: cached.total,
        isLoading: false,
        error: null,
      })
      return
    }

    set({ isLoading: true, error: null })

    try {
      // Fetch specific page from API
      const from = (page - 1) * pageSize
      const result = await fetchPackageSearch({
        text: query,
        size: pageSize,
        from,
        signal,
      })

      // Cache the results for this specific page
      searchResultsCache.set(cacheKey, {
        objects: result.objects,
        total: result.total,
      })

      set({
        results: result.objects,
        total: result.total,
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
            results: [],
            total: 0,
            isLoading: false,
            error: null,
          })
        } else {
          set({
            error: errorMessage || 'Failed to fetch search results',
            isLoading: false,
          })
        }
      }
    }
  },
  reset: () => set(initialState),
}))
