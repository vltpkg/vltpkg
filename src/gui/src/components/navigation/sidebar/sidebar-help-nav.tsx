import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from '@/components/ui/sidebar.jsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.jsx'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.jsx'
import { helpMenuItems } from '@/components/navigation/sidebar/menu.js'

export const SidebarHelpNav = () => {
  const { isOnHelpView } = useViewSidebar()

  if (!isOnHelpView()) return null
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Help</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuLink items={helpMenuItems} />
      </SidebarMenu>
    </SidebarGroup>
  )
}
