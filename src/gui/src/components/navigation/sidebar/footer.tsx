import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar.jsx'
import { Library, ArrowUpRight } from 'lucide-react'
import { SidebarTrigger } from '@/components/navigation/sidebar/trigger.jsx'

const AppSidebarFooter = () => {
  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <a href="https://docs.vlt.sh" target="_blank">
              <Library />
              <span>Documentation</span>
              <ArrowUpRight className="ml-auto" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <SidebarSeparator />
      <SidebarTrigger />
    </SidebarFooter>
  )
}

export { AppSidebarFooter }
