import { useNavigate } from 'react-router'
import {
  SidebarMenu,
  SidebarGroup,
  SidebarSeparator,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar.jsx'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.jsx'
import { useGraphStore } from '@/state/index.js'
import type { SavedQuery } from '@/state/types.js'
import { selectQuery } from '@/components/queries/saved-item.jsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.jsx'
import type { MenuItem } from '@/components/navigation/sidebar/menu.js'
import { Folder } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const SidebarQueryNav = () => {
  const { isOnExploreView } = useViewSidebar()

  const navigate = useNavigate()
  const { open, setOpen } = useSidebar()
  const savedQueries = useGraphStore(state => state.savedQueries)

  const graph = useGraphStore(state => state.graph)
  const updateErrorCause = useGraphStore(
    state => state.updateErrorCause,
  )
  const updateQuery = useGraphStore(state => state.updateQuery)
  const updateStamp = useGraphStore(state => state.updateStamp)

  const projectQueries = savedQueries?.filter(query => {
    return query.context === graph?.projectRoot
  })

  const globalQueries = savedQueries?.filter(query => {
    return query.context.trim() === ''
  })

  const constructMenu = (
    parentName: string,
    queryItems: SavedQuery[],
    icon: LucideIcon,
  ): MenuItem => {
    return {
      title: parentName,
      icon: icon,
      items: queryItems.map(item => ({
        title: item.name,
        onClick: () => void runQuery(item),
      })),
    }
  }

  const runQuery = async (item: SavedQuery): Promise<void> => {
    if (!graph) return
    await selectQuery({
      navigate,
      updateErrorCause,
      updateQuery,
      updateStamp,
      item,
      context:
        item.context.trim() === '' ? graph.projectRoot : item.context,
    })
  }

  if (!isOnExploreView()) return null
  if (
    !projectQueries ||
    (projectQueries.length === 0 && !globalQueries) ||
    globalQueries?.length === 0
  )
    return null

  return (
    <>
      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel className="font-medium tracking-wide">
          Queries
        </SidebarGroupLabel>

        {globalQueries && globalQueries.length !== 0 && (
          <SidebarMenu>
            <SidebarMenuLink
              onParentClick={() => {
                if (!open) setOpen(true)
              }}
              items={[constructMenu('Global', globalQueries, Folder)]}
            />
          </SidebarMenu>
        )}

        {projectQueries.length !== 0 && (
          <SidebarMenu>
            <SidebarMenuLink
              onParentClick={() => {
                if (!open) setOpen(true)
              }}
              items={[
                constructMenu('Project', projectQueries, Folder),
              ]}
            />
          </SidebarMenu>
        )}
      </SidebarGroup>
    </>
  )
}

export { SidebarQueryNav }
