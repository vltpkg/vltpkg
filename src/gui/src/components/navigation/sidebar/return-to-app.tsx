import { useLocation } from 'react-router'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar.jsx'
import { ArrowLeft } from 'lucide-react'

export const ReturnToApp = () => {
  const { pathname } = useLocation()

  if (!pathname.includes('/help')) return null

  const handleReturn = () => {
    window.history.back()
  }

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
