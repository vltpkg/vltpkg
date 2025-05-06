import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, NavLink } from 'react-router'
import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import type { DashboardDataProject } from '@/state/types.ts'
import { CardTitle } from '@/components/ui/card.tsx'
import { useGraphStore } from '@/state/index.ts'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.tsx'
import { FilterSearch } from '@/components/ui/filter-search.tsx'
import { TableFilterSearch } from '@/components/data-table/table-filter-search.tsx'
import { TableViewDropdown } from '@/components/data-table/table-view-dropdown.tsx'
import { DashboardTable } from '@/components/dashboard-grid/dashboard-table.tsx'
import { DashboardViewToggle } from '@/components/dashboard-grid/dashboard-view-toggle.tsx'
import type { View } from '@/components/dashboard-grid/dashboard-view-toggle.tsx'
import type { VisibilityState, Table } from '@tanstack/react-table'
import { getIconSet } from '@/utils/dashboard-tools.tsx'
import { format } from 'date-fns'
import { requestRouteTransition } from '@/lib/request-route-transition.ts'
import { Button } from '@/components/ui/button.tsx'
import { Plus } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner.tsx'
import { SortDropdown } from '@/components/sort-dropdown.tsx'

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
      <div className="relative flex h-24 items-center overflow-hidden rounded-t-lg border-x-[1px] border-t-[1px] border-muted bg-card transition-all group-hover:bg-card-accent">
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
      <div className="flex w-full items-center rounded-b-lg border-[1px] border-muted bg-card px-3 py-3 transition-all group-hover:bg-card-accent">
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

  const [currentView, setCurrentView] = useState<View>('grid')
  const [tableFilterValue, setTableFilterValue] = useState<string>('')
  const [filteredProjects, setFilteredProjects] = useState<
    DashboardDataProject[]
  >([])
  const [table, setTable] = useState<
    Table<DashboardDataProject> | undefined
  >(undefined)
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>({
      type: false,
      private: false,
      version: false,
    })
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

  useEffect(() => {
    if (dashboard) {
      setFilteredProjects(
        dashboard.projects.sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      )
    }
  }, [dashboard])

  if (inProgress) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-scroll px-8 pb-8 pt-1">
      <div className="grid w-full max-w-8xl grid-cols-3 gap-2 pb-8 md:flex">
        {currentView === 'table' ?
          <TableFilterSearch
            filterValue={tableFilterValue}
            onFilterChange={setTableFilterValue}
            className="col-span-3 w-full"
          />
        : <FilterSearch
            placeholder="Filter Projects"
            items={dashboard?.projects ?? []}
            setFilteredItems={setFilteredProjects}
            className="col-span-3 w-full"
          />
        }
        <div className="col-span-3 flex gap-2">
          <DashboardViewToggle
            currentView={currentView}
            setCurrentView={setCurrentView}
          />
          {currentView === 'table' ?
            <motion.div
              key={currentView}
              initial={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              animate={{ opacity: 1 }}>
              <TableViewDropdown
                columnVisibility={columnVisibility}
                setColumnVisibility={setColumnVisibility}
                table={table}
                className="w-[120px]"
              />
            </motion.div>
          : <motion.div
              key={currentView}
              exit={{ opacity: 0 }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}>
              <SortDropdown
                items={filteredProjects}
                setFilteredItems={setFilteredProjects}
                sortKey="name"
              />
            </motion.div>
          }
          <Button asChild className="ml-auto">
            <NavLink to="/create-new-project">
              <Plus size={24} />
              Create New Project
            </NavLink>
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentView === 'table' ?
          <motion.div
            key={currentView}
            exit={{ opacity: 0, y: 5 }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-8xl flex-col">
            <DashboardTable
              data={dashboard?.projects ?? []}
              setTable={setTable}
              tableFilterValue={tableFilterValue}
              columnVisibility={columnVisibility}
              setColumnVisibility={setColumnVisibility}
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
