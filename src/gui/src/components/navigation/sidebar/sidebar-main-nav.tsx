import {
  SidebarGroup,
  SidebarMenu,
} from '@/components/ui/sidebar.tsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.tsx'
import { mainMenuItems } from '@/components/navigation/sidebar/menu.ts'

export const SidebarMainNav = () => {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuLink items={mainMenuItems} />
      </SidebarMenu>
    </SidebarGroup>
  )
}
