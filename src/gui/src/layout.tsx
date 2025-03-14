import { Outlet } from 'react-router'
import { Header } from '@/components/navigation/header.jsx'
import {
  defaultOpen,
  AppSidebar,
} from '@/components/navigation/sidebar/index.jsx'
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar.jsx'
import { Toaster } from '@/components/ui/toaster.jsx'

const Layout = () => {
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
