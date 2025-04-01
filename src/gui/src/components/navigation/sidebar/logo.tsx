import { useLocation } from 'react-router'
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar.jsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip.jsx'
import { VLTV } from '@/components/icons/index.js'
import { useTheme } from '@/components/ui/theme-provider.jsx'
import { PanelLeft, Command } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Kbd } from '@/components/ui/kbd.jsx'

const SidebarLogo = () => {
  const { pathname } = useLocation()
  const { resolvedTheme: theme } = useTheme()
  const { state, toggleSidebar } = useSidebar()

  if (pathname.includes('/help')) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem
        onClick={state === 'expanded' ? undefined : toggleSidebar}
        className="peer flex h-[56px] w-full items-center overflow-hidden pl-[5px] [&>svg]:shrink-0">
        <>
          <VLTV
            className="cursor-pointer"
            color={theme === 'dark' ? 'white' : 'black'}
          />
          {state === 'expanded' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleSidebar}
                    className="ml-auto size-8 p-0">
                    <PanelLeft size={24} />
                  </Button>
                </TooltipTrigger>

                <TooltipContent
                  className="flex items-center gap-3"
                  align="start"
                  side="right">
                  Toggle sidebar
                  <span className="flex gap-1">
                    <Kbd>
                      <Command size={12} />
                    </Kbd>
                    <Kbd>B</Kbd>
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export { SidebarLogo }
