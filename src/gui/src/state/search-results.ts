import { create } from 'zustand'
import { fetchPackageSearch } from '@/lib/package-search.ts'
import { PAGE_SIZE_OPTIONS } from '@/components/explorer-grid/results/page-options.tsx'

import type { PageSizeOption } from '@/components/explorer-grid/results/page-options.tsx'
import type { SearchObject } from '@/lib/package-search.ts'

export type SearchResultsSortBy =
  | 'relevance'
  | 'popularity'
  | 'quality'
  | 'maintenance'
  | 'date'

export type SearchResultsSortDir = 'asc' | 'desc'

/**
 * Client-side sorting function for search results
 * (npm registry API doesn't support all sort options)
 */
const sortResults = (
  results: SearchObject[],
  sortBy: SearchResultsSortBy,
  sortDir: SearchResultsSortDir,
): SearchObject[] => {
  if (sortBy === 'relevance') {
    // Return as-is for relevance (API default)
    return results
  }

  const sorted = [...results].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'popularity':
        comparison =
          b.score.detail.popularity - a.score.detail.popularity
        break
      case 'quality':
        comparison = b.score.detail.quality - a.score.detail.quality
        break
      case 'maintenance':
        comparison =
          b.score.detail.maintenance - a.score.detail.maintenance
        break
      case 'date': {
        const dateA = new Date(a.package.date).getTime()
        const dateB = new Date(b.package.date).getTime()
        comparison = dateB - dateA // default desc (newest first)
        break
      }
    }

    return sortDir === 'asc' ? -comparison : comparison
  })

  return sorted
}

type SearchResultsState = {
  /**
   * The current page number
   */
  page: number
  /**
   * The total number of results available
   */
  total: number
  /**
   * The count of items on each page
   */
  pageSize: PageSizeOption
  /**
   * The search results for the current page
   */
  results: SearchObject[]
  /**
   * Loading state
   */
  isLoading: boolean
  /**
   * Error state
   */
  error: string | null
  /**
   * Current sort key
   */
  sortBy: SearchResultsSortBy
  /**
   * Current sort direction
   */
  sortDir: SearchResultsSortDir
  /**
   * The search query
   */
  query: string
  /**
   * The current search term in the input (may differ from query during typing)
   */
  searchTerm: string
  /**
   * Callback to update URL params (set by URL sync component)
   */
  updateURLCallback: ((params: Record<string, string>) => void) | null
}

type SearchResultsAction = {
  /**
   * Sets the current page
   */
  setPage: (page: number) => void
  /**
   * Sets the count of items on each page
   */
  setPageSize: (pageSize: PageSizeOption) => void
  /**
   * Sets the sort key
   */
  setSortBy: (sortBy: SearchResultsSortBy) => void
  /**
   * Sets the sort direction
   */
  setSortDir: (sortDir: SearchResultsSortDir) => void
  /**
   * Sets the search term in the input
   */
  setSearchTerm: (term: string) => void
  /**
   * Sets the query and search term
   */
  setQuery: (query: string) => void
  /**
   * Executes a search with the current search term
   */
  executeSearch: () => void
  /**
   * Fetches search results
   */
  fetchResults: (signal?: AbortSignal) => Promise<void>
  /**
   * Syncs state from URL params
   */
  syncFromURL: (params: {
    page?: number
    pageSize?: PageSizeOption
    sortBy?: SearchResultsSortBy
    sortDir?: SearchResultsSortDir
    query?: string
  }) => void
  /**
   * Sets the URL update callback
   */
  setURLCallback: (
    callback: (params: Record<string, string>) => void,
  ) => void
  /**
   * Reset the store
   */
  reset: () => void
}

const initialState: SearchResultsState = {
  page: 1,
  total: 0,
  pageSize: PAGE_SIZE_OPTIONS[0] as PageSizeOption,
  results: [],
  isLoading: false,
  error: null,
  sortBy: 'relevance',
  sortDir: 'desc',
  query: '',
  searchTerm: '',
  updateURLCallback: null,
}

export const useSearchResultsStore = create<
  SearchResultsState & SearchResultsAction
>((set, get) => ({
  ...initialState,
  setPage: (page: number) => {
    set({ page })
    const { updateURLCallback, pageSize } = get()
    if (updateURLCallback) {
      updateURLCallback({
        page: String(page),
        pageSize: String(pageSize),
      })
    }
  },
  setPageSize: (pageSize: PageSizeOption) => {
    set({ pageSize, page: 1 })
    const { updateURLCallback } = get()
    if (updateURLCallback) {
      updateURLCallback({ pageSize: String(pageSize), page: '1' })
    }
  },
  setSortBy: (sortBy: SearchResultsSortBy) => {
    set({ sortBy, page: 1 })
    const { updateURLCallback } = get()
    if (updateURLCallback) {
      updateURLCallback({ sort: sortBy, page: '1' })
    }
    // Re-sort existing results
    const { results, sortDir } = get()
    if (results.length > 0) {
      const sortedResults = sortResults(results, sortBy, sortDir)
      set({ results: sortedResults })
    }
  },
  setSortDir: (sortDir: SearchResultsSortDir) => {
    set({ sortDir })
    const { updateURLCallback } = get()
    if (updateURLCallback) {
      updateURLCallback({ dir: sortDir })
    }
    // Re-sort existing results
    const { results, sortBy } = get()
    if (results.length > 0) {
      const sortedResults = sortResults(results, sortBy, sortDir)
      set({ results: sortedResults })
    }
  },
  setSearchTerm: (searchTerm: string) => {
    set({ searchTerm })
  },
  setQuery: (query: string) => {
    set({ query, searchTerm: query })
  },
  executeSearch: () => {
    const { searchTerm, updateURLCallback } = get()
    if (!searchTerm || searchTerm.trim() === '') return

    set({ query: searchTerm, page: 1 })
    if (updateURLCallback) {
      updateURLCallback({ q: searchTerm, page: '1' })
    }
  },
  fetchResults: async (signal?: AbortSignal) => {
    const { query, page, pageSize, sortBy, sortDir } = get()

    if (!query) return

    set({ isLoading: true, error: null })

    try {
      const from = (page - 1) * pageSize
      const result = await fetchPackageSearch({
        text: query,
        size: pageSize,
        from,
        signal,
      })

      // Apply client-side sorting since npm registry doesn't support all sort options
      const sortedResults = sortResults(
        result.objects,
        sortBy,
        sortDir,
      )

      set({
        results: sortedResults,
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
  syncFromURL: params => {
    const updates: Partial<SearchResultsState> = {}

    if (params.page !== undefined) updates.page = params.page
    if (params.pageSize !== undefined)
      updates.pageSize = params.pageSize
    if (params.sortBy !== undefined) updates.sortBy = params.sortBy
    if (params.sortDir !== undefined) updates.sortDir = params.sortDir
    if (params.query !== undefined) {
      updates.query = params.query
      updates.searchTerm = params.query
    }

    set(updates)
  },
  setURLCallback: callback => {
    set({ updateURLCallback: callback })
  },
  reset: () => set(initialState),
}))
