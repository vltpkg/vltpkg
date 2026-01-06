import { useQueryState, parseAsString } from 'nuqs'
import { SearchResultsInput } from '@/components/search/search-results/input.tsx'
import { useSearchResultsStore } from '@/state/search-results.ts'

export const SearchHeader = () => {
  const [searchTerm, setSearchTerm] = useQueryState(
    'q',
    parseAsString.withDefault(''),
  )
  const isLoading = useSearchResultsStore(state => state.isLoading)

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
