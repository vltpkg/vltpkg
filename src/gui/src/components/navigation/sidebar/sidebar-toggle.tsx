import { useSidebar } from '@/components/ui/sidebar.jsx'
import type { MenuItem } from '@/components/navigation/sidebar/menu.js'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.jsx'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export const SidebarToggle = () => {
  const { state, toggleSidebar } = useSidebar()

  const toggleItem: MenuItem = {
    title: state === 'expanded' ? 'Collapse' : 'Expand',
    icon: state === 'expanded' ? PanelLeftClose : PanelLeftOpen,
    onClick: toggleSidebar,
  }

  return <SidebarMenuLink items={[toggleItem]} />
}
