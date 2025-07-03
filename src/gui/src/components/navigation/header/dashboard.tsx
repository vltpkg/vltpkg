import { motion } from 'framer-motion'
import { SortDropdown } from '@/components/sort-dropdown.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Plus } from 'lucide-react'
import { FilterSearch } from '@/components/ui/filter-search.tsx'
import { TableFilterSearch } from '@/components/data-table/table-filter-search.tsx'
import { TableViewDropdown } from '@/components/data-table/table-view-dropdown.tsx'
import { DashboardViewToggle } from '@/components/dashboard-grid/dashboard-view-toggle.tsx'
import { NavLink } from 'react-router'
import { useDashboardStore } from '@/state/dashboard.ts'
import { useGraphStore } from '@/state/index.ts'

export const DashboardHeader = () => {
  const currentView = useDashboardStore(state => state.currentView)
  const setCurrentView = useDashboardStore(
    state => state.updateCurrentView,
  )
  const table = useDashboardStore(state => state.table)
  const tableFilterValue = useDashboardStore(
    state => state.tableFilterValue,
  )
  const setTableFilterValue = useDashboardStore(
    state => state.setTableFilterValue,
  )
  const dashboard = useGraphStore(state => state.dashboard)
  const filteredProjects = useDashboardStore(
    state => state.filteredProjects,
  )
  const setFilteredProjects = useDashboardStore(
    state => state.setFilteredProjects,
  )
  const columnVisibility = useDashboardStore(
    state => state.columnVisibility,
  )
  const setColumnVisibility = useDashboardStore(
    state => state.setColumnVisibility,
  )

  return (
    <div className="grid w-full max-w-8xl grid-cols-3 gap-2 md:flex">
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
              setFilteredItems={value => {
                const newValue =
                  typeof value === 'function' ?
                    value(filteredProjects)
                  : value
                setFilteredProjects(newValue)
              }}
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
  )
}
