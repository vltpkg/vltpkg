import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.js'
import { type SavedQuery } from '@/state/types.js'
import { SavedQueryItem } from '@/components/queries/saved-item.jsx'
import { FilterSearch } from '@/components/ui/filter-search.jsx'
import { DeleteQuery } from '@/components/queries/delete-query.jsx'
import {
  sortAlphabeticallyAscending,
  SortToggle,
} from '@/components/sort-toggle.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge.jsx'
import { Checkbox } from '@/components/ui/checkbox.jsx'
import { QueriesEmptyState } from '@/components/queries/queries-empty-state.jsx'

const Queries = () => {
  const savedQueries = useGraphStore(state => state.savedQueries)
  const [filteredQueries, setFilteredQueries] = useState<
    SavedQuery[]
  >(savedQueries ?? [])
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState<boolean>(false)
  const [selectedQueries, setSelectedQueries] = useState<
    SavedQuery[]
  >([])
  const savedLabels = useGraphStore(state => state.savedQueryLabels)

  const handleSelectQuery = (selectedQuery: SavedQuery) => {
    setSelectedQueries(prev => {
      const isSelected = prev.some(
        query => query.id === selectedQuery.id,
      )
      return isSelected ?
          prev.filter(query => query.id !== selectedQuery.id)
        : [...prev, selectedQuery]
    })
  }

  const handleSelectAll = () => {
    if (filteredQueries.length === selectedQueries.length) {
      setSelectedQueries([])
    } else {
      setSelectedQueries(filteredQueries)
    }
  }

  useEffect(() => {
    if (savedQueries) {
      sortAlphabeticallyAscending(
        filteredQueries,
        'name',
        setFilteredQueries,
      )
    }
  }, [savedQueries])

  return (
    <section className="flex min-h-[80svh] w-full grow flex-col bg-white dark:bg-black">
      <div className="flex flex-col px-8 py-4">
        <div className="flex justify-between">
          <div className="flex gap-2">
            <FilterSearch
              placeholder="Filter Queries"
              items={savedQueries}
              setFilteredItems={setFilteredQueries}
            />
            <SortToggle
              filteredItems={filteredQueries}
              setFilteredItems={setFilteredQueries}
              sortKey="name"
            />
            <div className="flex items-center">
              <div className="flex items-center">
                <DeleteQuery
                  deleteDialogOpen={deleteDialogOpen}
                  setDeleteDialogOpen={setDeleteDialogOpen}
                  selectedQueries={selectedQueries}
                  type="icon"
                />
              </div>
            </div>
          </div>
          <Button asChild variant="outline">
            <a href="/labels">
              <Tag />
              <span>Labels</span>
              <Badge variant="secondary">{savedLabels?.length}</Badge>
            </a>
          </Button>
        </div>

        <div className="mt-6">
          {!!savedQueries?.length && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2 flex items-center gap-3 px-3">
                <Checkbox
                  onCheckedChange={handleSelectAll}
                  className="border-muted-foreground/50 hover:border-muted-foreground/75"
                />
                <p className="text-sm font-medium text-neutral-500">
                  Name
                </p>
              </div>
              <div className="col-span-4 items-center px-1">
                <p className="text-sm font-medium text-neutral-500">
                  Query
                </p>
              </div>
              <div className="col-span-2 items-center">
                <p className="text-sm font-medium text-neutral-500">
                  Directory
                </p>
              </div>
              <div className="col-span-4 items-center">
                <p className="text-sm font-medium text-neutral-500">
                  Labels
                </p>
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-3">
            {savedQueries &&
              filteredQueries.map((query, idx) => (
                <SavedQueryItem
                  checked={selectedQueries.some(
                    selected => selected.id === query.id,
                  )}
                  handleSelect={handleSelectQuery}
                  key={idx}
                  item={query}
                />
              ))}
          </div>
        </div>
      </div>

      {!savedQueries?.length && <QueriesEmptyState />}
    </section>
  )
}

export { Queries }
