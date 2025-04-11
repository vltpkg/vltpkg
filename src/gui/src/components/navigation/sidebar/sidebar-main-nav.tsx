import {
  SidebarGroup,
  SidebarMenu,
} from '@/components/ui/sidebar.jsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.jsx'
import { mainMenuItems } from '@/components/navigation/sidebar/menu.js'

export const SidebarMainNav = () => {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuLink items={mainMenuItems} />
      </SidebarMenu>
    </SidebarGroup>
  )
}
