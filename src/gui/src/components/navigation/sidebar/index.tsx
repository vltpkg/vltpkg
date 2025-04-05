/* sidebar primitives */
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarRail,
  SidebarFooter,
} from '@/components/ui/sidebar.jsx'

/* sidebar components */
import { SidebarHeader } from '@/components/navigation/sidebar/sidebar-header.jsx'
import { SidebarThemeSwitcher } from '@/components/navigation/sidebar/sidebar-theme-switcher.jsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.jsx'

/* sidebar nav menus */
import { SidebarMainNav } from '@/components/navigation/sidebar/sidebar-main-nav.jsx'
import { SidebarQueryNav } from '@/components/navigation/sidebar/sidebar-query-nav.jsx'
import { SidebarHelpNav } from '@/components/navigation/sidebar/sidebar-help-nav.jsx'

import { footerMenuItems } from '@/components/navigation/sidebar/menu.js'

/**
 * Sidebar creates a cookie 'sidebar:state' automatically
 * when open or closed.
 *
 * This cookie is used to read the current state across page reloads
 * within <SidebarProvider>
 *
 * https://ui.shadcn.com/docs/components/sidebar#persisted-state
 */
export const defaultOpen: boolean = (() => {
  const cookie = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith('sidebar:state='))

  const [, value] = cookie?.split('=') ?? []
  return value === 'true'
})()

export const AppSidebar = () => {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader />
      <SidebarContent>
        <SidebarMainNav />
        <SidebarQueryNav />
        <SidebarHelpNav />
      </SidebarContent>
      <SidebarFooter className="mb-[0.875px]">
        <SidebarMenu>
          <SidebarMenuLink items={footerMenuItems} />
          <SidebarThemeSwitcher />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="hover:after:bg-transparent group-data-[state=collapsed]:-translate-x-[0.65rem]" />
    </Sidebar>
  )
}
