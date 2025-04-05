import { VLTV } from '@/components/icons/vlt-v.jsx'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader as SidebarHeaderPrimitive,
  useSidebar,
} from '@/components/ui/sidebar.jsx'
import { useViewSidebar } from '@/components/navigation/sidebar/use-view-sidebar.jsx'
import { ArrowLeft, PanelLeft } from 'lucide-react'

const SidebarLogo = () => {
  const { state, toggleSidebar } = useSidebar()
  const { isOnHelpView } = useViewSidebar()

  if (isOnHelpView()) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem
        onClick={state === 'expanded' ? undefined : toggleSidebar}
        className="peer flex h-[56px] w-full items-center overflow-hidden pl-[5px] [&>svg]:shrink-0">
        <>
          <VLTV className="cursor-pointer text-foreground" />
          {state === 'expanded' && (
            <SidebarMenuButton
              onClick={toggleSidebar}
              className="ml-auto mr-2 size-8">
              <PanelLeft size={24} />
            </SidebarMenuButton>
          )}
        </>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

const SidebarReturnToApp = () => {
  const { isOnHelpView } = useViewSidebar()

  const handleReturn = () => {
    window.history.back()
  }

  if (!isOnHelpView()) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={handleReturn}
          className="duration-250 text-sm text-neutral-500 transition-all">
          <ArrowLeft />
          <span>Return to app</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export const SidebarHeader = () => {
  return (
    <SidebarHeaderPrimitive>
      <SidebarLogo />
      <SidebarReturnToApp />
    </SidebarHeaderPrimitive>
  )
}
