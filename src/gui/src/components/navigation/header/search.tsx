import { useRef } from 'react'
import { useQueryState, parseAsString } from 'nuqs'
import { SearchResultsInput } from '@/components/search/search-results/input.tsx'
import { useKeyDown } from '@/components/hooks/use-keydown.tsx'
import { useSearchResultsStore } from '@/state/search-results.ts'

import type { SearchResultsInputHandle } from '@/components/search/search-results/input.tsx'

export const SearchHeader = () => {
  const searchInputRef = useRef<SearchResultsInputHandle>(null)
  const [searchTerm, setSearchTerm] = useQueryState(
    'q',
    parseAsString.withDefault(''),
  )
  const isLoading = useSearchResultsStore(state => state.isLoading)

  // Cmd/Ctrl + K to focus search
  useKeyDown(['meta+k', 'ctrl+k'], () => {
    searchInputRef.current?.focus()
  })

  // Esc to blur search input
  useKeyDown('escape', () => {
    if (searchInputRef.current?.isFocused()) {
      searchInputRef.current.blur()
    }
  })

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // The URL update will trigger the search automatically
    }
  }

  const handleButtonClick = () => {
    // The URL update will trigger the search automatically
  }

  return (
    <div className="flex w-full items-center justify-start">
      <SearchResultsInput
        ref={searchInputRef}
        value={searchTerm}
        onChange={e => void setSearchTerm(e.target.value)}
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
