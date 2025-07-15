import {
  SidebarGroup,
  SidebarMenu,
} from '@/components/ui/sidebar.tsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.tsx'
import { mainMenuItems } from '@/components/navigation/sidebar/menu.ts'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.tsx'

export const SidebarMainNav = () => {
  const { isOnSettingsView } = useViewSidebar()

  if (isOnSettingsView()) return null

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuLink items={mainMenuItems} />
      </SidebarMenu>
    </SidebarGroup>
  )
}
