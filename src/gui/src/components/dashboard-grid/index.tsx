import { useState, useEffect, type MouseEvent } from 'react'
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
import { Ellipsis } from 'lucide-react'
import { motion } from 'framer-motion'

type SelectDashboardItemOptions = {
  updateActiveRoute: Action['updateActiveRoute']
  updateErrorCause: Action['updateErrorCause']
  updateQuery: Action['updateQuery']
  updateStamp: Action['updateStamp']
  item: DashboardDataProject
}
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu.jsx'

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
    updateStamp(String(Math.random()).slice(2))
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

  const { savedProjects, saveProject } = useGraphStore()

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
  const [isHovered, setIsHovered] = useState<boolean>(false)
  const [isSaved, setIsSaved] = useState<boolean>(false)

  useEffect(() => {
    if (savedProjects) {
      const isProjectSaved = savedProjects.some(
        savedProject => savedProject.name === item.name,
      )
      setIsSaved(isProjectSaved)
    }
  }, [savedProjects])

  const handleSaveProject = (
    e: MouseEvent,
    project: DashboardDataProject,
  ) => {
    // prevents click bubbling to the `a` tag
    e.preventDefault()
    e.stopPropagation()
    saveProject(project)
  }

  return (
    <a
      href="#"
      className="border-[1px] rounded-lg w-96 hover:border-muted-foreground transition-all duration-250 bg-card"
      onClick={onDashboardItemClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      {/* card header */}
      <div className="flex flex-col items-start h-20 justify-between px-4 py-3">
        <div className="flex flex-row w-full items-center justify-between">
          <motion.div
            animate={{
              opacity: isHovered ? 1 : 0,
            }}>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Ellipsis
                  className="text-muted-foreground"
                  size={20}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={e => handleSaveProject(e, item)}>
                    {isSaved ? 'Unpin' : 'Pin'} {item.name}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
          {item.mtime ?
            <div className="text-[0.7rem]">
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
  const savedProjects = useGraphStore(state => state.savedProjects)
  const [unsavedProjects, setUnsavedProjects] = useState<
    DashboardDataProject[] | []
  >([])

  /**
   * Checks the projects that exist in the dashboard:
   * Sorts them based if they're saved in 'saved-projects' localStorage.
   * */
  useEffect(() => {
    if (dashboard?.projects && savedProjects) {
      const filteredProjects = dashboard.projects.filter(
        project =>
          !savedProjects.some(saved => saved.name === project.name),
      )
      setUnsavedProjects(filteredProjects)
    }
  }, [dashboard, savedProjects])

  return (
    <div className="flex flex-col grow bg-secondary dark:bg-black px-8 py-8 gap-16">
      {/* Render unsaved projects */}
      <div className="flex flex-col gap-4">
        <DashboardGrid.Header>All Projects</DashboardGrid.Header>
        <div className="flex flex-row flex-wrap gap-8">
          {unsavedProjects?.length ?
            unsavedProjects.map((item, index) => (
              <DashboardItem key={index} item={item} />
            ))
          : <p className="text-sm text-muted-foreground/50">
              No projects available
            </p>
          }
        </div>
      </div>

      {/* Render pinned projects */}
      <div className="flex flex-col gap-4">
        <DashboardGrid.Header>Pinned Projects</DashboardGrid.Header>
        <div className="flex flex-row flex-wrap gap-8">
          {savedProjects?.length ?
            savedProjects.map((item, index) => (
              <DashboardItem key={index} item={item} />
            ))
          : <p className="text-sm text-muted-foreground/50">
              No pinned projects
            </p>
          }
        </div>
      </div>
    </div>
  )
}

DashboardGrid.Header = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <h4 className={`text-sm font-medium tracking-wide ${className}`}>
      {children}
    </h4>
  )
}

export { DashboardGrid }
