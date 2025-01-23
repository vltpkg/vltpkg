import { PanelLeft } from 'lucide-react'
import {
  useSidebar,
  SidebarMenuButton,
} from '@/components/ui/sidebar.jsx'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip.jsx'

const SidebarTrigger = () => {
  const { toggleSidebar } = useSidebar()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            role="button"
            onClick={toggleSidebar}
            className="w-fit">
            <PanelLeft />
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent align="start" side="right">
          toggle sidebar
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { SidebarTrigger }
