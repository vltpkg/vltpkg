import { useMemo } from 'react'
import { useLocation, Outlet } from 'react-router'
import {
  defaultOpen,
  AppSidebar,
} from '@/components/navigation/sidebar/index.tsx'
import { SidebarProvider } from '@/components/ui/sidebar.tsx'
import { Toaster } from '@/components/ui/toaster.tsx'
import { Header } from '@/components/navigation/header/index.tsx'
import { Header as MarketingHeader } from '@/components/navigation/marketing-menu/index.tsx'
import { usePreflight } from '@/components/hooks/use-preflight.tsx'
import { isHostedEnvironment } from '@/lib/environment.ts'
import { HostedWarning } from '@/components/hosted-warning.tsx'
import { Footer } from '@/components/navigation/footer/index.tsx'
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'

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

  if (pathname === '/') {
    return (
      <div className="flex flex-col antialiased">
        <MarketingHeader />
        <Outlet />
        <Footer />
        <Toaster />
      </div>
    )
  }

  return (
    <NuqsAdapter>
      <div className="bg-background antialiased">
        <div className="min-h-svh grid-cols-[auto_4fr] md:grid">
          <SidebarProvider
            defaultOpen={defaultOpen}
            className="sticky top-0 flex w-full border-r">
            <AppSidebar />
          </SidebarProvider>
          <div className="flex w-full flex-col">
            <Header className="bg-background sticky top-0 z-40 w-full" />
            <div className="flex min-h-0 w-full flex-1">
              <main className="h-full w-full overflow-auto">
                {onRestrictedRoute ?
                  <HostedWarning />
                : <Outlet />}
              </main>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </NuqsAdapter>
  )
}

export default Layout
