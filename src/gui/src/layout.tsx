import { useMemo } from 'react'
import { useLocation, Outlet } from 'react-router'
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
import { isHostedEnvironment } from '@/lib/environment.ts'
import { HostedWarning } from '@/components/hosted-warning.tsx'
import { MinimalFooter } from '@/components/navigation/footer/minimal.tsx'

const Layout = () => {
  const isHostedMode = isHostedEnvironment()
  const { pathname } = useLocation()

  const onRestrictedRoute = useMemo(() => {
    if (!isHostedMode) return false

    // routes that require local server features
    const restrictedRoutes = [
      '/dashboard',
      '/queries',
      '/labels',
      '/create-new-project',
      '/settings',
    ]

    return restrictedRoutes.some(route => pathname.startsWith(route))
  }, [pathname, isHostedMode])

  usePreflight()

  if (pathname === '/' || pathname.includes('/search')) {
    return (
      <div className="flex flex-col">
        <Header className="fixed top-0 bg-transparent" />
        <Outlet />
        <MinimalFooter />
        <Toaster />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Header />
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          {onRestrictedRoute ?
            <HostedWarning />
          : <Outlet />}
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </div>
  )
}

export default Layout
