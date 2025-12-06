import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useSearchResultsStore } from '@/state/search-results.ts'

import type {
  SearchResultsSortBy,
  SearchResultsSortDir,
} from '@/state/search-results.ts'

/**
 * Hook to synchronize URL search params with the search results zustand store
 * This must be called once at the route level to establish the bidirectional sync
 */
export const useSyncSearchResultsURL = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const setURLCallback = useSearchResultsStore(
    state => state.setURLCallback,
  )
  const syncFromURL = useSearchResultsStore(
    state => state.syncFromURL,
  )
  const fetchResults = useSearchResultsStore(
    state => state.fetchResults,
  )

  const isInitialMount = useRef(true)

  // Set up the callback for store -> URL updates
  useEffect(() => {
    const callback = (params: Record<string, string>) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(params).forEach(([key, value]) => {
        next.set(key, value)
      })
      setSearchParams(next, { replace: true })
    }
    setURLCallback(callback)
  }, [searchParams, setSearchParams, setURLCallback])

  // Sync URL -> store when URL changes
  useEffect(() => {
    const query = searchParams.get('q') || ''

    const defaultPageSize = 25
    const rawPageSize = Number(
      searchParams.get('pageSize') ?? String(defaultPageSize),
    )
    const validPageSize = defaultPageSize

    const rawPage = Number(searchParams.get('page') ?? '1')
    const page = Math.max(rawPage, 1)

    const rawSort = (searchParams.get('sort') ??
      'relevance') as SearchResultsSortBy
    const validSorts: SearchResultsSortBy[] = [
      'relevance',
      'popularity',
      'quality',
      'maintenance',
      'date',
    ]
    const sortBy =
      validSorts.includes(rawSort) ? rawSort : 'relevance'

    const rawDir = searchParams.get('dir') ?? ''
    const sortDir: SearchResultsSortDir =
      rawDir === 'asc' || rawDir === 'desc' ? rawDir : 'desc'

    // Normalize URL if needed
    if (
      rawPage !== page ||
      rawPageSize !== validPageSize ||
      rawSort !== sortBy ||
      rawDir !== sortDir
    ) {
      const next = new URLSearchParams(searchParams)
      next.set('page', String(page))
      next.set('pageSize', String(validPageSize))
      next.set('sort', sortBy)
      next.set('dir', sortDir)
      setSearchParams(next, { replace: true })
    }

    // Sync to store
    syncFromURL({
      query,
      page,
      pageSize: validPageSize,
      sortBy,
      sortDir,
    })
  }, [searchParams, setSearchParams, syncFromURL])

  // Fetch results when query, page, or pageSize changes
  useEffect(() => {
    const controller = new AbortController()
    const query = searchParams.get('q')

    if (!query) return

    // Skip fetch on initial mount - let the component decide
    if (isInitialMount.current) {
      isInitialMount.current = false
      void fetchResults(controller.signal)
      return
    }

    void fetchResults(controller.signal)

    return () => {
      controller.abort()
    }
  }, [searchParams, fetchResults])
}
