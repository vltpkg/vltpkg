import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Dashboard } from './app/dashboard.jsx'
import { ErrorFound } from './app/error-found.jsx'
import { Explorer } from './app/explorer.jsx'
import { ThemeProvider } from '@/components/ui/theme-provider.jsx'
import { useGraphStore } from './state/index.js'

const App = () => {
  const route = useGraphStore(state => state.activeRoute)

  return (
    <div className="container mx-auto">
      {route.startsWith('/explore') ?
        <Explorer />
      : route.startsWith('/error') ?
        <ErrorFound />
      : <Dashboard />}
    </div>
  )
}

const rootElement = document.getElementById('app')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
      </ThemeProvider>
    </StrictMode>,
  )
}
