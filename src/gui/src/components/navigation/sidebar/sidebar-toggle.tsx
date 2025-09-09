import { useSidebar } from '@/components/ui/sidebar.tsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.tsx'
import { Sidebar } from '@/components/icons/index.ts'

import type { MenuItem } from '@/components/navigation/sidebar/menu.ts'

export const SidebarToggle = () => {
  const { state, toggleSidebar } = useSidebar()

  const toggleItem: MenuItem = {
    title: state === 'expanded' ? 'Collapse' : 'Expand',
    icon: Sidebar,
    onClick: toggleSidebar,
  }

  return <SidebarMenuLink items={[toggleItem]} />
}
