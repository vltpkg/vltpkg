import { Fragment, useMemo } from 'react'
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
      <div className="flex flex-col antialiased">
        <MarketingHeader />
        <Outlet />
        <Footer />
        <Toaster />
      </div>
    )
  }

  return (
    <Fragment>
      <div className="bg-background antialiased">
        <div className="bg-background-secondary relative">
          <div className="min-h-svh grid-cols-[auto_4fr] md:grid">
            <SidebarProvider
              defaultOpen={defaultOpen}
              className="sticky top-0 flex w-full px-px">
              <AppSidebar className="bg-background rounded" />
            </SidebarProvider>
            <div className="bg-background flex w-full flex-col rounded-t">
              <div className="bg-background-secondary sticky top-0 z-10 flex w-full shrink-0 rounded-t pb-[1px]">
                <Header className="bg-background rounded" />
              </div>
              <div className="bg-background-secondary flex min-h-0 w-full flex-1">
                <main className="bg-background h-full w-full overflow-auto rounded">
                  {onRestrictedRoute ?
                    <HostedWarning />
                  : <Outlet />}
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </Fragment>
  )
}

export default Layout
