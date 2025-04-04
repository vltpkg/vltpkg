import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar.jsx'

import { SidebarLogo } from '@/components/navigation/sidebar/logo.jsx'
import { ReturnToApp } from '@/components/navigation/sidebar/return-to-app.jsx'

import { SidebarMainNav } from '@/components/navigation/sidebar/nav-main.jsx'
import { SidebarQueryNav } from '@/components/navigation/sidebar/nav-queries.jsx'
import { SidebarQueryProjectNav } from '@/components/navigation/sidebar/nav-project-queries.jsx'
import { AppSidebarFooter } from '@/components/navigation/sidebar/footer.jsx'
import { HelpNav } from '@/components/navigation/sidebar/nav-help.jsx'

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

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <ReturnToApp />
        <SidebarLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="gap-1">
          <SidebarMainNav />
          <SidebarQueryNav />
          <HelpNav />
        </SidebarGroup>
        <SidebarQueryProjectNav />
      </SidebarContent>
      <AppSidebarFooter />
      <SidebarRail className="hover:after:bg-transparent group-data-[state=collapsed]:-translate-x-[0.65rem]" />
    </Sidebar>
  )
}
