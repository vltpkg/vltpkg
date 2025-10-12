import { useEffect, useRef } from 'react'
import { useSearchResultsStore } from '@/state/search-results.ts'
import { SearchResultsInput } from '@/components/search/search-results/input.tsx'
import { useDebounce } from '@/components/hooks/use-debounce.tsx'

export const SearchHeader = () => {
  const searchTerm = useSearchResultsStore(state => state.searchTerm)
  const setSearchTerm = useSearchResultsStore(
    state => state.setSearchTerm,
  )
  const executeSearch = useSearchResultsStore(
    state => state.executeSearch,
  )
  const isLoading = useSearchResultsStore(state => state.isLoading)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const isInitialMount = useRef(true)

  // search when debounced term changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (debouncedSearchTerm && debouncedSearchTerm.trim() !== '') {
      executeSearch()
    }
  }, [debouncedSearchTerm, executeSearch])

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      executeSearch()
    }
  }

  const handleButtonClick = () => {
    executeSearch()
  }

  return (
    <div className="flex w-full items-center justify-start">
      <SearchResultsInput
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        onButtonClick={handleButtonClick}
        loading={isLoading}
        classNames={{
          wrapper: 'w-full',
        }}
      />
    </div>
  )
}
