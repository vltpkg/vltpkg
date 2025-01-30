import { useEffect, useState } from 'react'
import {
  SidebarMenuSub,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarSeparator,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroupLabel,
} from '@/components/ui/sidebar.jsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible.jsx'
import { useGraphStore } from '@/state/index.js'
import { type SavedQuery } from '@/state/types.js'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from 'lucide-react'
import { selectQuery } from '@/components/queries/saved-item.jsx'

const SidebarQueryProjectNav = () => {
  const savedQueries = useGraphStore(state => state.savedQueries)
  const [projectQueries, setProjectQueries] = useState<SavedQuery[]>(
    [],
  )
  const [globalQueries, setGlobalQueries] = useState<SavedQuery[]>([])
  const graph = useGraphStore(state => state.graph)
  const [projectQueriesOpen, setProjectQueriesOpen] =
    useState<boolean>(false)
  const [globalQueriesOpen, setGlobalQueriesOpen] =
    useState<boolean>(false)
  const updateActiveRoute = useGraphStore(
    state => state.updateActiveRoute,
  )
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)

  const getProjectQueries = () => {
    if (graph) {
      const currentPath = graph.projectRoot
      const filteredQueries = savedQueries?.filter(query => {
        return query.context === currentPath
      })
      const filteredGlobalQueries = savedQueries?.filter(query => {
        return query.context.trim() === ''
      })
      setProjectQueries(filteredQueries ?? [])
      setGlobalQueries(filteredGlobalQueries ?? [])
    }
  }

  useEffect(() => {
    getProjectQueries()
  }, [savedQueries, graph])

  const runQuery = async (item: SavedQuery): Promise<void> => {
    await selectQuery({
      updateActiveRoute,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
      context: item.context,
    })
  }

  const runGlobalQuery = async (item: SavedQuery): Promise<void> => {
    await selectQuery({
      updateActiveRoute,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
      context: graph?.projectRoot ?? '',
    })
  }

  if (globalQueries.length === 0 && projectQueries.length === 0)
    return null

  return (
    <>
      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel className="font-medium tracking-wide">
          Queries
        </SidebarGroupLabel>

        {globalQueries.length !== 0 && (
          <SidebarMenu>
            <Collapsible
              open={globalQueriesOpen}
              onOpenChange={setGlobalQueriesOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Project queries"
                    className="whitespace-nowrap">
                    {globalQueriesOpen ?
                      <FolderOpen />
                    : <Folder />}
                    <span>Global</span>
                    {globalQueriesOpen ?
                      <ChevronDown className="ml-auto" />
                    : <ChevronRight className="ml-auto" />}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {globalQueries.map((query, idx) => (
                      <SidebarMenuSubItem key={idx}>
                        <SidebarMenuSubButton
                          className="cursor-pointer truncate whitespace-nowrap"
                          onClick={() => void runGlobalQuery(query)}>
                          {query.name}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        )}

        {projectQueries.length !== 0 && (
          <SidebarMenu>
            <Collapsible
              open={projectQueriesOpen}
              onOpenChange={setProjectQueriesOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Project queries"
                    className="whitespace-nowrap">
                    {projectQueriesOpen ?
                      <FolderOpen />
                    : <Folder />}
                    <span>Project</span>
                    {projectQueriesOpen ?
                      <ChevronDown className="ml-auto" />
                    : <ChevronRight className="ml-auto" />}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {projectQueries.map((query, idx) => (
                      <SidebarMenuSubItem key={idx}>
                        <SidebarMenuSubButton
                          className="cursor-pointer truncate whitespace-nowrap"
                          onClick={() => void runQuery(query)}>
                          {query.name}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        )}
      </SidebarGroup>
    </>
  )
}

export { SidebarQueryProjectNav }
