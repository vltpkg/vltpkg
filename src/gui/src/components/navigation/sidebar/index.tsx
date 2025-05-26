/* sidebar primitives */
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarRail,
  SidebarFooter,
} from '@/components/ui/sidebar.tsx'

/* sidebar components */
import { SidebarHeader } from '@/components/navigation/sidebar/sidebar-header.tsx'
import { SidebarThemeSwitcher } from '@/components/navigation/sidebar/sidebar-theme-switcher.tsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.tsx'
import { SidebarToggle } from '@/components/navigation/sidebar/sidebar-toggle.tsx'

/* sidebar nav menus */
import { SidebarMainNav } from '@/components/navigation/sidebar/sidebar-main-nav.tsx'
import { SidebarQueryNav } from '@/components/navigation/sidebar/sidebar-query-nav.tsx'

import { footerMenuItems } from '@/components/navigation/sidebar/menu.ts'

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
      </SidebarContent>
      <SidebarFooter className="mb-[0.875px]">
        <SidebarMenu>
          <SidebarMenuLink items={footerMenuItems} />
          <SidebarThemeSwitcher />
          <SidebarToggle />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail className="group-data-[state=collapsed]:-translate-x-[0.65rem] hover:after:bg-transparent" />
    </Sidebar>
  )
}
