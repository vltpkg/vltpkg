import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useGraphStore, DEFAULT_QUERY } from '@/state/index.ts'
import { requestRouteTransition } from '@/lib/request-route-transition.ts'
import { useDashboardStore } from '@/state/dashboard.ts'
import { useDashboardRootCheck } from '@/components/hooks/use-dashboard-root-check.tsx'
import { Plus, Settings2, FolderSearch } from 'lucide-react'
import { DashboardItem } from '@/components/dashboard-grid/dashboard-item.tsx'
import { DashboardTable } from '@/components/dashboard-grid/dashboard-table.tsx'
import { InlineCode } from '@/components/ui/inline-code.tsx'
import { Button } from '@/components/ui/button.tsx'
import { encodeCompressedQuery } from '@/lib/compress-query.ts'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty-state.tsx'
import { cn } from '@/lib/utils.ts'

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
    <div className="flex h-full flex-col p-6">
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
            className={cn(
              'flex w-full flex-col pb-6',
              filteredProjects.length < 1 && 'h-full',
            )}>
            <div
              className={cn(
                'grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
                filteredProjects.length < 1 && 'h-full',
              )}>
              {filteredProjects.length > 0 ?
                filteredProjects.map((item, index) => (
                  <DashboardItem
                    key={index}
                    item={item}
                    onItemClick={onItemClick}
                  />
                ))
              : <div className="col-span-full flex h-full w-full items-center justify-center">
                  <DashboardEmptyState />
                </div>
              }
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>
  )
}

const DashboardEmptyState = () => {
  const navigate = useNavigate()
  const { dashboardRoots } = useDashboardRootCheck()
  const searchValue = useDashboardStore(state => state.searchValue)
  const setSearchValue = useDashboardStore(
    state => state.setSearchValue,
  )

  const isEmptySearch =
    dashboardRoots &&
    dashboardRoots.length > 0 &&
    searchValue.trim() !== ''

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderSearch />
        </EmptyMedia>
        <EmptyTitle>
          {isEmptySearch ?
            "We couldn't find that project"
          : 'No projects found'}
        </EmptyTitle>
        <EmptyDescription>
          {isEmptySearch ?
            <p>
              We couldn't find a project matching{' '}
              <strong>{searchValue}</strong>, try adjusting your
              keywords or start a new project.
            </p>
          : <div className="flex flex-col items-center justify-center">
              <p className="text-muted-foreground text-sm font-medium">
                We couldn't find any projects in the following
                configured dashboard roots:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dashboardRoots?.map((path, idx) => (
                  <InlineCode className="mx-0" key={`${path}-${idx}`}>
                    {path}
                  </InlineCode>
                ))}
              </div>
            </div>
          }
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              setSearchValue('')
              void navigate('/create-new-project')
            }}>
            <Plus /> <span>Create New Project</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/settings')}>
            <Settings2 />
            <span>Change Directory</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSearchValue('')}>
            Clear Filters
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  )
}
