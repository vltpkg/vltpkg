import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, type MouseEvent } from 'react'
import { type DashboardDataProject } from '@/state/types.js'
import { CardTitle } from '@/components/ui/card.jsx'
import { useGraphStore } from '@/state/index.js'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import { FilterSearch } from '@/components/ui/filter-search.jsx'
import { TableFilterSearch } from '@/components/data-table/table-filter-search.jsx'
import { TableViewDropdown } from '@/components/data-table/table-view-dropdown.jsx'
import { DashboardTable } from '@/components/dashboard-grid/dashboard-table.jsx'
import { SortToggle } from '@/components/sort-toggle.jsx'
import {
  type View,
  DashboardViewToggle,
} from '@/components/dashboard-grid/dashboard-view-toggle.jsx'
import {
  type VisibilityState,
  type Table,
} from '@tanstack/react-table'
import { getIconSet } from '@/utils/dashboard-tools.jsx'
import { format } from 'date-fns'
import { requestRouteTransition } from '@/lib/request-route-transition.js'
import { Button } from '@/components/ui/button.jsx'
import { Plus } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner.jsx'

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
    <a
      href="#"
      className="group relative w-full md:w-96"
      onClick={onDashboardItemClick}>
      {/* top */}
      <div className="relative flex h-20 items-center overflow-hidden rounded-t-lg border-x-[1px] border-t-[1px] bg-card transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-700">
        <div className="flex px-3 py-2">
          <CardTitle className="text-md font-medium">
            {item.name}
          </CardTitle>
        </div>
        <div className="absolute right-0 top-0 z-[1] flex flex-row rounded-sm px-3 py-2 backdrop-blur-[1px]">
          {item.mtime && (
            <p className="text-[0.7rem] text-muted-foreground">
              {format(
                new Date(item.mtime).toJSON(),
                'LLLL do, yyyy | hh:mm aa',
              )}
            </p>
          )}
        </div>

        {/* icons */}
        <div className="absolute -inset-4 -right-2 flex flex-row items-center justify-end gap-2 bg-clip-content">
          {PackageManger && (
            <PackageManger className="size-24 fill-neutral-200/40 dark:fill-neutral-900/80" />
          )}
          {RunTime && (
            <RunTime className="size-24 fill-neutral-200/40 dark:fill-neutral-900/80" />
          )}
        </div>
      </div>

      {/* footer */}
      <div className="flex w-full items-center rounded-b-lg border-[1px] bg-card px-3 py-3 transition-all group-hover:border-x-neutral-400 group-hover:border-b-neutral-400 dark:group-hover:border-x-neutral-700 dark:group-hover:border-b-neutral-700">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="truncate text-left text-xs text-muted-foreground">
              {item.readablePath}
            </TooltipTrigger>
            <TooltipContent>{item.readablePath}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </a>
  )
}

export const DashboardGrid = () => {
  const dashboard = useGraphStore(state => state.dashboard)
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
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
  const [table, setTable] =
    useState<Table<DashboardDataProject> | null>(null)
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
      updateActiveRoute,
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

  const onCreateNewProjectClick = () => {
    updateActiveRoute('/new-project')
  }

  if (inProgress) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="flex grow flex-col bg-secondary px-8 py-8 dark:bg-black">
      <div className="flex gap-2 pb-8">
        {currentView === 'table' ?
          <TableFilterSearch
            filterValue={tableFilterValue}
            onFilterChange={setTableFilterValue}
          />
        : <FilterSearch
            placeholder="Filter Projects"
            items={dashboard?.projects ?? []}
            setFilteredItems={setFilteredProjects}
          />
        }
        <DashboardViewToggle
          currentView={currentView}
          setCurrentView={setCurrentView}
        />
        <AnimatePresence mode="wait">
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
              />
            </motion.div>
          : <motion.div
              key={currentView}
              exit={{ opacity: 0 }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}>
              <SortToggle
                filteredItems={filteredProjects}
                setFilteredItems={setFilteredProjects}
                sortKey="name"
              />
            </motion.div>
          }
        </AnimatePresence>
        <div className="flex grow flex-row-reverse">
          <Button onClick={onCreateNewProjectClick} className="ml-2">
            <Plus size={24} />
            Create New Project
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentView === 'table' ?
          <motion.div
            key={currentView}
            exit={{ opacity: 0, y: 5 }}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}>
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
            className="flex flex-col">
            <p className="mb-4 text-sm font-semibold">Projects</p>
            <div className="flex flex-row flex-wrap gap-8">
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
