import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, type MouseEvent } from 'react'
import {
  type DashboardDataProject,
  type Action,
} from '@/state/types.js'
import { CardTitle } from '@/components/ui/card.jsx'
import { DEFAULT_QUERY, useGraphStore } from '@/state/index.js'
import { format } from 'date-fns'
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
      className="border-[1px] rounded-lg w-full md:w-96 hover:border-muted-foreground/50 transition-all duration-250 bg-card"
      onClick={onDashboardItemClick}>
      {/* card header */}
      <div className="flex flex-col items-start h-20 justify-between px-4 py-3">
        <div className="flex flex-row w-full items-center justify-end">
          {item.mtime ?
            <div className="text-[0.7rem] text-muted-foreground">
              {format(
                new Date(item.mtime).toJSON(),
                'LLLL do, yyyy | hh:mm aa',
              )}
            </div>
          : ''}
        </div>
        <div className="flex">
          <CardTitle className="self-end text-md font-medium">
            {item.name}
          </CardTitle>
        </div>
      </div>

      <div className="w-full h-12 flex items-center gap-4 justify-between border-t-[1px] px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="rounded-sm border-[1px] px-2 py-1 text-[0.65rem] text-muted-foreground font-mono m-0 align-baseline truncate">
              {item.readablePath}
            </TooltipTrigger>
            <TooltipContent>{item.readablePath}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex gap-2">
          {item.tools.map((tool, index) => (
            <div
              key={index}
              className="flex-none bg-secondary rounded-xl px-2 py-1">
              <p className="text-[0.7rem] font-medium text-primary ">
                {tool}
              </p>
            </div>
          ))}
        </div>
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
