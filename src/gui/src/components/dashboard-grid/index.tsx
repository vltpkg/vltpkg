import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router'
import { useState } from 'react'
import { CardTitle } from '@/components/ui/card.tsx'
import { useGraphStore } from '@/state/index.ts'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { DashboardTable } from '@/components/dashboard-grid/dashboard-table.tsx'
import { getIconSet } from '@/utils/dashboard-tools.tsx'
import { format } from 'date-fns'
import { requestRouteTransition } from '@/lib/request-route-transition.ts'
import { LoadingSpinner } from '@/components/ui/loading-spinner.tsx'
import { useDashboardStore } from '@/state/dashboard.ts'

import type { MouseEvent } from 'react'
import type { DashboardDataProject } from '@/state/types.ts'

export type DashboardItemOptions = {
  item: DashboardDataProject
  onItemClick: (selectedProject: DashboardDataProject) => void
}

export const DashboardItem = ({
  item,
  onItemClick,
}: DashboardItemOptions) => {
  const { packageManager: PackageManger, runtime: RunTime } =
    getIconSet(item.tools)

  const onDashboardItemClick = (e: MouseEvent) => {
    e.preventDefault()
    onItemClick(item)
  }

  return (
    <div
      role="link"
      className="group relative w-full cursor-default"
      onClick={onDashboardItemClick}>
      {/* top */}
      <div className="relative flex h-24 items-center overflow-hidden rounded-t-lg border-x-[1px] border-t-[1px] border-muted bg-card transition-colors group-hover:bg-card-accent">
        <div className="flex px-3 py-2">
          <CardTitle className="text-md z-[1] font-medium">
            {item.name}
          </CardTitle>
        </div>
        <div className="absolute right-0 top-0 z-[1] flex flex-row rounded-sm px-3 py-2 backdrop-blur-[1px]">
          {item.mtime && (
            <p className="z-[1] text-[0.7rem] text-muted-foreground">
              {format(new Date(item.mtime).toJSON(), 'LLLL do, yyyy')}
            </p>
          )}
        </div>

        {/* icons */}
        <div className="absolute -inset-4 -right-2 flex flex-row items-center justify-end gap-2 bg-clip-content">
          {PackageManger && (
            <PackageManger
              size={120}
              className="stroke-0 text-neutral-200/80 dark:text-neutral-800/40"
            />
          )}
          {RunTime && (
            <RunTime
              size={120}
              className="stroke-0 text-neutral-200/80 dark:text-neutral-800/40"
            />
          )}
        </div>
      </div>

      {/* footer */}
      <div className="flex w-full items-center rounded-b-lg border-[1px] border-muted bg-card px-3 py-3 transition-colors group-hover:bg-card-accent">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="truncate text-left text-xs text-muted-foreground">
              {item.readablePath}
            </TooltipTrigger>
            <TooltipContent>{item.readablePath}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

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
      <AnimatePresence mode="wait">
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
