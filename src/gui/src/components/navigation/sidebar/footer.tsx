import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenu,
  SidebarFooter,
} from '@/components/ui/sidebar.jsx'
import { Library, ArrowUpRight } from 'lucide-react'

const AppSidebarFooter = () => {
  return (
    <SidebarFooter className="mb-[14px]">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <a
              href="https://docs.vlt.sh"
              target="_blank"
              className="duration-250 group/footer-button text-muted-foreground transition-all">
              <Library />
              <span>Documentation</span>
              <ArrowUpRight className="duration-250 ml-auto transition-all group-hover/footer-button:-translate-y-0.5 group-hover/footer-button:translate-x-0.5" />
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}

export { AppSidebarFooter }
