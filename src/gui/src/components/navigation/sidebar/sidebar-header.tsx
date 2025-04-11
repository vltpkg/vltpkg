import { VLTV } from '@/components/icons/vlt-v.jsx'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader as SidebarHeaderPrimitive,
} from '@/components/ui/sidebar.jsx'

export const SidebarHeader = () => {
  return (
    <SidebarHeaderPrimitive>
      <SidebarMenu>
        <SidebarMenuItem className="peer flex h-[56px] w-full items-center overflow-hidden pl-[4.75px] [&>svg]:shrink-0">
          <VLTV className="text-foreground" />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeaderPrimitive>
  )
}
