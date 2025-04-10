import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.jsx'
import {
  SidebarGroup,
  SidebarMenu,
} from '@/components/ui/sidebar.jsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.jsx'
import { mainMenuItems } from '@/components/navigation/sidebar/menu.js'

export const SidebarMainNav = () => {
  const { isOnHelpView } = useViewSidebar()

  if (isOnHelpView()) return null
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuLink items={mainMenuItems} />
      </SidebarMenu>
    </SidebarGroup>
  )
}
