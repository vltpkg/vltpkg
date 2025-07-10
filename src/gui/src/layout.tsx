import { Outlet } from 'react-router'
import {
  defaultOpen,
  AppSidebar,
} from '@/components/navigation/sidebar/index.tsx'
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar.tsx'
import { Toaster } from '@/components/ui/toaster.tsx'
import { Header } from '@/components/navigation/header/index.tsx'
import { usePreflight } from '@/components/hooks/use-preflight.tsx'

const Layout = () => {
  usePreflight()

  return (
    <div className="flex flex-col">
      <Header />
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </div>
  )
}

export default Layout
