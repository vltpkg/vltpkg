/* sidebar primitives */
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarRail,
  SidebarFooter,
} from '@/components/ui/sidebar.tsx'

/* sidebar components */
import { SidebarLogo } from '@/components/navigation/sidebar/sidebar-logo.tsx'
import { SidebarMenuLink } from '@/components/navigation/sidebar/sidebar-menu-link.tsx'
import { SidebarToggle } from '@/components/navigation/sidebar/sidebar-toggle.tsx'

/* sidebar nav menus */
import { SidebarMainNav } from '@/components/navigation/sidebar/sidebar-main-nav.tsx'
import { SidebarQueryNav } from '@/components/navigation/sidebar/sidebar-query-nav.tsx'
import { SidebarSettingsNav } from '@/components/navigation/sidebar/sidebar-settings-nav.tsx'

import { footerMenuItems } from '@/components/navigation/sidebar/menu.ts'
import { cn } from '@/lib/utils.ts'

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

export const AppSidebar = ({ className }: { className?: string }) => {
  return (
    <Sidebar
      className={cn('relative flex h-full grow', className)}
      collapsible="icon">
      <SidebarContent>
        <SidebarLogo />
        <SidebarMainNav />
        <SidebarSettingsNav />
        <SidebarQueryNav />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuLink items={footerMenuItems} />
          <SidebarToggle />
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
