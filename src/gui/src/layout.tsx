// navigation
import { Header } from '@/components/navigation/header.jsx'
import { Footer } from '@/components/navigation/footer.jsx'
import {
  defaultOpen,
  AppSidebar,
} from '@/components/navigation/sidebar/index.jsx'
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar.jsx'

// routes
import { CreateNewProject } from '@/app/create-new-project.jsx'
import { Explorer } from '@/app/explorer.jsx'
import { ErrorFound } from '@/app/error-found.jsx'
import { Dashboard } from '@/app/dashboard.jsx'
import { Queries } from '@/app/queries.jsx'
import { Labels } from '@/app/labels.jsx'

import { useGraphStore } from '@/state/index.js'
import { Toaster } from '@/components/ui/toaster.jsx'

const routeMap: Record<string, React.ReactElement> = {
  '/dashboard': <Dashboard />,
  '/error': <ErrorFound />,
  '/explore': <Explorer />,
  '/queries': <Queries />,
  '/labels': <Labels />,
  '/new-project': <CreateNewProject />,
}

const Layout = () => {
  const route = useGraphStore(state => state.activeRoute)

  const defaultComponent = <Dashboard />
  const matchedComponent = Object.keys(routeMap).find(key =>
    route.startsWith(key),
  )

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <div className="sidebar-inset-wrapper">
        <SidebarInset className="grow md:mr-3">
          <Header />
          {matchedComponent ?
            routeMap[matchedComponent]
          : defaultComponent}
        </SidebarInset>
        <Footer />
      </div>
      <Toaster />
    </SidebarProvider>
  )
}

export default Layout
