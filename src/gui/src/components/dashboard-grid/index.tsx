import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import { useState } from 'react'
import { useGraphStore } from '@/state/index.ts'
import { DashboardTable } from '@/components/dashboard-grid/dashboard-table.tsx'
import { requestRouteTransition } from '@/lib/request-route-transition.ts'
import { LoadingSpinner } from '@/components/ui/loading-spinner.tsx'
import { useDashboardStore } from '@/state/dashboard.ts'
import { DashboardItem } from '@/components/dashboard-grid/dashboard-item.tsx'

import type { DashboardDataProject } from '@/state/types.ts'

export const DashboardGrid = () => {
  const navigate = useNavigate()
  const dashboard = useGraphStore(state => state.dashboard)
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)

  const table = useDashboardStore(state => state.table)
  const setTable = useDashboardStore(state => state.updateTable)
  const currentView = useDashboardStore(state => state.currentView)
  const tableFilterValue = useDashboardStore(
    state => state.tableFilterValue,
  )
  const filteredProjects = useDashboardStore(
    state => state.filteredProjects,
  )
  const columnVisibility = useDashboardStore(
    state => state.columnVisibility,
  )
  const setColumnVisibility = useDashboardStore(
    state => state.setColumnVisibility,
  )

  const [inProgress, setInProgress] = useState<boolean>(false)
  const onItemClick = (selectedProject: DashboardDataProject) => {
    if (inProgress) return
    setInProgress(true)

    void requestRouteTransition<{ path: string }>({
      navigate,
      updateErrorCause,
      updateQuery,
      updateStamp,
      body: {
        path: selectedProject.path,
      },
      url: '/select-project',
      destinationRoute: '/explore',
      errorMessage: 'Failed to select project.',
    }).catch((err: unknown) => console.error(err))
  }

  if (inProgress) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col px-8 py-4">
      <AnimatePresence initial={false} mode="wait">
        {currentView === 'table' ?
          <motion.div
            key={currentView}
            exit={{ opacity: 0, y: 5 }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-8xl flex-col py-4">
            <DashboardTable
              data={dashboard?.projects ?? []}
              setTable={value => {
                const newValue =
                  typeof value === 'function' ? value(table) : value
                setTable(newValue)
              }}
              tableFilterValue={tableFilterValue}
              columnVisibility={columnVisibility}
              setColumnVisibility={value => {
                const newValue =
                  typeof value === 'function' ?
                    value(columnVisibility)
                  : value
                setColumnVisibility(newValue)
              }}
              onItemClick={onItemClick}
            />
          </motion.div>
        : <motion.div
            key={currentView}
            exit={{ opacity: 0, y: -5 }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-8xl flex-col">
            <p className="mb-4 text-sm font-semibold">Projects</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dashboard?.projects ?
                filteredProjects.map((item, index) => (
                  <DashboardItem
                    key={index}
                    item={item}
                    onItemClick={onItemClick}
                  />
                ))
              : <p>No projects found</p>}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>
  )
}
