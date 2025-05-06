import { Outlet } from 'react-router'
import { Header } from '@/components/navigation/header.tsx'
import {
  defaultOpen,
  AppSidebar,
} from '@/components/navigation/sidebar/index.tsx'
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar.tsx'
import { Toaster } from '@/components/ui/toaster.tsx'
import { usePreflight } from '@/components/hooks/use-preflight.tsx'

const Layout = () => {
  usePreflight()

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <Outlet />
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}

export default Layout
