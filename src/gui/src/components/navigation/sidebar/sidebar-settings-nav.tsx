import { useNavigate } from 'react-router'
import { Undo2 } from 'lucide-react'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.tsx'
import {
  SidebarGroup,
  SidebarMenu,
} from '@/components/ui/sidebar.tsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.tsx'
import { settingsMenuItems } from '@/components/navigation/sidebar/menu.ts'

export const SidebarSettingsNav = () => {
  const { isOnSettingsView } = useViewSidebar()
  const navigate = useNavigate()

  const goBack = () => navigate(-1)

  if (!isOnSettingsView()) return null

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuLink
          items={[
            {
              title: 'Back to app',
              icon: Undo2,
              onClick: () => goBack(),
            },
          ]}
        />
        <SidebarMenuLink items={settingsMenuItems} />
      </SidebarMenu>
    </SidebarGroup>
  )
}
