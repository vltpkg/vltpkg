// navigation
import { Header } from './components/navigation/header.jsx'
import { Footer } from './components/navigation/footer.jsx'
import { Sidebar } from './components/navigation/sidebar.jsx'

// routes
import { Explorer } from './app/explorer.jsx'
import { ErrorFound } from './app/error-found.jsx'
import { Dashboard } from './app/dashboard.jsx'

import { useGraphStore } from './state/index.js'
import { Toaster } from '@/components/ui/toaster.jsx'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = () => {
  const route = useGraphStore(state => state.activeRoute)

  return (
    <Layout.Wrapper>
      <Layout.Body>
        <Sidebar />
        <Layout.Content>
          <Header />
          {route.startsWith('/explore') ?
            <Explorer />
          : route.startsWith('/error') ?
            <ErrorFound />
          : <Dashboard />}
          <Footer />
        </Layout.Content>
      </Layout.Body>
      <Toaster />
    </Layout.Wrapper>
  )
}

Layout.Wrapper = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-col min-h-svh w-full">{children}</div>
  )
}

Layout.Body = ({ children }: LayoutProps) => {
  return (
    <div className="flex flex-row min-h-svh w-full">{children}</div>
  )
}

Layout.Content = ({ children }: LayoutProps) => {
  return <div className="flex flex-col grow w-full">{children}</div>
}

export default Layout
