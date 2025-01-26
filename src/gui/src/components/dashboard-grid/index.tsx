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
import { SortingToggle } from '@/components/ui/sorting-toggle.jsx'

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
      className="duration-250 w-full rounded-lg border-[1px] bg-card transition-all hover:border-muted-foreground/50 md:w-96"
      onClick={onDashboardItemClick}>
      {/* card header */}
      <div className="flex h-20 flex-col items-start justify-between px-4 py-3">
        <div className="flex w-full flex-row items-center justify-end">
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
          <CardTitle className="text-md self-end">
            {item.name}
          </CardTitle>
        </div>
      </div>

      <div className="flex h-12 w-full items-center justify-between gap-4 border-t-[1px] px-4 py-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="direction-rtl m-0 truncate text-ellipsis rounded-sm border-[1px] px-2 py-1 text-left align-baseline font-mono text-[0.65rem] text-muted-foreground">
              {item.path}
            </TooltipTrigger>
            <TooltipContent>{item.path}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex gap-2">
          {item.tools.map((tool, index) => (
            <div
              key={index}
              className="flex-none rounded-xl bg-secondary px-2 py-1">
              <p className="text-[0.7rem] font-medium text-primary">
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
  const [filteredProjects, setFilteredProjects] = useState<
    DashboardDataProject[]
  >([])

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
    <div className="flex grow flex-col bg-secondary px-8 py-8 dark:bg-black">
      <div className="mb-8 flex gap-2">
        <FilterSearch
          placeholder="Filter Projects"
          items={dashboard?.projects ?? []}
          setFilteredItems={setFilteredProjects}
        />
        <SortingToggle
          filteredItems={filteredProjects}
          setFilteredItems={setFilteredProjects}
          sortKey="name"
        />
      </div>

      {/* items */}
      <div className="flex flex-col">
        <p className="mb-4 text-sm font-semibold">Projects</p>
        <div className="flex flex-row flex-wrap gap-8">
          {dashboard?.projects ?
            filteredProjects.map((item, index) => (
              <DashboardItem key={index} item={item} />
            ))
          : <p>No projects found</p>}
        </div>
      </div>
    </div>
  )
}

export { DashboardGrid }
