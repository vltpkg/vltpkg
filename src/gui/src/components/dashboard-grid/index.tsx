import { NavLink, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore, DEFAULT_QUERY } from '@/state/index.ts'
import { requestRouteTransition } from '@/lib/request-route-transition.ts'
import { useDashboardStore } from '@/state/dashboard.ts'
import { useDashboardRootCheck } from '@/components/hooks/use-dashboard-root-check.tsx'
import { Plus, Settings2 } from 'lucide-react'
import { DashboardItem } from '@/components/dashboard-grid/dashboard-item.tsx'
import { DashboardTable } from '@/components/dashboard-grid/dashboard-table.tsx'
import { InlineCode } from '@/components/ui/inline-code.tsx'
import { Button } from '@/components/ui/button.tsx'
import { encodeCompressedQuery } from '@/lib/compress-query.ts'

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

  const onItemClick = (selectedProject: DashboardDataProject) => {
    void requestRouteTransition<{ path: string }>({
      navigate,
      updateErrorCause,
      updateQuery,
      updateStamp,
      body: {
        path: selectedProject.path,
      },
      url: '/select-project',
      destinationRoute: `/explore/${encodeCompressedQuery(DEFAULT_QUERY)}/overview`,
      errorMessage: 'Failed to select project.',
    }).catch((err: unknown) => console.error(err))
  }

  if (!dashboard?.projects || dashboard.projects.length === 0) {
    return <DashboardEmptyState />
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
            className="max-w-8xl flex w-full flex-col py-4">
            <DashboardTable
              data={dashboard.projects}
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
            className="max-w-8xl flex w-full flex-col">
            <p className="mb-4 text-sm font-semibold">Projects</p>
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProjects.map((item, index) => (
                <DashboardItem
                  key={index}
                  item={item}
                  onItemClick={onItemClick}
                />
              ))}
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>
  )
}

const DashboardEmptyState = () => {
  const { dashboardRoots } = useDashboardRootCheck()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <h2 className="text-2xl font-medium tracking-tight">
          No projects found
        </h2>
        {dashboardRoots && dashboardRoots.length > 0 && (
          <div className="flex flex-col items-center justify-center gap-2">
            <p className="text-muted-foreground text-sm font-medium">
              We couldn't find any projects in the following
              configured dashboard roots:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dashboardRoots.map((path, idx) => (
                <InlineCode className="mx-0" key={`${path}-${idx}`}>
                  {path}
                </InlineCode>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="rounded-xl">
                <NavLink to="/settings">
                  <Settings2 size={24} />
                  <span>Settings</span>
                </NavLink>
              </Button>
              <Button asChild size="sm" className="rounded-xl">
                <NavLink to="/create-new-project">
                  <Plus size={24} />
                  <span>Create New Project</span>
                </NavLink>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
