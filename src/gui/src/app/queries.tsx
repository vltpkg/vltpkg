import { useNavigate, NavLink } from 'react-router'
import { useEffect, useState } from 'react'
import { useGraphStore } from '@/state/index.ts'
import type { SavedQuery } from '@/state/types.ts'
import { SavedQueryItem } from '@/components/queries/saved-item.tsx'
import { FilterSearch } from '@/components/ui/filter-search.tsx'
import { DeleteQuery } from '@/components/queries/delete-query.tsx'
import {
  sortAlphabeticallyAscending,
  SortToggle,
} from '@/components/sort-toggle.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Plus, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { QueriesEmptyState } from '@/components/queries/queries-empty-state.tsx'
import { CreateQuery } from '@/components/queries/create-query.tsx'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { startDashboardData } from '@/lib/start-data.ts'

const Queries = () => {
  const navigate = useNavigate()
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
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const dashboard = useGraphStore(state => state.dashboard)
  const updateDashboard = useGraphStore(
    state => state.updateDashboard,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const stamp = useGraphStore(state => state.stamp)

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
    startDashboardData({
      navigate,
      updateDashboard,
      updateErrorCause,
      stamp,
    })
  }, [stamp, navigate, updateDashboard, updateErrorCause])

  useEffect(() => {
    if (savedQueries) {
      sortAlphabeticallyAscending(
        savedQueries,
        'name',
        setFilteredQueries,
      )
    }
  }, [savedQueries])

  return (
    <section className="flex h-full max-h-[calc(100svh-65px-16px)] w-full grow flex-col overflow-y-scroll rounded-b-lg border-x-[1px] border-b-[1px] px-8">
      <div className="flex w-full max-w-8xl flex-col">
        <div className="mb-4 flex justify-between pt-1">
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
          <div className="flex items-center gap-2">
            {savedQueries?.length !== 0 && (
              <Button
                disabled={isCreating}
                onClick={() => setIsCreating(true)}>
                <span>New Query</span>
                <Plus />
              </Button>
            )}
            <Button asChild variant="outline">
              <NavLink to="/labels">
                <Tag />
                <span>Labels</span>
                <Badge variant="secondary">
                  {savedLabels?.length}
                </Badge>
              </NavLink>
            </Button>
          </div>
        </div>

        <LayoutGroup>
          <AnimatePresence mode="popLayout" initial={false}>
            {isCreating && (
              <motion.div
                layout="preserve-aspect"
                key="create-query"
                initial={{ height: 0, opacity: 0, scale: 0.8 }}
                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.75,
                  ease: [0.16, 1, 0.3, 1],
                }}
                exit={{ height: 0, opacity: 0, scale: 0.8 }}
                className="mt-6">
                <CreateQuery
                  dashboard={dashboard}
                  onClose={() => setIsCreating(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout="position" className="mt-6">
            {!!savedQueries?.length && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: isCreating ? 0 : 1 }}
                exit={{ opacity: 1 }}
                transition={{
                  duration: 0.75,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="grid grid-cols-12 gap-4">
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
              </motion.div>
            )}

            <motion.div className="mt-3 flex h-full flex-col gap-3">
              {savedQueries &&
                filteredQueries.map(query => (
                  <SavedQueryItem
                    checked={selectedQueries.some(
                      selected => selected.id === query.id,
                    )}
                    dashboard={dashboard}
                    handleSelect={handleSelectQuery}
                    key={query.id}
                    item={query}
                  />
                ))}
            </motion.div>
          </motion.div>
        </LayoutGroup>
      </div>

      {!savedQueries?.length && (
        <QueriesEmptyState dashboard={dashboard} />
      )}
    </section>
  )
}

export { Queries }
