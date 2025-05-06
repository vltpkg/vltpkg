import { Vlt } from '@/components/icons/index.ts'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader as SidebarHeaderPrimitive,
} from '@/components/ui/sidebar.tsx'

export const SidebarHeader = () => {
  return (
    <SidebarHeaderPrimitive>
      <SidebarMenu>
        <SidebarMenuItem className="peer flex h-[56px] w-full items-center overflow-hidden pl-[4.75px] [&>svg]:shrink-0">
          <Vlt className="text-foreground" />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeaderPrimitive>
  )
}
