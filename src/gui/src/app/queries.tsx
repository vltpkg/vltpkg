import { useNavigate } from 'react-router'
import { useEffect } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { SavedQueryItem } from '@/components/queries/saved-item.tsx'
import { sortAlphabeticallyAscending } from '@/components/sort-toggle.tsx'
import { Checkbox } from '@/components/ui/checkbox.tsx'
import { QueriesEmptyState } from '@/components/queries/queries-empty-state.tsx'
import { CreateQuery } from '@/components/queries/create-query.tsx'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { startDashboardData } from '@/lib/start-data.ts'
import { useQueriesStore } from '@/state/queries.ts'

import type { SavedQuery } from '@/state/types.ts'

const Queries = () => {
  const navigate = useNavigate()
  const savedQueries = useGraphStore(state => state.savedQueries)
  const dashboard = useGraphStore(state => state.dashboard)
  const updateDashboard = useGraphStore(
    state => state.updateDashboard,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const stamp = useGraphStore(state => state.stamp)
  const filteredQueries = useQueriesStore(
    state => state.filteredQueries,
  )
  const setFilteredQueries = useQueriesStore(
    state => state.setFilteredQueries,
  )
  const isCreating = useQueriesStore(state => state.isCreating)
  const setIsCreating = useQueriesStore(state => state.setIsCreating)
  const selectedQueries = useQueriesStore(
    state => state.selectedQueries,
  )
  const setSelectedQueries = useQueriesStore(
    state => state.setSelectedQueries,
  )

  const handleSelectQuery = (selectedQuery: SavedQuery) => {
    const isSelected = selectedQueries.some(
      query => query.id === selectedQuery.id,
    )
    const newSelectedQueries =
      isSelected ?
        selectedQueries.filter(query => query.id !== selectedQuery.id)
      : [...selectedQueries, selectedQuery]
    setSelectedQueries(newSelectedQueries)
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
  }, [savedQueries, setFilteredQueries])

  return (
    <section className="flex h-full w-full flex-col px-8">
      <div className="max-w-8xl flex w-full flex-col">
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
