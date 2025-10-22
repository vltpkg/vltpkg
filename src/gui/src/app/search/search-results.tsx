import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { SearchResults as SearchResultsView } from '@/components/search/search-results/results.tsx'

export const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q')

  /**
   * Redirect to search homepage if no query is present
   */
  useEffect(() => {
    if (!query) {
      void navigate('/', { replace: true })
    }
  }, [query, navigate])

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

  // Don't render anything while redirecting
  if (!query) {
    return null
  }

  return (
    <section className="mt-16 p-4 md:mx-4 md:max-h-[calc(100svh-64px-84px)] md:min-h-[calc(100svh-64px-84px)] md:overflow-y-scroll md:rounded-2xl md:border md:border-muted md:bg-sidebar">
      <SearchResultsView />
    </section>
  )
}
