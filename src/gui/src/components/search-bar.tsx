import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input.jsx'
import { useGraphStore } from '@/state/index.js'

export const SearchBar = () => {
  const updateQuery = useGraphStore(state => state.updateQuery)
  const query = useGraphStore(state => state.query)
  return (
    <div className="flex grow items-center space-x-2">
      <Input
        className="lg:w-[35.25rem] w-96"
        type="search"
        placeholder="Query Lookup, e.g: :root > *"
        value={query}
        onChange={(e: ChangeEvent) => {
          const value = (e.currentTarget as HTMLInputElement).value
          updateQuery(value)
        }}
      />
    </div>
  )
}
