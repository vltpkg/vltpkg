import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { SearchResultsProvider as SearchResultsView } from '@/components/search/search-results/results.tsx'

export const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q')

  /**
   * Initialize default URL parameters if they're missing
   */
  useEffect(() => {
    if (!query) return

    if (!searchParams.get('page') || !searchParams.get('pageSize')) {
      const next = new URLSearchParams(searchParams)
      if (!next.get('page')) next.set('page', '1')
      if (!next.get('pageSize')) next.set('pageSize', '25')
      if (!next.get('sort')) next.set('sort', 'relevance')
      if (!next.get('dir')) next.set('dir', 'desc')
      setSearchParams(next, { replace: true })
    }
  }, [query, searchParams, setSearchParams])

  return <SearchResultsView />
}
