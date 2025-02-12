// navigation
import { Header } from '@/components/navigation/header.jsx'
import { Footer } from '@/components/navigation/footer.jsx'
import {
  defaultOpen,
  AppSidebar,
} from '@/components/navigation/sidebar/index.jsx'
import { SidebarProvider } from '@/components/ui/sidebar.jsx'

// routes
import { CreateNewProject } from '@/app/create-new-project.jsx'
import { Explorer } from '@/app/explorer.jsx'
import { ErrorFound } from '@/app/error-found.jsx'
import { Dashboard } from '@/app/dashboard.jsx'
import { Queries } from '@/app/queries.jsx'
import { Labels } from '@/app/labels.jsx'

import { useGraphStore } from '@/state/index.js'
import { Toaster } from '@/components/ui/toaster.jsx'

interface LayoutProps {
  children: React.ReactNode
}

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
      <Layout.Wrapper>
        <Layout.Body>
          <AppSidebar />
          <Layout.Content>
            <Header />
            {matchedComponent ?
              routeMap[matchedComponent]
            : defaultComponent}
            <Footer />
          </Layout.Content>
        </Layout.Body>
        <Toaster />
      </Layout.Wrapper>
    </SidebarProvider>
  )
}

Layout.Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-svh w-full flex-col">{children}</div>
  )
}

Layout.Body = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-svh w-full flex-row">{children}</div>
  )
}

Layout.Content = ({ children }: LayoutProps) => {
  return <div className="flex w-full grow flex-col">{children}</div>
}

export default Layout
