import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar.jsx'
import { VLTV } from '@/components/icons/vlt-v.jsx'
import { useTheme } from '@/components/ui/theme-provider.jsx'

const SidebarLogo = () => {
  const { resolvedTheme: theme } = useTheme()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground whitespace-nowrap"
          asChild>
          <a href="/">
            <div className="flex items-center justify-center aspect-square h-full">
              <VLTV
                color={theme === 'dark' ? 'white' : 'black'}
                className="flex items-center justify-center"
              />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                vlt
                <span className="ml-1 truncate font-light">
                  /volt/
                </span>
              </span>
            </div>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export { SidebarLogo }
