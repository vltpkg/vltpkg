import { NavLink } from 'react-router'
import { FilterSearch } from '@/components/ui/filter-search.tsx'
import { DeleteQuery } from '@/components/queries/delete-query.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Plus, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { SortToggle } from '@/components/sort-toggle.tsx'
import { useGraphStore } from '@/state/index.ts'
import { useQueriesStore } from '@/state/queries.ts'

export const QueriesHeader = () => {
  const savedLabels = useGraphStore(state => state.savedQueryLabels)
  const savedQueries = useGraphStore(state => state.savedQueries)

  const filteredQueries = useQueriesStore(
    state => state.filteredQueries,
  )
  const setFilteredQueries = useQueriesStore(
    state => state.setFilteredQueries,
  )
  const isCreating = useQueriesStore(state => state.isCreating)
  const setIsCreating = useQueriesStore(state => state.setIsCreating)
  const deleteDialogOpen = useQueriesStore(
    state => state.deleteDialogOpen,
  )
  const setDeleteDialogOpen = useQueriesStore(
    state => state.setDeleteDialogOpen,
  )
  const selectedQueries = useQueriesStore(
    state => state.selectedQueries,
  )

  return (
    <div className="flex w-full items-center justify-between gap-2">
      <FilterSearch
        placeholder="Filter Queries"
        items={savedQueries}
        className="grow"
        setFilteredItems={setFilteredQueries}
      />
      <SortToggle
        filteredItems={filteredQueries}
        setFilteredItems={setFilteredQueries}
        sortKey="name"
        classNames={{
          toggleClassName: 'h-9 rounded-xl px-[3px]',
          sliderClassName: 'size-[1.9rem] rounded-[11px]',
          optionClassName: 'rounded-lg',
        }}
      />
      <div className="flex items-center">
        <div className="flex items-center">
          <DeleteQuery
            deleteDialogOpen={deleteDialogOpen}
            setDeleteDialogOpen={setDeleteDialogOpen}
            selectedQueries={selectedQueries}
            className="rounded-xl"
            type="icon"
          />
        </div>
      </div>
      {savedQueries?.length !== 0 && (
        <Button
          disabled={isCreating}
          onClick={() => setIsCreating(true)}
          className="rounded-xl">
          <span className="hidden md:flex">New Query</span>
          <Plus />
        </Button>
      )}
      <Button asChild variant="outline" className="rounded-xl">
        <NavLink to="/labels">
          <Tag />
          <span>Labels</span>
          <Badge variant="secondary">{savedLabels?.length}</Badge>
        </NavLink>
      </Button>
    </div>
  )
}
