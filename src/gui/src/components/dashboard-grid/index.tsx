import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, type MouseEvent } from 'react'
import {
  type DashboardDataProject,
  type Action,
} from '@/state/types.js'
import { CardTitle } from '@/components/ui/card.jsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.js'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx'
import { FilterSearch } from '@/components/ui/filter-search.jsx'
import { TableFilterSearch } from '@/components/data-table/table-filter-search.jsx'
import { TableViewDropdown } from '@/components/data-table/table-view-dropdown.jsx'
import { DashboardTable } from '@/components/dashboard-grid/dasboard-table.jsx'
import { DashboardSortToggle } from '@/components/dashboard-grid/dashboard-sort-toggle.jsx'
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

type SelectDashboardItemOptions = {
  updateActiveRoute: Action['updateActiveRoute']
  updateErrorCause: Action['updateErrorCause']
  updateQuery: Action['updateQuery']
  updateStamp: Action['updateStamp']
  item: DashboardDataProject
}

const selectDashboardItem = async ({
  updateActiveRoute,
  updateErrorCause,
  updateQuery,
  updateStamp,
  item,
}: SelectDashboardItemOptions) => {
  let req
  try {
    req = await fetch('/select-project', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: item.path,
      }),
    })
  } catch (err) {
    console.error(err)
    updateActiveRoute('/error')
    updateErrorCause('Failed to request project selection.')
    return
  }

  let projectSelected = false
  try {
    projectSelected = (await req.json()) === 'ok'
  } catch (err) {
    console.error(err)
  }

  if (projectSelected) {
    window.scrollTo(0, 0)
    updateQuery(DEFAULT_QUERY)
    updateActiveRoute('/explore')
    updateStamp()
  } else {
    updateActiveRoute('/error')
    updateErrorCause('Failed to select project.')
  }
}

export const DashboardItem = ({
  item,
}: {
  item: DashboardDataProject
}) => {
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)

  const { packageManager: PackageManger, runtime: RunTime } =
    getIconSet(item.tools)

  const onDashboardItemClick = (e: MouseEvent) => {
    e.preventDefault()
    selectDashboardItem({
      updateActiveRoute,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
    }).catch((err: unknown) => console.error(err))
  }

  return (
    <a
      href="#"
      className="relative w-full md:w-96 group"
      onClick={onDashboardItemClick}>
      {/* top */}
      <div className="relative transition-all group-hover:border-neutral-400 dark:group-hover:border-neutral-700 flex items-center border-x-[1px] border-t-[1px] bg-card rounded-t-lg h-20 overflow-hidden">
        <div className="flex px-3 py-2">
          <CardTitle className="text-md font-medium">
            {item.name}
          </CardTitle>
        </div>
        <div className="absolute flex flex-row px-3 py-2 backdrop-blur-[1px] rounded-sm top-0 right-0 z-[1]">
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
        <div className="absolute bg-clip-content flex justify-end items-center -inset-4 -right-2 flex-row gap-2">
          {PackageManger && (
            <PackageManger className="size-24 dark:fill-neutral-900/80 fill-neutral-200/80" />
          )}
          {RunTime && (
            <RunTime className="size-24 dark:fill-neutral-900/80 fill-neutral-200/80" />
          )}
        </div>
      </div>

      {/* footer */}
      <div className="flex transition-all group-hover:border-b-neutral-400 dark:group-hover:border-b-neutral-700 group-hover:border-x-neutral-400 dark:group-hover:border-x-neutral-700 border-[1px] bg-card rounded-b-lg items-center py-3 px-3 w-full">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="text-muted-foreground truncate text-left text-xs">
              {item.readablePath}
            </TooltipTrigger>
            <TooltipContent>{item.readablePath}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </a>
  )
}

const DashboardGrid = () => {
  const dashboard = useGraphStore(state => state.dashboard)
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

  useEffect(() => {
    if (dashboard) {
      setFilteredProjects(
        dashboard.projects.sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      )
    }
  }, [dashboard])

  return (
    <div className="flex flex-col grow bg-secondary dark:bg-black px-8 py-8">
      <div className="flex gap-2 mb-8">
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
              <DashboardSortToggle
                filteredItems={filteredProjects}
                setFilteredItems={setFilteredProjects}
                sortKey="name"
              />
            </motion.div>
          }
        </AnimatePresence>
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
            />
          </motion.div>
        : <motion.div
            key={currentView}
            exit={{ opacity: 0, y: -5 }}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col">
            <p className="text-sm font-semibold mb-4">Projects</p>
            <div className="flex flex-row flex-wrap gap-8">
              {dashboard?.projects ?
                filteredProjects.map((item, index) => (
                  <DashboardItem key={index} item={item} />
                ))
              : <p>No projects found</p>}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>
  )
}

export { DashboardGrid }
