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
          <CardTitle className="self-end text-md">
            {item.name}
          </CardTitle>
        </div>
      </div>

      <div className="w-full h-12 flex items-center gap-4 justify-between border-t-[1px] px-4 py-3">
        <TooltipProvider>
          <div className="flex items-center justify-center rounded-sm border-[1px] px-2 py-1">
            <Tooltip>
              <TooltipTrigger>
                <p className="text-[0.65rem] text-muted-foreground font-mono truncate w-full m-0 p-0 align-baseline">
                  {item.path}
                </p>
              </TooltipTrigger>
              <TooltipContent>{item.path}</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div className="flex gap-2 overflow-x-scroll">
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
    <div className="flex flex-col grow bg-secondary dark:bg-black px-8 py-8">
      <div className="flex gap-2 mb-8">
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
        <p className="text-sm font-semibold mb-4">Projects</p>
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
